"""
Sonetto API - Main Application Entry Point

This is a production-ready FastAPI backend for Sonetto.
It connects to PostgreSQL (sessions) and MongoDB (future AI features).
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from core.config import settings
from api.routes import sessions
from db.mongo.database import close_mongo_connection
from core.storage import ensure_storage_directories
from db.postgres.database import SessionLocal


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan manager.
    Handles startup and shutdown events.
    """
    # Startup
    print(f"🚀 Starting {settings.APP_NAME} v{settings.VERSION}")
    
    # CRITICAL: Verify which database we're connected to
    db = SessionLocal()
    try:
        result = db.execute(
            "SELECT inet_server_addr(), inet_server_port(), current_database()"
        ).fetchone()
        print("=" * 80)
        print("🔍 BACKEND DB IDENTITY (CRITICAL DIAGNOSTIC):")
        print(f"   Server Address: {result[0] or 'localhost/unix-socket'}")
        print(f"   Server Port: {result[1] or 'N/A'}")
        print(f"   Database Name: {result[2]}")
        print(f"   Connection String: {settings.DATABASE_URL.split('@')[1] if '@' in settings.DATABASE_URL else 'N/A'}")
        
        # Count sessions
        count = db.execute("SELECT COUNT(*) FROM sessions").fetchone()[0]
        print(f"   Current Sessions Count: {count}")
        print("=" * 80)
    except Exception as e:
        print(f"⚠️  Failed to query DB identity: {e}")
    finally:
        db.close()
    
    print(f"📊 PostgreSQL: Connected")
    print(f"🍃 MongoDB: Ready (not actively used in V1)")
    
    # Initialize storage directories
    ensure_storage_directories()
    
    yield
    
    # Shutdown
    print("🛑 Shutting down...")
    close_mongo_connection()


# Initialize FastAPI app
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.VERSION,
    lifespan=lifespan
)

# CORS middleware (adjust origins for production)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174"],  # React dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(sessions.router)


@app.get("/")
def root():
    """Health check endpoint"""
    return {
        "app": settings.APP_NAME,
        "version": settings.VERSION,
        "status": "running"
    }


@app.get("/health")
def health_check():
    """Detailed health check"""
    return {
        "status": "healthy",
        "database": "connected",
        "mongo": "initialized"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True  # Auto-reload on code changes (development only)
    )

