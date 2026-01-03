import { useState, useEffect } from "react";
import AppSidebar from "@/components/AppSidebar";
import MobileHeader from "@/components/MobileHeader";
import MobileSidebar from "@/components/MobileSidebar";
import RecordingSelector from "@/components/transcripts/RecordingSelector";
import TranscriptWorkspace from "@/components/transcripts/TranscriptWorkspace";
import { fetchSessions, formatDuration, formatDate } from "@/lib/api";
import type { Session as APISession } from "@/lib/api";

export type Recording = {
  id: string;
  name: string;
  duration: string;
  uploadDate: string;
  transcriptionStatus: "none" | "generating" | "ready";
  type: "audio" | "video";
};

const Transcripts = () => {
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [selectedRecording, setSelectedRecording] = useState<Recording | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showRecordingSelector, setShowRecordingSelector] = useState(false);
  const [loading, setLoading] = useState(true);

  // Fetch real sessions from backend on mount
  useEffect(() => {
    const loadRecordings = async () => {
      try {
        setLoading(true);
        const apiSessions = await fetchSessions();
        
        // Transform API sessions to Recording format
        const transformedRecordings: Recording[] = apiSessions.map((s: APISession) => ({
          id: s.id,
          name: s.title,
          duration: formatDuration(s.audio_duration_seconds || s.duration_seconds),
          uploadDate: formatDate(s.created_at),
          transcriptionStatus: "none" as const, // No transcription implemented yet
          type: s.session_type === "video" || s.original_file_path?.includes('.mp4') ? "video" as const : "audio" as const,
        }));
        
        setRecordings(transformedRecordings);
      } catch (err) {
        console.error("Failed to load recordings:", err);
        setRecordings([]); // Fallback to empty array on error
      } finally {
        setLoading(false);
      }
    };

    loadRecordings();
  }, []);

  return (
    <div className="flex min-h-screen w-full bg-background">
      {/* Mobile Header */}
      <MobileHeader onMenuClick={() => setIsMobileMenuOpen(true)} />
      
      {/* Mobile Sidebar Drawer */}
      <MobileSidebar isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />
      
      {/* Desktop Fixed Sidebar */}
      <AppSidebar />

      {/* Main content - offset by sidebar width on desktop, padding top for mobile header */}
      <main className="flex-1 flex flex-col min-w-0 md:ml-56 h-screen pt-14 md:pt-0">
        {/* Page header */}
        <header className="sticky top-14 md:top-0 z-10 flex items-center justify-between px-4 md:px-8 py-4 md:py-6 border-b border-border bg-background shrink-0">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Transcripts</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Generate and refine transcriptions from your recordings
            </p>
          </div>
        </header>

        {/* Mobile: Recording selector toggle */}
        <div className="md:hidden px-4 py-3 border-b border-border bg-card">
          <button
            type="button"
            onClick={() => setShowRecordingSelector(!showRecordingSelector)}
            className="w-full flex items-center justify-between px-3 py-2 bg-secondary rounded-lg text-sm"
          >
            <span className={selectedRecording ? "text-foreground" : "text-muted-foreground"}>
              {selectedRecording?.name || "Select a recording..."}
            </span>
            <svg
              className={`w-4 h-4 text-muted-foreground transition-transform ${showRecordingSelector ? "rotate-180" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          
          {/* Mobile Recording dropdown */}
          {showRecordingSelector && (
            <div className="mt-2 bg-popover border border-border rounded-lg shadow-lg max-h-64 overflow-auto">
              {loading ? (
                <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                  Loading recordings...
                </div>
              ) : recordings.length === 0 ? (
                <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                  No recordings found
                </div>
              ) : (
                recordings.map((recording) => (
                  <button
                    key={recording.id}
                    type="button"
                    onClick={() => {
                      setSelectedRecording(recording);
                      setShowRecordingSelector(false);
                    }}
                    className={`w-full px-3 py-3 text-left border-b border-border last:border-b-0 transition-colors ${
                      selectedRecording?.id === recording.id ? "bg-accent" : "hover:bg-secondary"
                    }`}
                  >
                    <p className="font-medium text-foreground text-sm truncate">{recording.name}</p>
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                      <span>{recording.duration}</span>
                      <span>•</span>
                      <span>{recording.uploadDate}</span>
                    </div>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* Content area with two panels */}
        <div className="flex-1 flex min-h-0">
          {/* Left panel - Recording selection (desktop only) */}
          <aside className="hidden md:flex w-80 border-r border-border bg-card shrink-0 flex-col overflow-hidden">
            <RecordingSelector
              recordings={recordings}
              selectedRecording={selectedRecording}
              onSelect={setSelectedRecording}
            />
          </aside>

          {/* Main workspace */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <TranscriptWorkspace recording={selectedRecording} />
          </div>
        </div>
      </main>
    </div>
  );
};

export default Transcripts;
