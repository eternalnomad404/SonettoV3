"""
Audio extraction service using FFmpeg.

Extracts audio from video files and converts to WAV format
optimized for future transcription (16kHz mono PCM).
"""

import subprocess
import json
from pathlib import Path
from typing import Tuple


def get_audio_duration(file_path: Path) -> int | None:
    """
    Get audio duration in seconds using ffprobe.
    
    Args:
        file_path: Path to audio file
    
    Returns:
        Duration in seconds (rounded to int) or None if failed
    """
    try:
        command = [
            "ffprobe",
            "-v", "error",
            "-show_entries", "format=duration",
            "-of", "json",
            str(file_path)
        ]
        
        result = subprocess.run(
            command,
            capture_output=True,
            text=True,
            timeout=30
        )
        
        if result.returncode == 0:
            data = json.loads(result.stdout)
            duration = data.get("format", {}).get("duration")
            if duration:
                return int(float(duration))
        return None
        
    except Exception:
        return None


def extract_audio(input_path: Path, output_path: Path) -> Tuple[bool, str]:
    """
    Extract audio from video/audio file and convert to WAV.
    
    Uses FFmpeg to:
    - Extract audio stream from any video/audio format
    - Convert to WAV format
    - Resample to 16kHz (optimal for speech recognition)
    - Convert to mono channel
    - Use PCM codec
    
    Args:
        input_path: Path to the original uploaded file
        output_path: Path where WAV file should be saved
    
    Returns:
        Tuple of (success: bool, message: str)
    """
    try:
        # FFmpeg command for audio extraction and conversion
        command = [
            "ffmpeg",
            "-i", str(input_path),      # Input file
            "-vn",                       # No video
            "-acodec", "pcm_s16le",      # PCM 16-bit little-endian
            "-ar", "16000",              # Sample rate: 16kHz
            "-ac", "1",                  # Mono channel
            "-y",                        # Overwrite output file
            str(output_path)             # Output file
        ]
        
        # Run FFmpeg
        result = subprocess.run(
            command,
            capture_output=True,
            text=True,
            timeout=300  # 5 minute timeout
        )
        
        if result.returncode == 0:
            return True, "Audio extracted successfully"
        else:
            error_msg = result.stderr[-500:] if result.stderr else "Unknown FFmpeg error"
            return False, f"FFmpeg failed: {error_msg}"
            
    except subprocess.TimeoutExpired:
        return False, "Audio extraction timed out (>5 minutes)"
    except FileNotFoundError:
        return False, "FFmpeg not installed or not in PATH"
    except Exception as e:
        return False, f"Unexpected error during audio extraction: {str(e)}"
