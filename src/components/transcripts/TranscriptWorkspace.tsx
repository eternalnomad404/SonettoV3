import { useState, useEffect } from "react";
import { Play, Loader2, FileText, Sparkles } from "lucide-react";
import type { Recording } from "@/pages/Transcripts";
import TranscriptEditor from "./TranscriptEditor";
import AIAssistantPanel from "./AIAssistantPanel";

type TranscriptWorkspaceProps = {
  recording: Recording | null;
};

type TranscriptSegment = {
  id: string;
  speaker: string;
  timestamp: string;
  text: string;
};

const mockTranscript: TranscriptSegment[] = [
  {
    id: "1",
    speaker: "Sarah Johnson",
    timestamp: "00:00:12",
    text: "Good morning everyone. Thank you for joining this planning session. Today we're going to discuss our Q4 objectives and key results.",
  },
  {
    id: "2",
    speaker: "Michael Chen",
    timestamp: "00:00:28",
    text: "Thanks Sarah. I've prepared some data from last quarter that I think will be helpful as we set our new targets.",
  },
  {
    id: "3",
    speaker: "Sarah Johnson",
    timestamp: "00:00:45",
    text: "Perfect. Let's start by reviewing where we landed on our Q3 goals. We exceeded our customer acquisition target by twelve percent, which is excellent.",
  },
  {
    id: "4",
    speaker: "Emily Rodriguez",
    timestamp: "00:01:02",
    text: "I want to add some context there. A lot of that growth came from the new referral program we launched in August. We should definitely double down on that.",
  },
  {
    id: "5",
    speaker: "Michael Chen",
    timestamp: "00:01:18",
    text: "Agreed. The data shows referral customers have a thirty percent higher retention rate compared to other acquisition channels.",
  },
];

const TranscriptWorkspace = ({ recording }: TranscriptWorkspaceProps) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [transcript, setTranscript] = useState<TranscriptSegment[] | null>(null);
  const [showAssistant, setShowAssistant] = useState(false);

  // Reset state when recording changes
  useEffect(() => {
    if (recording?.transcriptionStatus === "ready") {
      setTranscript(mockTranscript);
    } else {
      setTranscript(null);
    }
    setShowAssistant(false);
  }, [recording]);

  const handleGenerate = () => {
    setIsGenerating(true);
    // Simulate generation
    setTimeout(() => {
      setTranscript(mockTranscript);
      setIsGenerating(false);
    }, 2500);
  };

  const handleUpdateSegment = (id: string, newText: string) => {
    setTranscript((prev) =>
      prev?.map((seg) => (seg.id === id ? { ...seg, text: newText } : seg)) ?? null
    );
  };

  const handleAIAction = (action: string) => {
    console.log("AI Action:", action);
    // In a real app, this would call an AI endpoint
  };

  // Empty state - no recording selected
  if (!recording) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium text-foreground mb-2">
            Select a recording
          </h3>
          <p className="text-sm text-muted-foreground">
            Choose a recording from the left panel to generate or view its transcription
          </p>
        </div>
      </div>
    );
  }

  // Generate state - no transcript yet
  if (!transcript && !isGenerating) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 rounded-2xl bg-accent flex items-center justify-center mx-auto mb-4">
            <Play className="w-8 h-8 text-primary" />
          </div>
          <h3 className="text-lg font-medium text-foreground mb-2">
            {recording.name}
          </h3>
          <p className="text-sm text-muted-foreground mb-6">
            {recording.duration} • {recording.type === "audio" ? "Audio" : "Video"} recording
          </p>
          <button
            onClick={handleGenerate}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-primary-foreground bg-primary rounded-lg hover:opacity-90 transition-opacity"
          >
            <Sparkles className="w-4 h-4" />
            Generate Transcription
          </button>
        </div>
      </div>
    );
  }

  // Generating state
  if (isGenerating) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-primary animate-spin mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-1">
            Generating transcription
          </h3>
          <p className="text-sm text-muted-foreground">
            This may take a few moments...
          </p>
        </div>
      </div>
    );
  }

  // Transcript ready - show editor
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-border bg-background shrink-0">
        <div>
          <h3 className="text-sm font-medium text-foreground">{recording.name}</h3>
          <p className="text-xs text-muted-foreground">{recording.duration}</p>
        </div>
        <button
          onClick={() => setShowAssistant(!showAssistant)}
          className={`
            inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors
            ${showAssistant
              ? "bg-accent text-accent-foreground"
              : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
            }
          `}
        >
          <Sparkles className="w-4 h-4" />
          AI Assistant
        </button>
      </div>

      {/* Editor + Assistant layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Transcript editor */}
        <div className="flex-1 overflow-auto">
          <TranscriptEditor
            segments={transcript}
            onUpdateSegment={handleUpdateSegment}
          />
        </div>

        {/* AI Assistant panel */}
        {showAssistant && (
          <AIAssistantPanel
            onAction={handleAIAction}
            onClose={() => setShowAssistant(false)}
          />
        )}
      </div>
    </div>
  );
};

export default TranscriptWorkspace;
