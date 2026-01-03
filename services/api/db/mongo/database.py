"""
MongoDB client initialization.

This module establishes connection to MongoDB Atlas for transcription persistence.
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
        mongo_client = MongoClient(settings.MONGO_URL, serverSelectionTimeoutMS=5000)
        
        # Test connection
        try:
            result = mongo_client.admin.command('ping')
            print(f"✅ MongoDB: Connected successfully")
        except Exception as e:
            print(f"⚠️  MongoDB: Connection test failed - {e}")
            raise
    
    return mongo_client


def get_mongo_database(db_name: str = "sonetto") -> Database:
    """
    Returns a MongoDB database instance.
    
    Args:
        db_name: Name of the database (default: "sonetto")
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
        print("✅ MongoDB: Connection closed")
