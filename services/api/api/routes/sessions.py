"""
Session API routes.

CRUD operations for the sessions table.
Keeps business logic minimal - this is data layer access only.
"""

import json
import asyncio
from typing import List
from uuid import UUID
from datetime import datetime
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session as DBSession
from pydantic import BaseModel

from db.postgres.models import Session
from db.postgres.deps import get_db
from db.mongo.database import get_mongo_database
from db.mongo.models import transcription_to_mongo_document
from core.storage import get_original_file_path, get_audio_file_path
from core.audio import extract_audio, get_audio_duration
from core.transcription import transcribe_audio


router = APIRouter(prefix="/sessions", tags=["sessions"])

# Global dict to store transcription status for active jobs
transcription_status = {}


# Pydantic schemas for request/response validation
class SessionCreate(BaseModel):
    """Schema for creating a new session"""
    title: str
    session_type: str | None = None
    duration_seconds: int | None = None
    original_file_path: str | None = None
    audio_file_path: str | None = None
    status: str = "pending"


class SessionResponse(BaseModel):
    """Schema for session responses"""
    id: UUID
    title: str
    session_type: str | None
    duration_seconds: int | None
    original_file_path: str | None
    audio_file_path: str | None
    file_name: str | None
    file_size_bytes: int | None
    file_type: str | None
    audio_duration_seconds: int | None
    status: str
    created_at: datetime
    
    class Config:
        from_attributes = True


class SessionUpdate(BaseModel):
    """Schema for updating a session"""
    title: str | None = None
    session_type: str | None = None
    duration_seconds: int | None = None
    original_file_path: str | None = None
    audio_file_path: str | None = None
    status: str | None = None


class TranscriptSegment(BaseModel):
    """Schema for a transcript segment"""
    id: str
    speaker: str
    timestamp: str
    text: str


class TranscriptionResponse(BaseModel):
    """Schema for transcription response"""
    session_id: UUID
    segments: List[TranscriptSegment]
    total_segments: int


# Routes
@router.post("/", response_model=SessionResponse, status_code=status.HTTP_201_CREATED)
def create_session(
    session_data: SessionCreate,
    db: DBSession = Depends(get_db)
):
    """
    Create a new session.
    
    Returns the created session with generated UUID and timestamp.
    """
    db_session = Session(**session_data.model_dump())
    db.add(db_session)
    db.commit()
    db.refresh(db_session)
    return db_session


@router.get("/", response_model=List[SessionResponse])
def list_sessions(
    skip: int = 0,
    limit: int = 100,
    db: DBSession = Depends(get_db)
):
    """
    List all sessions with pagination.
    
    Args:
        skip: Number of records to skip (default: 0)
        limit: Maximum records to return (default: 100)
    """
    sessions = db.query(Session).offset(skip).limit(limit).all()
    return sessions


@router.get("/{session_id}", response_model=SessionResponse)
def get_session(
    session_id: UUID,
    db: DBSession = Depends(get_db)
):
    """
    Get a specific session by ID.
    
    Returns 404 if session not found.
    """
    session = db.query(Session).filter(Session.id == session_id).first()
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Session {session_id} not found"
        )
    
    return session


@router.patch("/{session_id}", response_model=SessionResponse)
def update_session(
    session_id: UUID,
    session_data: SessionUpdate,
    db: DBSession = Depends(get_db)
):
    """
    Update a session's fields.
    
    Only provided fields are updated (partial update).
    """
    session = db.query(Session).filter(Session.id == session_id).first()
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Session {session_id} not found"
        )
    
    # Update only provided fields
    update_data = session_data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(session, key, value)
    
    db.commit()
    db.refresh(session)
    return session


