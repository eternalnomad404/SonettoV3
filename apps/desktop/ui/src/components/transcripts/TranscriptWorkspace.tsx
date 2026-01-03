import { useState, useEffect, useCallback, useMemo } from "react";
import { Play, Loader2, FileText, Sparkles, RefreshCw, Copy } from "lucide-react";
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

  // Dynamically calculate all unique speakers - use useMemo to prevent recalculation
  const allUniqueSpeakers = useMemo(() => {
    if (!transcript) return new Set<string>();
    return new Set(transcript.map((seg) => seg.speaker));
  }, [transcript]);

  // Update speaker names only when transcript speakers actually change
  useEffect(() => {
    if (!transcript || allUniqueSpeakers.size === 0) return;

    // Check if we need to add any new speakers
    let hasNewSpeakers = false;
    const mergedSpeakers: Record<string, string> = { ...speakerNames };
    
    allUniqueSpeakers.forEach((speaker) => {
      if (!mergedSpeakers[speaker]) {
        mergedSpeakers[speaker] = speaker;
        hasNewSpeakers = true;
      }
    });
    
    // Only update if there are actually new speakers
    if (hasNewSpeakers) {
      setSpeakerNames(mergedSpeakers);
    }
  }, [allUniqueSpeakers]);

  // Auto-load cached transcription when recording changes
  useEffect(() => {
    let isMounted = true;
    
    const loadCachedTranscription = async () => {
      if (!recording) {
        // Batch all state updates together
        if (isMounted) {
          setTranscript(null);
          setSpeakerNames({});
          setError(null);
          setShowAssistant(false);
          setIsLoading(false);
        }
        return;
      }

      try {
        // Start fetching immediately without showing loading state
        const cachedTranscription = await getTranscription(recording.id);
        
        if (!isMounted) return;
        
        if (cachedTranscription) {
          // Batch all state updates in a single render cycle
          setTranscript(cachedTranscription.segments);
          setSpeakerNames(cachedTranscription.speaker_names || {});
          setError(null);
          setIsLoading(false);
          
          // Notify parent that this recording has a transcription
          if (onTranscriptionStatusChange) {
            onTranscriptionStatusChange(recording.id, "ready");
          }
        } else {
          // Batch state updates for no transcript case
          setTranscript(null);
          setSpeakerNames({});
          setError(null);
          setIsLoading(false);
        }
      } catch (err) {
        if (!isMounted) return;
        
        console.error("Error loading cached transcription:", err);
        // Batch error state updates
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

  const handleUpdateSegment = useCallback((id: string, newText: string) => {
    setTranscript((prev) =>
      prev?.map((seg) => (seg.id === id ? { ...seg, text: newText } : seg)) ?? null
    );
  }, []);

  const handleUpdateSpeaker = useCallback(async (segmentId: string, newSpeaker: string) => {
    if (!recording) return;

    const segmentIndex = transcript?.findIndex((seg) => seg.id === segmentId);
    if (segmentIndex === undefined || segmentIndex === -1) return;

    try {
      await updateSegmentSpeaker(recording.id, segmentIndex, newSpeaker);
      
      // Batch state updates
      setTranscript((prev) =>
        prev?.map((seg) => (seg.id === segmentId ? { ...seg, speaker: newSpeaker } : seg)) ?? null
      );
      
      setSpeakerNames((prev) => {
        if (!prev[newSpeaker]) {
          return { ...prev, [newSpeaker]: newSpeaker };
        }
        return prev;
      });
    } catch (err) {
      console.error("Error updating segment speaker:", err);
      alert("Failed to update speaker name");
    }
  }, [recording, transcript]);

  const handleUpdateSpeakers = useCallback(async (newSpeakerNames: Record<string, string>) => {
    if (!recording) return;

    try {
      await updateSpeakerNames(recording.id, newSpeakerNames);
      
      // Reload transcript to get updated speaker names
      const freshData = await getTranscription(recording.id);
      if (freshData) {
        // Batch both updates
        setTranscript(freshData.segments);
        setSpeakerNames(newSpeakerNames);
      }
    } catch (err) {
      console.error("Error updating speaker names:", err);
      alert("Failed to update speaker names");
    }
  }, [recording]);

  const handleAIAction = useCallback((action: string) => {
    console.log("AI Action:", action);
    // In a real app, this would call an AI endpoint
  }, []);

  const handleCopyTranscript = useCallback(async () => {
    if (!transcript || !recording) return;

    try {
      // Format transcript in a clean, readable way
      const formattedTranscript = transcript
        .map((segment) => {
          const speakerName = segment.speaker;
          const timestamp = segment.timestamp;
          const text = segment.text;
          
          return `${speakerName} [${timestamp}]\n${text}`;
        })
        .join("\n\n");

      // Add header with recording name
      const fullText = `Transcript: ${recording.name}\n${"-".repeat(50)}\n\n${formattedTranscript}`;

      await navigator.clipboard.writeText(fullText);
      
      // Optional: Show a brief success feedback
      alert("Transcript copied to clipboard!");
    } catch (err) {
      console.error("Failed to copy transcript:", err);
      alert("Failed to copy transcript. Please try again.");
    }
  }, [transcript, recording]);

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
            className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white rounded-lg transition-all hover:opacity-90"
            style={{ backgroundColor: '#7E2A5A' }}
            title="Regenerate transcription"
          >
            <RefreshCw className="w-4 h-4" />
            Regenerate
          </button>
          <button
            onClick={handleCopyTranscript}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white rounded-lg transition-all hover:opacity-90"
            style={{ backgroundColor: '#7E2A5A' }}
            title="Copy transcript"
          >
            <Copy className="w-4 h-4" />
            Copy
          </button>
          <button
            onClick={() => setShowAssistant(!showAssistant)}
            className={`inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg transition-all ${
              showAssistant ? "opacity-90" : "hover:opacity-90"
            }`}
            style={{ backgroundColor: '#7E2A5A', color: 'white' }}
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
