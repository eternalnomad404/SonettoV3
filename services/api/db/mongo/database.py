"""
MongoDB client initialization.

This module only establishes a connection to MongoDB.
No collections are created yet - this is groundwork for future AI/transcript features.

Future use cases:
- Storing transcripts and their versions
- AI-generated outputs
- RAG (Retrieval-Augmented Generation) data
- Chunked text for embeddings
"""

from pymongo import MongoClient
from pymongo.database import Database

from core.config import settings


# MongoDB client (lazily connected on first use)
mongo_client: MongoClient = None
mongo_db: Database = None


def get_mongo_client() -> MongoClient:
    """
    Returns the MongoDB client instance.
    Creates connection on first call (lazy initialization).
    """
    global mongo_client
    
    if mongo_client is None:
        mongo_client = MongoClient(
            settings.MONGO_URL,
            serverSelectionTimeoutMS=5000,  # 5 second timeout
            connectTimeoutMS=10000,         # 10 second connection timeout
        )
        # Test connection
        mongo_client.admin.command('ping')
        print(f"✓ Connected to MongoDB at {settings.MONGO_URL}")
    
    return mongo_client


def get_mongo_database(db_name: str = "sonetto") -> Database:
    """
    Returns a MongoDB database instance.
    
    Args:
        db_name: Name of the database (default: "sonetto")
    
    Usage:
        db = get_mongo_database()
        # Future: db.transcripts.insert_one({...})
    """
    global mongo_db
    
    if mongo_db is None:
        client = get_mongo_client()
        mongo_db = client[db_name]
    
    return mongo_db


def close_mongo_connection():
    """
    Closes the MongoDB connection.
    Should be called on application shutdown.
    """
    global mongo_client
    if mongo_client is not None:
        mongo_client.close()
        print("✓ MongoDB connection closed")
