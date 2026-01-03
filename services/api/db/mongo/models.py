"""
MongoDB models and schemas for transcription storage.

This module defines the data structures for storing transcriptions in MongoDB.
Each transcription is linked to a session via session_id.
"""

from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel, Field
from uuid import UUID


class TranscriptSegmentMongo(BaseModel):
    """Schema for a transcript segment in MongoDB"""
    speaker_id: str = Field(..., description="Speaker identifier (Speaker 1, Speaker 2, etc.)")
    text: str = Field(..., description="Transcribed text in English")
    start: float = Field(..., description="Start time in seconds")
    end: float = Field(..., description="End time in seconds")
    
    class Config:
        json_schema_extra = {
            "example": {
                "speaker_id": "Speaker 1",
                "text": "Hello, how are you doing today?",
                "start": 12.5,
                "end": 15.8
            }
        }


class TranscriptionDocument(BaseModel):
    """Schema for transcription document in MongoDB"""
    session_id: str = Field(..., description="UUID of the session (as string)")
    title: str = Field(..., description="Session title")
    created_at: datetime = Field(default_factory=datetime.utcnow, description="Transcription creation timestamp")
    provider: str = Field(default="sarvam", description="Transcription provider")
    model: str = Field(default="saarika:v2", description="Model used for transcription")
    language: str = Field(default="en", description="Output language")
    source_language: str = Field(default="hi-IN", description="Source audio language")
    total_duration: float = Field(..., description="Total audio duration in seconds")
    total_segments: int = Field(..., description="Number of transcript segments")
    segments: List[TranscriptSegmentMongo] = Field(..., description="List of transcript segments")
    
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
    session_id: UUID,
    title: str,
    segments: List[dict],
    total_duration: float
) -> dict:
    """
    Convert transcription data to MongoDB document format.
    
    Args:
        session_id: Session UUID
        title: Session title
        segments: List of transcript segments from Sarvam API
        total_duration: Total audio duration
        
    Returns:
        Dictionary ready for MongoDB insertion
    """
    # Transform segments to MongoDB format
    mongo_segments = []
    for seg in segments:
        mongo_segments.append({
            "speaker_id": seg.get("speaker", "Speaker 1"),
            "text": seg.get("text", ""),
            "start": seg.get("start", 0.0),
            "end": seg.get("end", 0.0)
        })
    
    document = {
        "session_id": str(session_id),
        "title": title,
        "created_at": datetime.utcnow(),
        "provider": "sarvam",
        "model": "saarika:v2",
        "language": "en",
        "source_language": "hi-IN",
        "total_duration": total_duration,
        "total_segments": len(segments),
        "segments": mongo_segments
    }
    
    return document
