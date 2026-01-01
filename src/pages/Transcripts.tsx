import { useState } from "react";
import AppSidebar from "@/components/AppSidebar";
import MobileHeader from "@/components/MobileHeader";
import MobileSidebar from "@/components/MobileSidebar";
import RecordingSelector from "@/components/transcripts/RecordingSelector";
import TranscriptWorkspace from "@/components/transcripts/TranscriptWorkspace";

export type Recording = {
  id: string;
  name: string;
  duration: string;
  uploadDate: string;
  transcriptionStatus: "none" | "generating" | "ready";
  type: "audio" | "video";
};

const mockRecordings: Recording[] = [
  {
    id: "1",
    name: "Q4 Planning Meeting Recording",
    duration: "1h 23m",
    uploadDate: "Dec 28, 2025",
    transcriptionStatus: "ready",
    type: "video",
  },
  {
    id: "2",
    name: "Product Demo - Enterprise Client",
    duration: "45m 12s",
    uploadDate: "Dec 27, 2025",
    transcriptionStatus: "none",
    type: "video",
  },
  {
    id: "3",
    name: "Interview - Sarah Johnson",
    duration: "32m 45s",
    uploadDate: "Dec 26, 2025",
    transcriptionStatus: "ready",
    type: "audio",
  },
  {
    id: "4",
    name: "Weekly Standup Dec 23",
    duration: "18m 30s",
    uploadDate: "Dec 23, 2025",
    transcriptionStatus: "none",
    type: "audio",
  },
];

const Transcripts = () => {
  const [recordings] = useState<Recording[]>(mockRecordings);
  const [selectedRecording, setSelectedRecording] = useState<Recording | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showRecordingSelector, setShowRecordingSelector] = useState(false);

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
              {recordings.map((recording) => (
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
              ))}
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
