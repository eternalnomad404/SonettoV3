"""
Sarvam AI Speech-to-Text transcription service.

This module handles real transcription using Sarvam AI's Speech-to-Text API.
It processes audio files and returns timestamped transcript segments with speaker labels.

Features:
- Automatic 30-second chunking for long audio files
- Seamless stitching of chunk results with proper timestamps
- Handles audio up to several hours with rate limiting
"""

import requests
import subprocess
import time
from pathlib import Path
from typing import List, Dict, Optional, Tuple

from core.config import settings
from core.audio import get_audio_duration


# Sarvam AI limits
SARVAM_MAX_DURATION = 28  # Use 28s chunks to stay safely under 30s limit
CHUNK_OVERLAP = 1  # 1-second overlap to avoid cutting words


def get_sarvam_api_key() -> str:
    """
    Get Sarvam API key from settings.
    
    Returns:
        API key string
        
    Raises:
        ValueError: If SARVAM_API_KEY is not set
    """
    if not settings.SARVAM_API_KEY:
        raise ValueError("SARVAM_API_KEY environment variable not set")
    return settings.SARVAM_API_KEY


def transcribe_audio(audio_file_path: Path) -> Tuple[bool, str, Optional[List[Dict]]]:
    """
    Transcribe audio file using Sarvam AI Speech-to-Text API.
    
    Automatically chunks audio files longer than 28 seconds into overlapping segments.
    Processes each chunk with Sarvam AI and stitches results together.
    
    Args:
        audio_file_path: Path to the WAV audio file
        
    Returns:
        Tuple of (success: bool, message: str, segments: List[Dict] | None)
        
        segments format:
        [
            {
                "id": "1",
                "speaker": "Speaker 1",
                "timestamp": "00:00:12",
                "text": "Transcribed text here"
            },
            ...
        ]
    """
    try:
        api_key = get_sarvam_api_key()
        
        # Validate file exists
        if not audio_file_path.exists():
            return False, f"Audio file not found: {audio_file_path}", None
        
        # Get audio duration
        duration = get_audio_duration(audio_file_path)
        if duration is None:
            return False, "Failed to get audio duration", None
        
        # Decide if we need chunking
        if duration <= SARVAM_MAX_DURATION:
            # Short audio - single API call
            return transcribe_audio_chunk(audio_file_path, api_key, offset=0)
        else:
            # Long audio - chunk and stitch
            return transcribe_audio_chunked(audio_file_path, api_key, duration)
                
    except Exception as e:
        return False, f"Transcription failed: {str(e)}", None


