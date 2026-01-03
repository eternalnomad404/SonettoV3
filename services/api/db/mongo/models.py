"""
MongoDB models and schemas for transcription storage.

This module defines the data structures for storing transcriptions in MongoDB.
Each transcription is linked to a session via session_id.
"""

from typing import List, Dict
from datetime import datetime
from pydantic import BaseModel, Field


class TranscriptSegmentMongo(BaseModel):
    """Schema for a transcript segment in MongoDB"""
    speaker_id: str = Field(..., description="Speaker identifier (Speaker_1, Speaker_2, etc.)")
    text: str = Field(..., description="Transcribed text")
    start: float = Field(..., description="Start time in seconds")
    end: float = Field(..., description="End time in seconds")


class TranscriptionDocument(BaseModel):
    """Schema for transcription document in MongoDB"""
    session_id: str = Field(..., description="UUID of the session (as string)")
    title: str = Field(..., description="Session title")
    created_at: datetime = Field(default_factory=datetime.utcnow, description="Transcription creation timestamp")
    updated_at: datetime = Field(default_factory=datetime.utcnow, description="Last update timestamp")
    provider: str = Field(default="sarvam", description="Transcription provider")
    model: str = Field(default="saaras:v2.5", description="Model used for transcription")
    language: str = Field(default="en", description="Output language")
    source_language: str = Field(default="hi-IN", description="Source audio language")
    total_duration: float = Field(..., description="Total audio duration in seconds")
    total_segments: int = Field(..., description="Number of transcript segments")
    segments: List[TranscriptSegmentMongo] = Field(..., description="List of transcript segments")
    speaker_names: Dict[str, str] = Field(
        default_factory=dict,
        description="Speaker ID to display name mapping (e.g., {'Speaker_1': 'Moderator'})"
    )
    
    class Config:
        json_schema_extra = {
            "example": {
                "session_id": "123e4567-e89b-12d3-a456-426614174000",
                "title": "Meeting Recording",
                "created_at": "2026-01-04T10:30:00Z",
                "provider": "sarvam",
                "model": "saarika:v2",
                "language": "en",
                "source_language": "hi-IN",
                "total_duration": 1200.5,
                "total_segments": 45,
                "segments": [
                    {
                        "speaker_id": "Speaker 1",
                        "text": "Hello, welcome to the meeting.",
                        "start": 0.0,
                        "end": 2.5
                    }
                ]
            }
        }


def transcription_to_mongo_document(
    session_id: str,
    title: str,
    segments: List[dict],
    total_duration: float
) -> dict:
    """
    Convert transcription data to MongoDB document format.
    
    Args:
        session_id: Session UUID (as string)
        title: Session title
        segments: List of transcript segments from Sarvam API
        total_duration: Total audio duration
        
    Returns:
        Dictionary ready for MongoDB insertion
    """
    # Transform segments to MongoDB format
    mongo_segments = []
    unique_speakers = set()
    
    for seg in segments:
        speaker_id = seg.get("speaker", "Speaker_1")
        unique_speakers.add(speaker_id)
        
        mongo_segments.append({
            "speaker_id": speaker_id,
            "text": seg.get("text", ""),
            "start": seg.get("start", 0.0),
            "end": seg.get("end", 0.0)
        })
    
    # Initialize speaker_names mapping (all speakers map to themselves initially)
    speaker_names = {speaker: speaker for speaker in unique_speakers}
    
    document = {
        "session_id": session_id,
        "title": title,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
        "provider": "sarvam",
        "model": "saaras:v2.5",
        "language": "en",
        "source_language": "hi-IN",
        "total_duration": total_duration,
        "total_segments": len(mongo_segments),
        "segments": mongo_segments,
        "speaker_names": speaker_names
    }
    
    return document


def get_transcription_response(transcription_doc: dict) -> dict:
    """
    Convert MongoDB document to API response format.
    
    Applies speaker name mappings to segments.
    """
    segments = transcription_doc.get("segments", [])
    speaker_names = transcription_doc.get("speaker_names", {})
    
    # Apply speaker mappings
    formatted_segments = []
    for i, seg in enumerate(segments, 1):
        speaker_id = seg.get("speaker_id", "Speaker_1")
        display_name = speaker_names.get(speaker_id, speaker_id)
        
        # Format timestamp
        start = seg.get("start", 0)
        hours = int(start // 3600)
        minutes = int((start % 3600) // 60)
        seconds = int(start % 60)
        timestamp = f"{hours:02d}:{minutes:02d}:{seconds:02d}"
        
        formatted_segments.append({
            "id": str(i),
            "speaker": display_name,
            "timestamp": timestamp,
            "text": seg.get("text", ""),
            "start": seg.get("start", 0.0),
            "end": seg.get("end", 0.0)
        })
    
    return {
        "session_id": transcription_doc.get("session_id"),
        "segments": formatted_segments,
        "total_segments": len(formatted_segments),
        "speaker_names": speaker_names,
        "created_at": transcription_doc.get("created_at"),
        "updated_at": transcription_doc.get("updated_at")
    }
