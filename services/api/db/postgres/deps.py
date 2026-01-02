"""
Database dependency injection for FastAPI routes.

Provides database session to route handlers via dependency injection.
Ensures proper session lifecycle management (open/close).
"""

from typing import Generator
from sqlalchemy.orm import Session

from db.postgres.database import SessionLocal


def get_db() -> Generator[Session, None, None]:
    """
    FastAPI dependency that provides a database session.
    
    Usage in routes:
        @app.get("/sessions")
        def list_sessions(db: Session = Depends(get_db)):
            return db.query(Session).all()
    
    The session is automatically closed after the request completes.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