@router.post("/upload", response_model=SessionResponse, status_code=status.HTTP_201_CREATED)
async def upload_session_file(
    file: UploadFile = File(...),
    title: str = File(...),
    db: DBSession = Depends(get_db)
):
    """
    Upload audio/video file and process it.
    
    Flow:
    1. Create session record with status='uploaded'
    2. Save original file to storage/original/
    3. Extract audio using FFmpeg
    4. Save WAV to storage/audio/
    5. Update session with paths and status='ready' or 'failed'
    
    Args:
        file: The uploaded audio/video file
        title: Title for this session
        db: Database session
    
    Returns:
        Created session with all file paths populated
    """
    # Validate file was provided
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No file provided"
        )
    
    # Get file extension
    file_extension = Path(file.filename).suffix
    if not file_extension:
        file_extension = ".bin"  # Fallback for files without extension
    
    # Create initial session record (size will be updated after streaming)
    db_session = Session(
        title=title,
        status="uploaded",
        file_name=file.filename,
        file_size_bytes=0,  # Will be updated after streaming
        file_type=file.content_type or "application/octet-stream"
    )
    db.add(db_session)
    db.commit()
    db.refresh(db_session)
    
    session_id = str(db_session.id)
    file_size = 0
    
    try:
        # Save original file with STREAMING (not buffering entire file in RAM)
        original_path = get_original_file_path(session_id, file_extension)
        
        # Stream file in 10MB chunks to support 2-4 hour videos (5-20GB+)
        CHUNK_SIZE = 10 * 1024 * 1024  # 10MB chunks
        MAX_FILE_SIZE = 20 * 1024 * 1024 * 1024  # 20GB limit (4-hour 1080p video)
        
        with open(original_path, "wb") as buffer:
            while chunk := await file.read(CHUNK_SIZE):
                file_size += len(chunk)
                
                # Enforce file size limit to prevent disk exhaustion
                if file_size > MAX_FILE_SIZE:
                    # Clean up partial file
                    buffer.close()
                    if original_path.exists():
                        original_path.unlink()
                    
                    db.delete(db_session)
                    db.commit()
                    
                    raise HTTPException(
                        status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                        detail=f"File size exceeds maximum limit of {MAX_FILE_SIZE // (1024**3)}GB. Please upload a smaller file."
                    )
                
                buffer.write(chunk)
        
        # Update file size in database
        db_session.file_size_bytes = file_size
        
        # Update session with original file path
        db_session.original_file_path = str(original_path)
        db.commit()
        
        # Extract audio
        audio_path = get_audio_file_path(session_id)
        success, message = extract_audio(original_path, audio_path)
        
        if success:
            # Audio extraction successful
            db_session.audio_file_path = str(audio_path)
            
            # Get audio duration
            duration = get_audio_duration(audio_path)
            if duration:
                db_session.audio_duration_seconds = duration
                db_session.duration_seconds = duration  # Also populate main duration field
            
            db_session.status = "ready"
            db.commit()
            db.refresh(db_session)
            return db_session
        else:
            # Audio extraction failed
            db_session.status = "failed"
            db.commit()
            db.refresh(db_session)
            
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Audio extraction failed: {message}"
            )
    
    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        # Handle unexpected errors
        db_session.status = "failed"
        db.commit()
        
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"File upload failed: {str(e)}"
        )


@router.delete("/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_session(
    session_id: UUID,
    db: DBSession = Depends(get_db)
):
    """
    Delete a session and all associated files.
    
    Args:
        session_id: UUID of the session to delete
        db: Database session
    
    Returns:
        204 No Content on success
    """
    # Get session
    db_session = db.query(Session).filter(Session.id == session_id).first()
    
    if not db_session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Session {session_id} not found"
        )
    
    # Delete files from disk if they exist
    if db_session.original_file_path:
        original_path = Path(db_session.original_file_path)
        if original_path.exists():
            try:
                original_path.unlink()
            except Exception as e:
                # Log but don't fail - continue with deletion
                print(f"Warning: Failed to delete original file: {e}")
    
    if db_session.audio_file_path:
        audio_path = Path(db_session.audio_file_path)
        if audio_path.exists():
            try:
                audio_path.unlink()
            except Exception as e:
                print(f"Warning: Failed to delete audio file: {e}")
    
    # Delete from database
    db.delete(db_session)
    db.commit()
    
    return None


