"""
Sarvam AI Speech-to-Text transcription service.

This module handles real transcription using Sarvam AI's Speech-to-Text Batch API.
It processes audio files and returns timestamped transcript segments with speaker labels.

Features:
- Batch API for files up to 1 hour with speaker diarization
- Automatic chunking only for audio > 1 hour (55-minute chunks)
- Seamless stitching of chunk results with proper timestamps
- Live status updates via callbacks
"""

import requests
import subprocess
import time
from pathlib import Path
from typing import List, Dict, Optional, Tuple, Callable
from sarvamai import SarvamAI

from core.config import settings
from core.audio import get_audio_duration


# Sarvam AI Batch API limits and chunking configuration
SARVAM_BATCH_MAX_DURATION = 3300  # 55 minutes (batch API can handle up to 1 hour)
CHUNKING_THRESHOLD = 3600  # Only chunk if audio > 1 hour
CHUNK_OVERLAP = 30  # 30-second overlap for batch chunks
MIN_SEGMENT_DURATION = 0.5  # Minimum segment duration to avoid noise
BATCH_POLL_INTERVAL = 2  # Poll every 2 seconds
BATCH_MAX_WAIT = 1800  # Maximum 30 minutes wait for batch job


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


def transcribe_audio(audio_file_path: Path, status_callback=None) -> Tuple[bool, str, Optional[List[Dict]]]:
    """
    Transcribe audio file using Sarvam AI Batch API with diarization.
    
    Only chunks audio files longer than 1 hour. Batch API can handle up to 55 minutes per job.
    
    Args:
        audio_file_path: Path to the WAV audio file
        status_callback: Optional callback function for status updates (step, message, progress)
        
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
        
        if status_callback:
            status_callback("analyzing", f"Audio duration: {duration/60:.1f} minutes", 5)
        
        # Decide if we need chunking (only for audio > 1 hour)
        if duration <= CHUNKING_THRESHOLD:
            # Audio is under 1 hour - process as single batch job
            if status_callback:
                status_callback("uploading", "Submitting to Sarvam Batch API...", 10)
            return transcribe_audio_batch(audio_file_path, api_key, offset=0, status_callback=status_callback)
        else:
            # Audio is over 1 hour - chunk it into 55-minute segments
            if status_callback:
                status_callback("chunking", f"Audio is {duration/60:.1f} minutes, chunking required", 5)
            return transcribe_audio_chunked(audio_file_path, api_key, duration, status_callback=status_callback)
                
    except Exception as e:
        return False, f"Transcription failed: {str(e)}", None


def transcribe_audio_chunked(audio_file_path: Path, api_key: str, total_duration: float, status_callback=None) -> Tuple[bool, str, Optional[List[Dict]]]:
    """
    Transcribe long audio (>1 hour) by splitting into 55-minute chunks using Batch API.
    
    Args:
        audio_file_path: Path to audio file
        api_key: Sarvam API key
        total_duration: Total audio duration in seconds
        status_callback: Optional callback for status updates
        
    Returns:
        Tuple of (success, message, segments)
    """
    chunks_dir = audio_file_path.parent / f"{audio_file_path.stem}_chunks"
    chunks_dir.mkdir(exist_ok=True)
    
    try:
        # Calculate number of chunks (55-minute chunks)
        chunk_duration = SARVAM_BATCH_MAX_DURATION
        num_chunks = int((total_duration - CHUNK_OVERLAP) / (chunk_duration - CHUNK_OVERLAP)) + 1
        
        if status_callback:
            status_callback("chunking", f"Splitting into {num_chunks} chunks of ~{chunk_duration/60:.0f} minutes", 10)
        
        print(f"📊 Chunking {total_duration/60:.1f}min audio into {num_chunks} chunks (~55min each, {CHUNK_OVERLAP}s overlap)")
        
        all_chunk_segments = []  # Collect segments from all chunks
        
        for i in range(num_chunks):
            chunk_start = i * (chunk_duration - CHUNK_OVERLAP)
            
            # Extract chunk with overlap
            chunk_path = chunks_dir / f"chunk_{i:04d}.wav"
            success, chunk_error = extract_audio_chunk(
                audio_file_path, 
                chunk_path, 
                chunk_start, 
                chunk_duration + CHUNK_OVERLAP
            )
            
            if not success:
                return False, f"Failed to extract chunk {i}: {chunk_error}", None
            
            # Transcribe this chunk using batch API
            chunk_progress = 10 + int((i / num_chunks) * 80)
            if status_callback:
                status_callback("processing", f"Transcribing chunk {i+1}/{num_chunks}...", chunk_progress)
            
            print(f"   📝 Batch transcribing chunk {i+1}/{num_chunks} (offset: {format_timestamp(chunk_start)})")
            success, msg, segments = transcribe_audio_batch(
                chunk_path, api_key, offset=chunk_start, status_callback=status_callback
            )
            
            if not success:
                return False, f"Failed to transcribe chunk {i}: {msg}", None
            
            if segments:
                all_chunk_segments.append(segments)
            
            # Small delay between chunks
            if i < num_chunks - 1:
                time.sleep(1)
        
        # Cleanup chunks
        for chunk_file in chunks_dir.glob("*.wav"):
            chunk_file.unlink()
        chunks_dir.rmdir()
        
        if not all_chunk_segments:
            return False, "No segments generated from chunked transcription", None
        
        # Merge overlapping chunks with deduplication
        if status_callback:
            status_callback("finalizing", f"Merging {len(all_chunk_segments)} chunks...", 90)
        
        print(f"🔗 Merging {len(all_chunk_segments)} chunks with overlap deduplication...")
        merged_segments = merge_overlapping_chunks(all_chunk_segments)
        
        if status_callback:
            status_callback("completed", f"Completed: {len(merged_segments)} segments", 100)
        
        message = f"Transcribed {num_chunks} chunks successfully ({total_duration/60:.1f}min total, {len(merged_segments)} final segments)"
        return True, message, merged_segments
        
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


def transcribe_audio_batch(audio_file_path: Path, api_key: str, offset: float = 0, status_callback=None) -> Tuple[bool, str, Optional[List[Dict]]]:
    """
    Transcribe audio using Sarvam AI Batch API with diarization and translation.
    
    Uses the SarvamAI Python SDK to:
    - Create a batch job with diarization enabled
    - Upload audio file
    - Start processing
    - Poll for completion
    - Extract diarized transcript with speaker labels
    
    Args:
        audio_file_path: Path to audio file
        api_key: Sarvam API key
        offset: Time offset in seconds (for chunk stitching)
        status_callback: Optional callback for status updates
        
    Returns:
        Tuple of (success, message, segments)
    """
    try:
        print(f"🎤 Starting batch transcription for {audio_file_path.name}")
        
        if status_callback:
            status_callback("initializing", "Connecting to Sarvam AI...", 5)
        
        # Initialize Sarvam AI client
        print(f"📡 Initializing Sarvam AI client...")
        client = SarvamAI(api_subscription_key=api_key)
        
        # Create batch job with diarization
        if status_callback:
            status_callback("uploading", "Creating batch job...", 10)
        
        print(f"🔧 Creating batch job with diarization...")
        job = client.speech_to_text_translate_job.create_job(
            model="saaras:v2.5",
            with_diarization=True,
            num_speakers=2,  # Auto-detect up to 2 speakers
        )
        print(f"✅ Job created: {job}")
        
        # Upload audio file
        if status_callback:
            status_callback("uploading", f"Uploading {audio_file_path.name}...", 20)
        
        print(f"📤 Uploading file: {audio_file_path}")
        job.upload_files(file_paths=[str(audio_file_path)])
        print(f"✅ File uploaded successfully")
        
        # Start processing
        if status_callback:
            status_callback("processing", "Starting transcription...", 30)
        
        print(f"🚀 Starting batch job...")
        job.start()
        print(f"✅ Job started, polling for completion...")
        
        # Poll for completion with progress updates
        if status_callback:
            status_callback("processing", "Processing audio (this may take a few minutes)...", 40)
        
        start_time = time.time()
        poll_interval = 3  # seconds (reduced polling frequency)
        max_wait = 600  # 10 minutes max for any audio
        poll_count = 0
        
        while True:
            elapsed = time.time() - start_time
            poll_count += 1
            
            if elapsed > max_wait:
                error_msg = f"Transcription timed out after {elapsed:.0f}s ({poll_count} polls)"
                print(f"❌ {error_msg}")
                return False, error_msg, None
            
            # Check job status
            try:
                job_status_obj = job.get_status()
                # Extract the job_state from the status object
                if hasattr(job_status_obj, 'job_state'):
                    job_state = job_status_obj.job_state
                else:
                    job_state = str(job_status_obj)
                
                print(f"📊 Poll #{poll_count} ({elapsed:.0f}s): Status = {job_state}")
            except Exception as status_error:
                print(f"⚠️ Error getting job status: {status_error}")
                time.sleep(poll_interval)
                continue
            
            # Check if job is completed (case-insensitive)
            if job_state.upper() == "COMPLETED":
                print(f"✅ Job completed after {elapsed:.0f}s ({poll_count} polls)")
                # Wait a bit for outputs to be fully ready
                time.sleep(2)
                break
            elif job_state.upper() == "FAILED":
                print(f"❌ Job failed after {elapsed:.0f}s")
                return False, "Batch job failed", None
            elif job_state.upper() in ["QUEUED", "PROCESSING", "IN_PROGRESS", "RUNNING", "ACCEPTED"]:
                # Update progress (40-80%)
                progress = 40 + min(40, int(elapsed / 10))
                if status_callback:
                    status_callback("processing", f"Processing... ({elapsed:.0f}s)", progress)
                time.sleep(poll_interval)
            else:
                # Unknown status - log and continue polling
                print(f"⚠️ Unknown job status: {job_state} - continuing to poll")
                time.sleep(poll_interval)
        
        # Job completed - verify status one more time before downloading
        final_status = job.get_status()
        final_state = final_status.job_state if hasattr(final_status, 'job_state') else str(final_status)
        print(f"📋 Final job state before download: {final_state}")
        
        if final_state.upper() != "COMPLETED":
            # Wait a bit more if not fully completed
            print(f"⏳ Job not fully completed yet, waiting...")
            time.sleep(5)
            final_status = job.get_status()
            final_state = final_status.job_state if hasattr(final_status, 'job_state') else str(final_status)
            print(f"📋 Status after wait: {final_state}")
            
            if final_state.upper() != "COMPLETED":
                return False, f"Job stuck in {final_state} state", None
        
        if status_callback:
            status_callback("finalizing", "Extracting transcription results...", 85)
        
        print(f"📥 Extracting results from job...")
        try:
            file_results = job.get_file_results()
            print(f"📊 File results type: {type(file_results)}")
            print(f"📊 File results keys: {file_results.keys() if isinstance(file_results, dict) else 'NOT A DICT'}")
            
            # Handle different response structures
            if isinstance(file_results, dict):
                successful = file_results.get('successful', [])
                failed = file_results.get('failed', [])
                print(f"✅ Successful files: {len(successful)}")
                print(f"❌ Failed files: {len(failed)}")
                
                if len(successful) == 0:
                    error_msg = "No successful transcriptions"
                    if failed:
                        failed_file = failed[0]
                        error_msg = failed_file.get('error_message', str(failed_file))
                        print(f"❌ First failure: {error_msg}")
                    return False, error_msg, None
                
                # Get first (and only) file result
                result = successful[0]
                print(f"📄 Result type: {type(result)}")
                print(f"📄 Result keys: {result.keys() if isinstance(result, dict) else 'NOT A DICT'}")
                
                # Check if output_file contains the transcript data
                if 'output_file' in result:
                    output_file_name = result['output_file']
                    print(f"📁 Output file name from result: {output_file_name}")
                    
                    # Download the output file from the job
                    try:
                        print(f"⬇️  Downloading outputs from job...")
                        import tempfile
                        import os
                        import json
                        
                        with tempfile.TemporaryDirectory() as temp_dir:
                            # download_outputs saves files to the specified directory
                            try:
                                job.download_outputs(output_dir=temp_dir)
                                print(f"✅ Downloaded outputs to {temp_dir}")
                            except Exception as download_err:
                                print(f"⚠️ Initial download failed: {download_err}")
                                print(f"⏳ Waiting 3 seconds and retrying...")
                                time.sleep(3)
                                job.download_outputs(output_dir=temp_dir)
                                print(f"✅ Downloaded outputs to {temp_dir} (retry succeeded)")
                            
                            # List all files in the directory
                            downloaded_files = os.listdir(temp_dir)
                            print(f"📁 Downloaded files: {downloaded_files}")
                            
                            # Find the JSON file (should be only one)
                            json_files = [f for f in downloaded_files if f.endswith('.json')]
                            if json_files:
                                actual_filename = json_files[0]
                                output_path = os.path.join(temp_dir, actual_filename)
                                print(f"📄 Reading file: {actual_filename}")
                                
                                with open(output_path, 'r', encoding='utf-8') as f:
                                    file_content = f.read()
                                print(f"✅ Read output file, length: {len(file_content)}")
                                
                                # Parse the JSON content
                                result = json.loads(file_content)
                                print(f"✅ Parsed downloaded file as JSON")
                                print(f"📄 Parsed keys: {result.keys() if isinstance(result, dict) else 'NOT A DICT'}")
                            else:
                                print(f"⚠️  No JSON files found in download")
                                print(f"⚠️  Falling back to using result dict directly")
                    except Exception as download_error:
                        print(f"⚠️ Could not download file: {download_error}")
                        import traceback
                        traceback.print_exc()
                        print(f"⚠️ Falling back to using result dict directly")
            else:
                # Assume file_results is the direct result
                print(f"⚠️ Unexpected file_results structure, using directly")
                result = file_results
        except Exception as extract_error:
            error_msg = f"Failed to extract results: {str(extract_error)}"
            print(f"❌ {error_msg}")
            import traceback
            traceback.print_exc()
            return False, error_msg, None
        
        # Extract diarized transcript
        if status_callback:
            status_callback("finalizing", "Processing speaker diarization...", 90)
        
        print(f"🔄 Transforming SDK response...")
        try:
            segments = transform_sarvam_sdk_response(result, offset)
            print(f"✅ Extracted {len(segments)} segments")
        except Exception as transform_error:
            error_msg = f"Failed to transform response: {str(transform_error)}"
            print(f"❌ {error_msg}")
            import traceback
            traceback.print_exc()
            return False, error_msg, None
        
        if status_callback:
            status_callback("completed", f"Transcription complete: {len(segments)} segments", 100)
        
        print(f"🎉 Transcription successful: {len(segments)} segments")
        return True, "Transcription successful", segments
                
    except Exception as e:
        error_msg = f"Batch API error: {str(e)}"
        print(f"❌ {error_msg}")
        return False, error_msg, None


def transform_sarvam_sdk_response(sdk_result: Dict, offset: float = 0) -> List[Dict]:
    """
    Transform Sarvam AI SDK batch result into clean transcript segments.
    
    SDK response structure includes diarized_transcript with entries:
    {
        "diarized_transcript": {
            "entries": [
                {
                    "transcript": "hello",
                    "start_time_seconds": 0.5,
                    "end_time_seconds": 2.3,
                    "speaker_id": "speaker 1"
                },
                ...
            ]
        }
    }
    
    Args:
        sdk_result: Result dictionary from Sarvam SDK
        offset: Time offset in seconds (for chunk stitching)
        
    Returns:
        List of transcript segments
    """
    segments = []
    
    print(f"🔍 SDK result keys: {sdk_result.keys() if isinstance(sdk_result, dict) else 'NOT A DICT'}")
    
    # Extract diarized transcript from SDK response
    diarized_data = sdk_result.get("diarized_transcript", {})
    print(f"📊 Diarized data type: {type(diarized_data)}")
    
    if isinstance(diarized_data, dict):
        entries = diarized_data.get("entries", [])
    else:
        # Maybe it's directly the entries list?
        entries = diarized_data if isinstance(diarized_data, list) else []
    
    print(f"📝 Found {len(entries)} diarized entries")
    
    if not entries:
        # Fallback: try regular transcript
        print(f"⚠️ No diarized entries, trying fallback...")
        transcript_text = sdk_result.get("transcript", "")
        print(f"📄 Fallback transcript length: {len(transcript_text) if transcript_text else 0}")
        
        if transcript_text:
            segments.append({
                "id": "1",
                "speaker": "Speaker 1",
                "timestamp": format_timestamp(offset),
                "text": transcript_text,
                "start": offset,
                "end": offset + 10  # Approximate
            })
            print(f"✅ Created 1 fallback segment")
        return segments
    
    processed_count = 0
    skipped_count = 0
    
    for idx, entry in enumerate(entries, start=1):
        speaker_id = entry.get("speaker_id", "speaker 1")
        text = entry.get("transcript", "").strip()
        start_time = entry.get("start_time_seconds", 0) + offset
        end_time = entry.get("end_time_seconds", 0) + offset
        
        # Skip empty segments
        if not text or (end_time - start_time) < MIN_SEGMENT_DURATION:
            skipped_count += 1
            continue
        
        # Format speaker ID (capitalize properly)
        friendly_speaker = speaker_id.replace("speaker", "Speaker").strip()
        
        segments.append({
            "id": str(idx),
            "speaker": friendly_speaker,
            "timestamp": format_timestamp(start_time),
            "text": text,
            "start": start_time,
            "end": end_time
        })
        processed_count += 1
    
    print(f"✅ Processed {processed_count} segments, skipped {skipped_count}")
    return segments


def transform_sarvam_diarization_response(sarvam_result: Dict, offset: float = 0) -> List[Dict]:
    """
    Transform Sarvam AI diarization response into clean transcript segments.
    
    Sarvam diarization response structure:
    {
        "transcript": "translated text",
        "speaker_segments": [
            {
                "speaker_id": "speaker_0",
                "text": "Hello, how are you?",
                "start": 0.5,
                "end": 2.3
            },
            {
                "speaker_id": "speaker_1",
                "text": "I'm doing well, thanks!",
                "start": 2.5,
                "end": 4.8
            }
        ]
    }
    
    Our format (frontend-friendly, no chunk boundaries):
    [
        {
            "id": "1",
            "speaker": "Speaker 1",
            "timestamp": "00:00:00",
            "text": "Hello, how are you?",
            "start": 0.5,
            "end": 2.3
        }
    ]
    
    Args:
        sarvam_result: Raw response from Sarvam API with diarization
        offset: Time offset in seconds (for chunked audio)
        
    Returns:
        List of transcript segments with speaker labels and timestamps
    """
    segments = []
    
    # Extract speaker segments from Sarvam response
    speaker_segments = sarvam_result.get("speaker_segments", [])
    
    if not speaker_segments:
        # Fallback: no diarization data, use full transcript
        transcript_text = sarvam_result.get("transcript", "")
        if transcript_text:
            segments.append({
                "id": "1",
                "speaker": "Speaker 1",
                "timestamp": format_timestamp(offset),
                "text": transcript_text,
                "start": offset,
                "end": offset + 10  # Approximate
            })
        return segments
    
    # Map speaker IDs to friendly names (speaker_0 -> Speaker 1, etc.)
    speaker_map = {}
    next_speaker_num = 1
    
    for idx, seg_data in enumerate(speaker_segments, start=1):
        speaker_id = seg_data.get("speaker_id", "speaker_0")
        text = seg_data.get("text", "").strip()
        start_time = seg_data.get("start", 0) + offset
        end_time = seg_data.get("end", 0) + offset
        
        # Skip empty segments
        if not text or (end_time - start_time) < MIN_SEGMENT_DURATION:
            continue
        
        # Map speaker ID to friendly name
        if speaker_id not in speaker_map:
            speaker_map[speaker_id] = f"Speaker {next_speaker_num}"
            next_speaker_num += 1
        
        friendly_speaker = speaker_map[speaker_id]
        
        segments.append({
            "id": str(idx),
            "speaker": friendly_speaker,
            "timestamp": format_timestamp(start_time),
            "text": text,
            "start": start_time,
            "end": end_time
        })
    
    return segments


def merge_overlapping_chunks(all_chunk_segments: List[List[Dict]]) -> List[Dict]:
    """
    Merge segments from overlapping chunks, removing duplicates and ensuring continuity.
    
    Critical for hiding chunk boundaries from the frontend.
    
    Logic:
    1. Detect duplicate text in overlap regions
    2. Remove duplicates by comparing timestamps and text similarity
    3. Merge consecutive segments from the same speaker
    4. Ensure speaker transitions are clean
    
    Args:
        all_chunk_segments: List of segment lists from each chunk
        
    Returns:
        Single merged list of segments with no duplicates
    """
    if not all_chunk_segments:
        return []
    
    if len(all_chunk_segments) == 1:
        return all_chunk_segments[0]
    
    merged = []
    
    for chunk_idx, chunk_segments in enumerate(all_chunk_segments):
        if chunk_idx == 0:
            # First chunk: add all segments
            merged.extend(chunk_segments)
        else:
            # Subsequent chunks: handle overlap
            prev_chunk_end_time = merged[-1]["end"] if merged else 0
            overlap_start = prev_chunk_end_time - CHUNK_OVERLAP
            
            for seg in chunk_segments:
                # Skip segments in overlap region if similar to previous
                if seg["start"] < overlap_start + 1:  # 1s buffer
                    # Check for duplicate by comparing text similarity
                    is_duplicate = False
                    for prev_seg in reversed(merged[-3:]):  # Check last 3 segments
                        if _text_similarity(seg["text"], prev_seg["text"]) > 0.8:
                            is_duplicate = True
                            break
                    
                    if is_duplicate:
                        continue
                
                merged.append(seg)
    
    # Final pass: merge consecutive segments from same speaker
    final_segments = []
    current_speaker = None
    current_texts = []
    current_start = None
    current_end = None
    
    for seg in merged:
        if seg["speaker"] == current_speaker:
            # Same speaker: merge text
            current_texts.append(seg["text"])
            current_end = seg["end"]
        else:
            # Speaker changed: save previous segment
            if current_speaker:
                final_segments.append({
                    "id": str(len(final_segments) + 1),
                    "speaker": current_speaker,
                    "timestamp": format_timestamp(current_start),
                    "text": " ".join(current_texts),
                    "start": current_start,
                    "end": current_end
                })
            
            # Start new segment
            current_speaker = seg["speaker"]
            current_texts = [seg["text"]]
            current_start = seg["start"]
            current_end = seg["end"]
    
    # Add final segment
    if current_speaker:
        final_segments.append({
            "id": str(len(final_segments) + 1),
            "speaker": current_speaker,
            "timestamp": format_timestamp(current_start),
            "text": " ".join(current_texts),
            "start": current_start,
            "end": current_end
        })
    
    # Re-number segments sequentially
    for idx, seg in enumerate(final_segments, start=1):
        seg["id"] = str(idx)
    
    return final_segments

def _text_similarity(text1: str, text2: str) -> float:
    """
    Calculate similarity between two text strings.
    Used for deduplication in overlap regions.
    
    Returns:
        Similarity score between 0 and 1
    """
    words1 = set(text1.lower().split())
    words2 = set(text2.lower().split())
    
    if not words1 or not words2:
        return 0.0
    
    intersection = words1 & words2
    union = words1 | words2
    
    return len(intersection) / len(union) if union else 0.0


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
