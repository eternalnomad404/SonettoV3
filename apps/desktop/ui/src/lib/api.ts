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
 * Upload a new session file (audio or video)
 */
export async function uploadSession(file: File, title: string): Promise<Session> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("title", title);
  
  const response = await fetch(`${API_BASE_URL}/sessions/upload`, {
    method: "POST",
    body: formData,
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: response.statusText }));
    throw new Error(errorData.detail || "Upload failed");
  }
  
  return response.json();
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