@router.post("/{session_id}/transcribe", response_model=TranscriptionResponse)
async def transcribe_session(
    session_id: UUID,
    regenerate: bool = False,
    db: DBSession = Depends(get_db)
):
    """
    Generate transcription for a session using Sarvam AI Batch API with diarization.
    
    This endpoint:
    1. Checks MongoDB for existing transcription (unless regenerate=True)
    2. If exists in MongoDB, returns cached transcription immediately
    3. Otherwise, generates new transcription using Sarvam Batch API
    4. Saves to MongoDB and returns only if save succeeds
    5. If MongoDB save fails, raises 500 error
    
    For live progress updates, connect to GET /{session_id}/transcribe/status (SSE).
    
    Args:
        session_id: UUID of the session to transcribe
        regenerate: If True, force regeneration even if cached (default: False)
        db: Database session
        
    Returns:
        TranscriptionResponse with segments array (only if stored in MongoDB)
        
    Raises:
        404: Session not found
        400: Session doesn't have audio file
        500: Transcription failed or MongoDB save failed
    """
    # Check MongoDB for existing transcription first (unless regenerate=True)
    if not regenerate:
        try:
            mongo_db = get_mongo_database()
            existing = mongo_db.transcriptions.find_one({"session_id": str(session_id)})
            
            if existing:
                print(f"✅ Found cached transcription for {session_id} ({existing.get('total_segments', 0)} segments)")
                
                # Convert MongoDB document to response format
                from db.mongo.models import get_transcription_response
                response_data = get_transcription_response(existing)
                
                return TranscriptionResponse(
                    session_id=session_id,
                    segments=[TranscriptSegment(**seg) for seg in response_data["segments"]],
                    total_segments=response_data["total_segments"]
                )
        except Exception as e:
            print(f"⚠️ MongoDB lookup failed: {e}")
    
    # Get session from database
    db_session = db.query(Session).filter(Session.id == session_id).first()
    
    if not db_session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Session {session_id} not found"
        )
    
    # Validate audio file exists
    if not db_session.audio_file_path:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Session does not have an audio file. Upload a file first."
        )
    
    audio_path = Path(db_session.audio_file_path)
    
    if not audio_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Audio file not found at: {audio_path}"
        )
    
    # Initialize status tracking
    status_key = str(session_id)
    transcription_status[status_key] = {
        "step": "starting",
        "message": "Initializing transcription...",
        "progress": 0
    }
    
    # Status callback for transcription progress
    def update_status(step: str, message: str, progress: int):
        transcription_status[status_key] = {
            "step": step,
            "message": message,
            "progress": progress
        }
        print(f"📊 [{session_id}] {step}: {message} ({progress}%)")
    
    # Call Sarvam AI Batch transcription service with status callback
    success, message, segments = transcribe_audio(audio_path, status_callback=update_status)
    
    if not success:
        transcription_status[status_key] = {
            "step": "failed",
            "message": message,
            "progress": 0
        }
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Transcription failed: {message}"
        )
    
    # Save transcription to MongoDB - MUST succeed to return transcription
    try:
        mongo_db = get_mongo_database()
        transcription_doc = transcription_to_mongo_document(
            session_id=str(session_id),
            title=db_session.title,
            segments=segments,
            total_duration=float(db_session.audio_duration_seconds or 0)
        )
        
        # Insert or update transcription in MongoDB
        result = mongo_db.transcriptions.replace_one(
            {"session_id": str(session_id)},
            transcription_doc,
            upsert=True
        )
        
        print(f"✅ Saved transcription for session {session_id} to MongoDB ({len(segments)} segments)")
        
    except Exception as e:
        print(f"❌ CRITICAL: Failed to save transcription to MongoDB: {e}")
        transcription_status[status_key] = {
            "step": "failed",
            "message": f"Failed to save to database: {str(e)}",
            "progress": 0
        }
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Transcription generated but failed to save to database: {str(e)}"
        )
    
    # Mark as completed
    transcription_status[status_key] = {
        "step": "completed",
        "message": f"Transcription complete: {len(segments)} segments",
        "progress": 100
    }
    
    # Return transcript segments (only after successful MongoDB save)
    return TranscriptionResponse(
        session_id=session_id,
        segments=[TranscriptSegment(**seg) for seg in segments],
        total_segments=len(segments)
    )


@router.get("/{session_id}/transcribe/status")
async def transcribe_status_stream(
    session_id: UUID,
    db: DBSession = Depends(get_db)
):
    """
    Stream live transcription status updates via Server-Sent Events (SSE).
    
    Use this endpoint to get real-time progress updates while transcription is running.
    The stream will continue until transcription completes or fails.
    
    Example frontend usage:
    ```javascript
    const eventSource = new EventSource(`/api/sessions/${sessionId}/transcribe/status`);
    eventSource.onmessage = (event) => {
        const status = JSON.parse(event.data);
        // status = { step: "processing", message: "Processing audio...", progress: 45 }
        updateProgressBar(status.progress);
        updateStatusMessage(status.message);
    };
    eventSource.addEventListener('error', () => eventSource.close());
    ```
    """
    db_session = db.query(Session).filter(Session.id == session_id).first()
    
    if not db_session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Session {session_id} not found"
        )
    
    async def event_generator():
        status_key = str(session_id)
        last_status = None
        
        while True:
            # Get current status
            current_status = transcription_status.get(status_key, {
                "step": "waiting",
                "message": "Waiting for transcription to start...",
                "progress": 0
            })
            
            # Only send if status changed
            if current_status != last_status:
                # Send SSE event
                yield f"data: {json.dumps(current_status)}\\n\\n"
                last_status = current_status
            
            # Check if completed or failed
            if current_status.get("step") in ["completed", "failed"]:
                break
            
            # Wait before checking again
            await asyncio.sleep(0.5)
        
        # Clean up status after completion
        if status_key in transcription_status:
            del transcription_status[status_key]
    
    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"  # Disable nginx buffering
        }
    )


