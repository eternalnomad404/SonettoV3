"""
Storage utility for managing local file storage.

Handles directory creation and file path management
for uploaded and processed files.
"""

from pathlib import Path


# Base storage directory
STORAGE_DIR = Path(__file__).parent.parent / "storage"

# Subdirectories
ORIGINAL_DIR = STORAGE_DIR / "original"
AUDIO_DIR = STORAGE_DIR / "audio"


def ensure_storage_directories() -> None:
    """
    Create storage directories if they don't exist.
    
    Called on application startup to ensure filesystem is ready.
    Safe to call multiple times.
    """
    ORIGINAL_DIR.mkdir(parents=True, exist_ok=True)
    AUDIO_DIR.mkdir(parents=True, exist_ok=True)
    print(f"✅ Storage directories ready:")
    print(f"   - Original files: {ORIGINAL_DIR}")
    print(f"   - Audio files: {AUDIO_DIR}")


def get_original_file_path(session_id: str, extension: str) -> Path:
    """
    Get the path for an original uploaded file.
    
    Args:
        session_id: UUID of the session
        extension: File extension (e.g., ".mp4", ".mp3")
    
    Returns:
        Path object for the original file
    """
    return ORIGINAL_DIR / f"{session_id}{extension}"


def get_audio_file_path(session_id: str) -> Path:
    """
    Get the path for a processed audio file.
    
    Args:
        session_id: UUID of the session
    
    Returns:
        Path object for the audio WAV file
    """
    return AUDIO_DIR / f"{session_id}.wav"
