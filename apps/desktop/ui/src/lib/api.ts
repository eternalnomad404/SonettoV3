/**
 * API client for communicating with the FastAPI backend
 */

const API_BASE_URL = "http://localhost:8000";

export interface Session {
  id: string;
  title: string;
  session_type: string | null;
  duration_seconds: number | null;
  original_file_path: string | null;
  audio_file_path: string | null;
  file_name: string | null;
  file_size_bytes: number | null;
  file_type: string | null;
  audio_duration_seconds: number | null;
  status: string;
  created_at: string;
}

export interface TranscriptSegment {
  id: string;
  speaker: string;
  timestamp: string;
  text: string;
}

export interface TranscriptionResponse {
  session_id: string;
  segments: TranscriptSegment[];
  total_segments: number;
  speaker_names?: Record<string, string>;
  created_at?: string;
  updated_at?: string;
}

/**
 * Fetch all sessions from the backend
 */
export async function fetchSessions(): Promise<Session[]> {
  const response = await fetch(`${API_BASE_URL}/sessions`);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch sessions: ${response.statusText}`);
  }
  
  return response.json();
}

/**
 * Fetch a single session by ID
 */
export async function fetchSessionById(id: string): Promise<Session> {
  const response = await fetch(`${API_BASE_URL}/sessions/${id}`);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch session: ${response.statusText}`);
  }
  
  return response.json();
}

/**
 * Upload a new session file (audio or video) with real progress tracking
 */
export async function uploadSession(
  file: File, 
  title: string,
  onProgress?: (progress: number) => void
): Promise<Session> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("title", title);
  
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    
    // Track upload progress (actual bytes uploaded)
    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable && onProgress) {
        const percentComplete = (event.loaded / event.total) * 100;
        onProgress(percentComplete);
      }
    });
    
    // Handle completion
    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const response = JSON.parse(xhr.responseText);
          resolve(response);
        } catch (error) {
          reject(new Error('Failed to parse response'));
        }
      } else {
        try {
          const errorData = JSON.parse(xhr.responseText);
          reject(new Error(errorData.detail || 'Upload failed'));
        } catch {
          reject(new Error(`Upload failed: ${xhr.statusText}`));
        }
      }
    });
    
    // Handle errors
    xhr.addEventListener('error', () => {
      reject(new Error('Network error during upload'));
    });
    
    xhr.addEventListener('abort', () => {
      reject(new Error('Upload cancelled'));
    });
    
    // Send request
    xhr.open('POST', `${API_BASE_URL}/sessions/upload`);
    xhr.send(formData);
  });
}

/**
 * Delete a session and all associated files
 */
export async function deleteSession(id: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/sessions/${id}`, {
    method: "DELETE",
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: response.statusText }));
    throw new Error(errorData.detail || "Delete failed");
  }
}

/**
 * Generate transcription for a session using Sarvam AI
 */
export async function generateTranscript(sessionId: string, regenerate: boolean = false): Promise<TranscriptSegment[]> {
  const url = regenerate
    ? `${API_BASE_URL}/sessions/${sessionId}/transcribe?regenerate=true`
    : `${API_BASE_URL}/sessions/${sessionId}/transcribe`;
    
  const response = await fetch(url, {
    method: "POST",
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: response.statusText }));
    throw new Error(errorData.detail || "Transcription failed");
  }
  
  const data: TranscriptionResponse = await response.json();
  return data.segments;
}

/**
 * Get cached transcription from MongoDB (does not generate)
 */
export async function getTranscription(sessionId: string): Promise<TranscriptionResponse | null> {
  const response = await fetch(`${API_BASE_URL}/sessions/${sessionId}/transcription`);
  
  if (response.status === 404) {
    return null; // No transcription exists
  }
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: response.statusText }));
    throw new Error(errorData.detail || "Failed to fetch transcription");
  }
  
  return response.json();
}

/**
 * Update speaker names for a session
 */
export async function updateSpeakerNames(
  sessionId: string,
  speakerNames: Record<string, string>
): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/sessions/${sessionId}/speakers`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ speaker_names: speakerNames }),
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: response.statusText }));
    throw new Error(errorData.detail || "Failed to update speaker names");
  }
}

/**
 * Update speaker for a specific segment
 */
export async function updateSegmentSpeaker(
  sessionId: string,
  segmentIndex: number,
  newSpeaker: string
): Promise<void> {
  const response = await fetch(
    `${API_BASE_URL}/sessions/${sessionId}/segments/${segmentIndex}/speaker?new_speaker=${encodeURIComponent(newSpeaker)}`,
    {
      method: "PUT",
    }
  );
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: response.statusText }));
    throw new Error(errorData.detail || "Failed to update segment speaker");
  }
}

/**
 * Helper: Convert seconds to duration string (e.g., "1h 23m")
 */
export function formatDuration(seconds: number | null): string {
  if (!seconds) return "0s";
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  } else {
    return `${secs}s`;
  }
}

/**
 * Helper: Format timestamp to readable date
 */
export function formatDate(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