def transcribe_audio_chunked(audio_file_path: Path, api_key: str, total_duration: float) -> Tuple[bool, str, Optional[List[Dict]]]:
    """
    Transcribe long audio by splitting into 28-second chunks.
    
    Args:
        audio_file_path: Path to audio file
        api_key: Sarvam API key
        total_duration: Total audio duration in seconds
        
    Returns:
        Tuple of (success, message, segments)
    """
    chunks_dir = audio_file_path.parent / f"{audio_file_path.stem}_chunks"
    chunks_dir.mkdir(exist_ok=True)
    
    try:
        # Calculate chunks
        chunk_count = int((total_duration + SARVAM_MAX_DURATION - 1) // SARVAM_MAX_DURATION)
        
        # Safety check - limit to reasonable chunk count
        if chunk_count > 200:  # ~93 minutes max
            return False, f"Audio too long ({total_duration:.1f}s = {chunk_count} chunks). Maximum ~93 minutes supported to avoid excessive API calls.", None
        
        print(f"📊 Chunking {total_duration:.1f}s audio into {chunk_count} chunks (~28s each)")
        
        all_segments = []
        segment_id_offset = 0
        
        for i in range(chunk_count):
            start_time = i * SARVAM_MAX_DURATION
            
            # Extract chunk using FFmpeg
            chunk_path = chunks_dir / f"chunk_{i:04d}.wav"
            success, chunk_error = extract_audio_chunk(
                audio_file_path, 
                chunk_path, 
                start_time, 
                SARVAM_MAX_DURATION + CHUNK_OVERLAP
            )
            
            if not success:
                return False, f"Failed to extract chunk {i}: {chunk_error}", None
            
            # Transcribe chunk
            print(f"   📝 Transcribing chunk {i+1}/{chunk_count} (offset: {format_timestamp(start_time)})")
            success, msg, segments = transcribe_audio_chunk(chunk_path, api_key, offset=start_time)
            
            if not success:
                return False, f"Failed to transcribe chunk {i}: {msg}", None
            
            if segments:
                # Adjust segment IDs and timestamps
                for seg in segments:
                    seg["id"] = str(segment_id_offset + int(seg["id"]))
                    
                    # Timestamp already has offset from transcribe_audio_chunk
                    
                all_segments.extend(segments)
                segment_id_offset += len(segments)
            
            # Rate limiting - wait 500ms between API calls to avoid throttling
            if i < chunk_count - 1:
                time.sleep(0.5)
        
        # Cleanup chunks
        for chunk_file in chunks_dir.glob("*.wav"):
            chunk_file.unlink()
        chunks_dir.rmdir()
        
        if not all_segments:
            return False, "No segments generated from chunked transcription", None
        
        message = f"Transcribed {chunk_count} chunks successfully ({total_duration:.1f}s total)"
        return True, message, all_segments
        
    except Exception as e:
        # Cleanup on error
        if chunks_dir.exists():
            for chunk_file in chunks_dir.glob("*.wav"):
                chunk_file.unlink()
            chunks_dir.rmdir()
        raise e


def extract_audio_chunk(input_path: Path, output_path: Path, start_seconds: float, duration_seconds: float) -> Tuple[bool, str]:
    """
    Extract a chunk of audio using FFmpeg.
    
    Args:
        input_path: Source audio file
        output_path: Output chunk file
        start_seconds: Start time in seconds
        duration_seconds: Duration to extract
        
    Returns:
        Tuple of (success, error_message)
    """
    try:
        command = [
            "ffmpeg",
            "-i", str(input_path),
            "-ss", str(start_seconds),
            "-t", str(duration_seconds),
            "-acodec", "pcm_s16le",
            "-ar", "16000",
            "-ac", "1",
            "-y",
            str(output_path)
        ]
        
        result = subprocess.run(
            command,
            capture_output=True,
            text=True,
            timeout=60  # 1 minute timeout for chunk extraction
        )
        
        if result.returncode == 0:
            return True, ""
        else:
            return False, f"FFmpeg error: {result.stderr[-200:]}"
            
    except subprocess.TimeoutExpired:
        return False, "Chunk extraction timed out"
    except Exception as e:
        return False, str(e)


def transcribe_audio_chunk(audio_file_path: Path, api_key: str, offset: float = 0) -> Tuple[bool, str, Optional[List[Dict]]]:
    """
    Transcribe a single audio chunk using Sarvam AI.
    
    Args:
        audio_file_path: Path to audio file (must be ≤30 seconds)
        api_key: Sarvam API key
        offset: Time offset in seconds (for chunk stitching)
        
    Returns:
        Tuple of (success, message, segments)
    """
    try:
        # Sarvam AI Speech-to-Text endpoint
        url = "https://api.sarvam.ai/speech-to-text"
        
        headers = {
            "api-subscription-key": api_key
        }
        
        # Read audio file
        with open(audio_file_path, "rb") as audio_file:
            files = {
                "file": (audio_file_path.name, audio_file, "audio/wav")
            }
            
            # Parameters for Sarvam API
            data = {
                "language_code": "en-IN",  # English-India (supports mixed English+Hindi)
                "model": "saarika:v2.5"  # Latest model version
            }
            
            # Make API request
            response = requests.post(url, headers=headers, files=files, data=data, timeout=60)
            
            if response.status_code == 200:
                result = response.json()
                
                # Transform Sarvam response to our segment format
                segments = transform_sarvam_response(result, offset)
                
                return True, "Transcription successful", segments
            else:
                error_msg = f"Sarvam API error: {response.status_code} - {response.text[:200]}"
                return False, error_msg, None
                
    except requests.exceptions.Timeout:
        return False, "Transcription request timed out", None
    except requests.exceptions.RequestException as e:
        return False, f"Network error: {str(e)}", None
    except Exception as e:
        return False, f"Error: {str(e)}", None


def transform_sarvam_response(sarvam_result: Dict, offset: float = 0) -> List[Dict]:
    """
    Transform Sarvam API response into our transcript segment format.
    
    Sarvam response structure (example):
    {
        "transcript": "full text here",
        "words": [
            {
                "word": "Hello",
                "start": 0.5,
                "end": 0.8,
                "confidence": 0.98
            },
            ...
        ]
    }
    
    Our format:
    [
        {
            "id": "1",
            "speaker": "Speaker 1",
            "timestamp": "00:00:12",
            "text": "Segment text"
        },
        ...
    ]
    
    Args:
        sarvam_result: Raw response from Sarvam API
        offset: Time offset in seconds (for chunked audio)
        
    Returns:
        List of transcript segments
    """
    segments = []
    
    # Extract transcript text
    transcript_text = sarvam_result.get("transcript", "")
    
    # If Sarvam provides word-level timestamps, chunk into segments
    words = sarvam_result.get("words", [])
    
    if words:
        # Group words into ~10-second segments
        current_segment = []
        current_start_time = offset  # Start from offset for chunked audio
        segment_id = 1
        
        for word_data in words:
            word_text = word_data.get("word", "")
            word_start = word_data.get("start", 0) + offset  # Add offset to word timestamps
            
            # Start new segment if we've exceeded 10 seconds
            if current_segment and (word_start - current_start_time) > 10:
                # Create segment
                segment_text = " ".join(current_segment)
                timestamp = format_timestamp(current_start_time)
                
                segments.append({
                    "id": str(segment_id),
                    "speaker": "Speaker 1",  # Sarvam doesn't provide diarization by default
                    "timestamp": timestamp,
                    "text": segment_text
                })
                
                segment_id += 1
                current_segment = []
                current_start_time = word_start
            
            current_segment.append(word_text)
        
        # Add final segment
        if current_segment:
            segment_text = " ".join(current_segment)
            timestamp = format_timestamp(current_start_time)
            
            segments.append({
                "id": str(segment_id),
                "speaker": "Speaker 1",
                "timestamp": timestamp,
                "text": segment_text
            })
    else:
        # Fallback: No word-level data, return full transcript as single segment
        timestamp = format_timestamp(offset)
        segments.append({
            "id": "1",
            "speaker": "Speaker 1",
            "timestamp": timestamp,
            "text": transcript_text
        })
    
    return segments


def format_timestamp(seconds: float) -> str:
    """
    Convert seconds to HH:MM:SS timestamp format.
    
    Args:
        seconds: Time in seconds (can be float)
        
    Returns:
        Formatted timestamp string (e.g., "00:01:23")
    """
    total_seconds = int(seconds)
    hours = total_seconds // 3600
    minutes = (total_seconds % 3600) // 60
    secs = total_seconds % 60
    
    return f"{hours:02d}:{minutes:02d}:{secs:02d}"
