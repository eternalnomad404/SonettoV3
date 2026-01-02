# Sonetto V3 - Implementation Summary

## ✅ Completed Features

### 1. Enhanced PostgreSQL Metadata Storage

**What was added:**
- `file_name` - Original filename of uploaded file
- `file_size_bytes` - Size of uploaded file in bytes
- `file_type` - MIME type (e.g., "video/mp4", "audio/wav")
- `audio_duration_seconds` - Duration of extracted audio in seconds

**Files modified:**
- `services/api/db/postgres/models.py` - Added new columns to Session model
- `services/api/api/routes/sessions.py` - Updated upload endpoint to populate metadata
- `apps/desktop/ui/src/lib/api.ts` - Updated Session interface to include new fields

**How it works:**
When you upload a file, the backend now:
1. Reads the file content and calculates size
2. Stores the original filename and MIME type
3. Extracts audio using FFmpeg
4. Uses ffprobe to detect audio duration
5. Saves all metadata to PostgreSQL

### 2. File Storage Verification

**Created:** `verify-storage.ps1` - PowerShell script to inspect storage

**What it does:**
- Shows where files are stored in the Docker container
- Lists all original files (audio/video uploads)
- Lists all extracted audio files (16kHz mono WAV)
- Provides commands to copy files for quality verification

**How to use:**
```powershell
# Run the verification script
.\verify-storage.ps1

# Copy an audio file to verify quality
docker cp sonetto-backend:/app/storage/audio/<filename>.wav ./

# Play with VLC or Windows Media Player
```

**Storage locations:**
- **Container path:** `/app/storage/`
  - `/app/storage/original/` - Original uploaded files
  - `/app/storage/audio/` - Extracted 16kHz mono WAV files
- **Docker volume:** `storage_data` (persists data even when container restarts)

### 3. Delete Session Functionality

**Backend changes:**
- Added `DELETE /sessions/{session_id}` endpoint
- Deletes session from PostgreSQL
- Removes original file and audio file from disk
- Returns 204 No Content on success

**Frontend changes:**
- Added `deleteSession()` function in `api.ts`
- Updated `SessionCard.tsx` with delete button (trash icon)
- Delete button appears on hover
- Confirmation dialog before deletion
- Auto-refreshes session list after delete

**Files modified:**
- `services/api/api/routes/sessions.py` - DELETE endpoint
- `services/api/core/audio.py` - Added `get_audio_duration()` function
- `apps/desktop/ui/src/lib/api.ts` - Added `deleteSession()`
- `apps/desktop/ui/src/components/SessionCard.tsx` - Added delete button with handler
- `apps/desktop/ui/src/components/SessionsLibrary.tsx` - Wired up delete callback

## 🔧 Technical Details

### Audio Processing
- **Format:** WAV PCM 16-bit little-endian
- **Sample rate:** 16kHz (optimized for speech recognition)
- **Channels:** Mono
- **Duration detection:** Uses ffprobe with JSON output

### API Endpoints

#### Upload Session
```http
POST /sessions/upload
Content-Type: multipart/form-data

file: <audio or video file>
title: <session title>

Response: 201 Created
{
  "id": "uuid",
  "title": "string",
  "file_name": "original.mp4",
  "file_size_bytes": 1638400,
  "file_type": "video/mp4",
  "audio_duration_seconds": 3,
  "original_file_path": "/app/storage/original/uuid.mp4",
  "audio_file_path": "/app/storage/audio/uuid.wav",
  "status": "ready",
  "created_at": "2026-01-02T16:54:19.704913"
}
```

#### Delete Session
```http
DELETE /sessions/{session_id}

Response: 204 No Content
```

### Database Schema

```sql
CREATE TABLE sessions (
    id UUID PRIMARY KEY,
    title VARCHAR NOT NULL,
    session_type VARCHAR,
    duration_seconds INTEGER,
    original_file_path VARCHAR,
    audio_file_path VARCHAR,
    file_name VARCHAR,                -- NEW
    file_size_bytes BIGINT,           -- NEW
    file_type VARCHAR,                -- NEW
    audio_duration_seconds INTEGER,   -- NEW
    status VARCHAR NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);
```

## 🧪 Testing

### Test Upload
1. Open frontend: http://localhost:5174
2. Drag and drop a video or audio file
3. Enter a title
4. Click upload
5. Verify session appears in list with "Ready" status

### Test Delete
1. Hover over any session card
2. Click the trash icon that appears
3. Confirm deletion in dialog
4. Verify session disappears from list
5. Run `.\verify-storage.ps1` to confirm files removed

### Verify Audio Quality
```powershell
# List all audio files
.\verify-storage.ps1

# Copy latest audio file
docker cp sonetto-backend:/app/storage/audio/<filename>.wav ./

# Play with VLC
vlc <filename>.wav

# Or Windows Media Player
start <filename>.wav
```

### Check Metadata
```powershell
# Query database directly
docker exec sonetto-postgres psql -U postgres -d SonettoV3 -c "SELECT id, title, file_name, file_size_bytes, audio_duration_seconds FROM sessions ORDER BY created_at DESC LIMIT 5;"
```

## 📊 Current State

**Services running:**
- Frontend: http://localhost:5174 (Vite dev server)
- Backend: http://localhost:8000 (FastAPI in Docker)
- PostgreSQL: localhost:5432 (in Docker)
- MongoDB Atlas: Connected but not used in V1

**Files stored:** 7 sessions (as of this implementation)
- Original files: 23MB total
- Audio files: 1.8MB total (compressed due to 16kHz mono format)

## 🚀 Next Steps (Future Enhancements)

1. **Transcription**: Use Whisper or similar to transcribe audio
2. **Speaker Diarization**: Identify different speakers
3. **Summary Generation**: Use LLM to summarize sessions
4. **Search**: Full-text search across transcriptions
5. **Export**: Download transcriptions in various formats
6. **Batch Operations**: Delete/export multiple sessions at once

## 🐛 Known Issues

- Backend container shows "unhealthy" status in Docker but is fully functional
- Old sessions (created before metadata enhancement) have NULL values for new fields

## 📝 Notes

- All files are stored inside the Docker container at `/app/storage/`
- Files persist across container restarts via `storage_data` volume
- Audio extraction timeout is 5 minutes per file
- Delete operation continues even if file deletion fails (logs warning)
