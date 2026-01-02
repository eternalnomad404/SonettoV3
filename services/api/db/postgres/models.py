"""
SQLAlchemy models for PostgreSQL tables.

Maps to the existing 'sessions' table.
Does NOT auto-generate or migrate the table schema.
"""

from sqlalchemy import Column, String, Integer, TIMESTAMP, text
from sqlalchemy.dialects.postgresql import UUID

from db.postgres.database import Base


class Session(Base):
    """
    SQLAlchemy model for the 'sessions' table.
    
    Maps to existing PostgreSQL table:
    - id: UUID primary key
    - title: Session title
    - session_type: Type of session (e.g., "interview", "meeting")
    - duration_seconds: Length of recording
    - original_file_path: Path to original uploaded file
    - audio_file_path: Path to processed audio
    - file_name: Original filename
    - file_size_bytes: File size in bytes
    - file_type: MIME type of file
    - audio_duration_seconds: Duration of extracted audio
    - status: Current state (e.g., "pending", "processing", "completed")
    - created_at: Timestamp of creation
    """
    
    __tablename__ = "sessions"
    
    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    title = Column(String, nullable=False)
    session_type = Column(String, nullable=True)
    duration_seconds = Column(Integer, nullable=True)
    original_file_path = Column(String, nullable=True)
    audio_file_path = Column(String, nullable=True)
    file_name = Column(String, nullable=True)
    file_size_bytes = Column(Integer, nullable=True)
    file_type = Column(String, nullable=True)
    audio_duration_seconds = Column(Integer, nullable=True)
    status = Column(String, nullable=False)
    created_at = Column(TIMESTAMP, server_default=text("CURRENT_TIMESTAMP"))
    
    def __repr__(self):
        return f"<Session(id={self.id}, title='{self.title}', status='{self.status}')>"
