"""
Session API routes.

CRUD operations for the sessions table.
Keeps business logic minimal - this is data layer access only.
"""

from typing import List
from uuid import UUID
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session as DBSession
from pydantic import BaseModel

from db.postgres.models import Session
from db.postgres.deps import get_db


router = APIRouter(prefix="/sessions", tags=["sessions"])


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


@router.delete("/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_session(
    session_id: UUID,
    db: DBSession = Depends(get_db)
):
    """
    Delete a session.
    
    Returns 204 No Content on success.
    """
    session = db.query(Session).filter(Session.id == session_id).first()
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Session {session_id} not found"
        )
    
    db.delete(session)
    db.commit()
    return None
