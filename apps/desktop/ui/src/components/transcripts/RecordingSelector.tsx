import { Search, FileAudio, FileVideo, Clock, Calendar, Check, Loader2 } from "lucide-react";
import { useState } from "react";
import type { Recording } from "@/pages/Transcripts";

type RecordingSelectorProps = {
  recordings: Recording[];
  selectedRecording: Recording | null;
  onSelect: (recording: Recording) => void;
};

const statusBadge = {
  none: { label: "No transcript", className: "bg-secondary text-muted-foreground text-xs px-2 py-1 rounded" },
  generating: { label: "Generating", className: "bg-yellow-50 text-yellow-700 text-xs px-2 py-1 rounded border border-yellow-200" },
  ready: { label: "Ready", className: "bg-primary/10 text-primary text-xs px-2 py-1 rounded border border-primary/20" },
};

const RecordingSelector = ({ recordings, selectedRecording, onSelect }: RecordingSelectorProps) => {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredRecordings = recordings.filter((r) =>
    r.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-4 border-b border-border shrink-0">
        <h3 className="text-sm font-semibold text-foreground mb-3">Select Recording</h3>
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search recordings..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-9 pl-9 pr-3 text-sm bg-background border border-input rounded-lg placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
          />
        </div>
      </div>

      {/* Recording list */}
      <div className="flex-1 overflow-auto p-2">
        <div className="space-y-1">
          {filteredRecordings.map((recording) => {
            const isSelected = selectedRecording?.id === recording.id;
            const Icon = recording.type === "audio" ? FileAudio : FileVideo;
            const status = statusBadge[recording.transcriptionStatus as keyof typeof statusBadge];

            return (
              <button
                key={recording.id}
                onClick={() => onSelect(recording)}
                className={`
                  w-full text-left p-3 rounded-lg transition-colors
                  ${isSelected
                    ? "bg-accent border border-primary/20"
                    : "hover:bg-secondary border border-transparent"
                  }
                `}
              >
                <div className="flex items-start gap-3">
                  <div className={`
                    flex items-center justify-center w-9 h-9 rounded-lg shrink-0
                    ${isSelected ? "bg-primary/10" : "bg-secondary"}
                  `}>
                    <Icon className={`w-4 h-4 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${isSelected ? "text-primary" : "text-foreground"}`}>
                      {recording.name}
                    </p>
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {recording.duration}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {recording.uploadDate}
                      </span>
                    </div>
                    <div className="mt-2">
                      <span className={status.className}>
                        {recording.transcriptionStatus === "generating" && (
                          <Loader2 className="inline w-3 h-3 mr-1 animate-spin" />
                        )}
                        {recording.transcriptionStatus === "ready" && (
                          <Check className="inline w-3 h-3 mr-1" />
                        )}
                        {status.label}
                      </span>
                    </div>
                  </div>
                </div>
              </button>
            );
          })}

          {filteredRecordings.length === 0 && (
            <div className="text-center py-8 text-sm text-muted-foreground">
              No recordings found
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RecordingSelector;
