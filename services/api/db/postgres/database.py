"""
PostgreSQL database connection and session management.

Creates the SQLAlchemy engine and session factory.
Uses connection pooling for production-ready performance.
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

from core.config import settings


# SQLAlchemy engine with connection pooling
engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,  # Verify connections before using
    pool_size=5,         # Number of connections to maintain
    max_overflow=10,     # Additional connections under load
    echo=False           # Set to True for SQL query logging
)

# Session factory
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

# Base class for all SQLAlchemy models
Base = declarative_base()


def get_db_engine():
    """
    Returns the SQLAlchemy engine.
    Useful for health checks or advanced operations.
    """
    return engine
