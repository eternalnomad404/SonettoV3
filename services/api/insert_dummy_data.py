"""
Insert dummy session data into PostgreSQL.
Run this script once to populate the database with test data.
"""

import sys
from uuid import uuid4
from db.postgres.database import SessionLocal
from db.postgres.models import Session

def insert_dummy_sessions():
    """Insert 3 dummy sessions into the database"""
    
    db = SessionLocal()
    
    try:
        # Check if data already exists
        existing_count = db.query(Session).count()
        if existing_count > 0:
            print(f"⚠️  Database already has {existing_count} sessions.")
            response = input("Do you want to add 3 more? (y/n): ")
            if response.lower() != 'y':
                print("Cancelled.")
                return
        
        sessions = [
            Session(
                id=uuid4(),
                title="Q4 Planning Meeting Recording",
                session_type="meeting",
                duration_seconds=4980,  # 1h 23m
                original_file_path="/uploads/q4-planning-meeting.mp4",
                audio_file_path="/audio/q4-planning-meeting.wav",
                status="ready"
            ),
            Session(
                id=uuid4(),
                title="Product Demo - Enterprise Client",
                session_type="demo",
                duration_seconds=2712,  # 45m 12s
                original_file_path="/uploads/product-demo-enterprise.mp4",
                audio_file_path="/audio/product-demo-enterprise.wav",
                status="processing"
            ),
            Session(
                id=uuid4(),
                title="Interview - Sarah Johnson",
                session_type="interview",
                duration_seconds=1965,  # 32m 45s
                original_file_path="/uploads/interview-sarah-johnson.mp3",
                audio_file_path="/audio/interview-sarah-johnson.wav",
                status="ready"
            ),
        ]
        
        for session in sessions:
            db.add(session)
        
        db.commit()
        
        print("✅ Successfully inserted 3 dummy sessions!")
        print("\nSessions:")
        for session in sessions:
            print(f"  - {session.title} ({session.status})")
        
    except Exception as e:
        db.rollback()
        print(f"❌ Error inserting data: {e}")
        sys.exit(1)
    finally:
        db.close()


if __name__ == "__main__":
    insert_dummy_sessions()