# Speaker Management Endpoints

class SpeakerNamesUpdate(BaseModel):
    """Schema for updating speaker names"""
    speaker_names: dict  # {"Speaker_1": "Moderator", "Speaker_2": "Guest"}


@router.get("/{session_id}/transcription")
async def get_transcription(
    session_id: UUID,
    db: DBSession = Depends(get_db)
):
    """
    Get cached transcription from MongoDB with speaker names applied.
    
    Returns 404 if no transcription exists for this session.
    """
    try:
        mongo_db = get_mongo_database()
        transcription_doc = mongo_db.transcriptions.find_one({"session_id": str(session_id)})
        
        if not transcription_doc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"No transcription found for session {session_id}"
            )
        
        # Convert to response format with speaker names applied
        from db.mongo.models import get_transcription_response
        response_data = get_transcription_response(transcription_doc)
        
        return {
            "session_id": str(session_id),
            "segments": response_data["segments"],
            "total_segments": response_data["total_segments"],
            "speaker_names": response_data["speaker_names"],
            "created_at": response_data["created_at"],
            "updated_at": response_data["updated_at"]
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve transcription: {str(e)}"
        )


@router.put("/{session_id}/speakers")
async def update_speaker_names(
    session_id: UUID,
    speaker_update: SpeakerNamesUpdate,
    db: DBSession = Depends(get_db)
):
    """
    Update speaker names globally for a session.
    
    This updates the speaker_names mapping in MongoDB, which affects
    how all segments are displayed.
    
    Example request body:
    {
        "speaker_names": {
            "Speaker_1": "Moderator",
            "Speaker_2": "Guest"
        }
    }
    """
    try:
        mongo_db = get_mongo_database()
        
        # Update speaker_names and updated_at timestamp
        result = mongo_db.transcriptions.update_one(
            {"session_id": str(session_id)},
            {
                "$set": {
                    "speaker_names": speaker_update.speaker_names,
                    "updated_at": datetime.utcnow()
                }
            }
        )
        
        if result.matched_count == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"No transcription found for session {session_id}"
            )
        
        print(f"✅ Updated speaker names for session {session_id}: {speaker_update.speaker_names}")
        
        return {
            "session_id": str(session_id),
            "speaker_names": speaker_update.speaker_names,
            "updated_at": datetime.utcnow()
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update speaker names: {str(e)}"
        )


@router.put("/{session_id}/segments/{segment_index}/speaker")
async def update_segment_speaker(
    session_id: UUID,
    segment_index: int,
    new_speaker: str,
    db: DBSession = Depends(get_db)
):
    """
    Update the speaker for a specific segment.
    
    Args:
        session_id: Session UUID
        segment_index: Index of the segment to update (0-based)
        new_speaker: New speaker ID (e.g., "Speaker_1", "Speaker_2")
    
    Example:
    PUT /sessions/{session_id}/segments/3/speaker?new_speaker=Speaker_2
    """
    try:
        mongo_db = get_mongo_database()
        
        # Update specific segment's speaker_id
        result = mongo_db.transcriptions.update_one(
            {"session_id": str(session_id)},
            {
                "$set": {
                    f"segments.{segment_index}.speaker_id": new_speaker,
                    "updated_at": datetime.utcnow()
                }
            }
        )
        
        if result.matched_count == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"No transcription found for session {session_id}"
            )
        
        print(f"✅ Updated segment {segment_index} speaker to {new_speaker} for session {session_id}")
        
        return {
            "session_id": str(session_id),
            "segment_index": segment_index,
            "new_speaker": new_speaker,
            "updated_at": datetime.utcnow()
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update segment speaker: {str(e)}"
        )
