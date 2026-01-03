import { useState, useEffect } from "react";
import { Play, Loader2, FileText, Sparkles, RefreshCw } from "lucide-react";
import type { Recording } from "@/pages/Transcripts";
import TranscriptEditor from "./TranscriptEditor";
import AIAssistantPanel from "./AIAssistantPanel";
import {
  generateTranscript,
  getTranscription,
  updateSpeakerNames,
  updateSegmentSpeaker,
  type TranscriptSegment,
} from "@/lib/api";

type TranscriptWorkspaceProps = {
  recording: Recording | null;
  onTranscriptionStatusChange?: (recordingId: string, status: "ready" | "none") => void;
};

const TranscriptWorkspace = ({ recording, onTranscriptionStatusChange }: TranscriptWorkspaceProps) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [transcript, setTranscript] = useState<TranscriptSegment[] | null>(null);
  const [speakerNames, setSpeakerNames] = useState<Record<string, string>>({});
  const [showAssistant, setShowAssistant] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-load cached transcription when recording changes
  useEffect(() => {
    let isMounted = true;
    
    const loadCachedTranscription = async () => {
      if (!recording) {
        setTranscript(null);
        setSpeakerNames({});
        setError(null);
        setShowAssistant(false);
        return;
      }

      // Use a small delay to prevent showing loading state for fast fetches
      const loadingTimeout = setTimeout(() => {
        if (isMounted) {
          setIsLoading(true);
        }
      }, 150);

      setError(null);

      try {
        const cachedTranscription = await getTranscription(recording.id);
        
        clearTimeout(loadingTimeout);
        
        if (!isMounted) return;
        
        if (cachedTranscription) {
          setTranscript(cachedTranscription.segments);
          setSpeakerNames(cachedTranscription.speaker_names || {});
          setIsLoading(false);
          
          // Notify parent that this recording has a transcription
          if (onTranscriptionStatusChange) {
            onTranscriptionStatusChange(recording.id, "ready");
          }
        } else {
          setTranscript(null);
          setSpeakerNames({});
          setIsLoading(false);
        }
      } catch (err) {
        clearTimeout(loadingTimeout);
        if (!isMounted) return;
        
        console.error("Error loading cached transcription:", err);
        setTranscript(null);
        setSpeakerNames({});
        setIsLoading(false);
      }
    };

    loadCachedTranscription();
    
    return () => {
      isMounted = false;
    };
  }, [recording, onTranscriptionStatusChange]);

  const handleGenerate = async (regenerate: boolean = false) => {
    if (!recording) return;

    setIsGenerating(true);
    setError(null);

    try {
      const segments = await generateTranscript(recording.id, regenerate);
      setTranscript(segments);
      
      // Reload to get speaker names
      const freshData = await getTranscription(recording.id);
      if (freshData) {
        setSpeakerNames(freshData.speaker_names || {});
      }
      
      // Notify parent that transcription is ready
      if (onTranscriptionStatusChange) {
        onTranscriptionStatusChange(recording.id, "ready");
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Transcription failed";
      setError(errorMessage);
      console.error("Transcription error:", err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleUpdateSegment = (id: string, newText: string) => {
    setTranscript((prev) =>
      prev?.map((seg) => (seg.id === id ? { ...seg, text: newText } : seg)) ?? null
    );
  };

  const handleUpdateSpeaker = async (segmentId: string, newSpeaker: string) => {
    if (!recording) return;

    const segmentIndex = transcript?.findIndex((seg) => seg.id === segmentId);
    if (segmentIndex === undefined || segmentIndex === -1) return;

    try {
      await updateSegmentSpeaker(recording.id, segmentIndex, newSpeaker);
      
      // Update local state
      setTranscript((prev) =>
        prev?.map((seg) => (seg.id === segmentId ? { ...seg, speaker: newSpeaker } : seg)) ?? null
      );
    } catch (err) {
      console.error("Error updating segment speaker:", err);
      alert("Failed to update speaker name");
    }
  };

  const handleUpdateSpeakers = async (newSpeakerNames: Record<string, string>) => {
    if (!recording) return;

    try {
      await updateSpeakerNames(recording.id, newSpeakerNames);
      setSpeakerNames(newSpeakerNames);
      
      // Reload transcript to get updated speaker names
      const freshData = await getTranscription(recording.id);
      if (freshData) {
        setTranscript(freshData.segments);
      }
    } catch (err) {
      console.error("Error updating speaker names:", err);
      alert("Failed to update speaker names");
    }
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

  // Loading cached transcription
  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-primary animate-spin mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-1">
            Loading transcription
          </h3>
          <p className="text-sm text-muted-foreground">
            Checking for cached data...
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
          
          {/* Error message if transcription failed */}
          {error && (
            <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}
          
          <button
            onClick={() => handleGenerate(false)}
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
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleGenerate(true)}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-muted-foreground bg-secondary hover:bg-secondary/80 rounded-lg transition-colors"
            title="Regenerate transcription"
          >
            <RefreshCw className="w-4 h-4" />
            Regenerate
          </button>
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
      </div>

      {/* Editor + Assistant layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Transcript editor */}
        <div className="flex-1 overflow-auto">
          <TranscriptEditor
            segments={transcript}
            onUpdateSegment={handleUpdateSegment}
            onUpdateSpeaker={handleUpdateSpeaker}
          />
        </div>

        {/* AI Assistant panel */}
        {showAssistant && (
          <AIAssistantPanel
            onAction={handleAIAction}
            onClose={() => setShowAssistant(false)}
            speakerNames={speakerNames}
            onUpdateSpeakers={handleUpdateSpeakers}
          />
        )}
      </div>
    </div>
  );
};

export default TranscriptWorkspace;
