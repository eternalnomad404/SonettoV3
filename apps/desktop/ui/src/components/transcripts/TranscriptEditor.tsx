import { useState } from "react";
import { User, Edit2, Check, X as XIcon } from "lucide-react";

type TranscriptSegment = {
  id: string;
  speaker: string;
  timestamp: string;
  text: string;
};

type TranscriptEditorProps = {
  segments: TranscriptSegment[] | null;
  onUpdateSegment: (id: string, newText: string) => void;
  onUpdateSpeaker: (segmentId: string, newSpeaker: string) => void;
};

const TranscriptEditor = ({ segments, onUpdateSegment, onUpdateSpeaker }: TranscriptEditorProps) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [editingSpeakerId, setEditingSpeakerId] = useState<string | null>(null);
  const [speakerEditValue, setSpeakerEditValue] = useState("");

  const handleStartEdit = (segment: TranscriptSegment) => {
    setEditingId(segment.id);
    setEditValue(segment.text);
  };

  const handleSaveEdit = () => {
    if (editingId) {
      onUpdateSegment(editingId, editValue);
      setEditingId(null);
      setEditValue("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSaveEdit();
    }
    if (e.key === "Escape") {
      setEditingId(null);
      setEditValue("");
    }
  };

  const handleStartEditSpeaker = (segment: TranscriptSegment) => {
    setEditingSpeakerId(segment.id);
    setSpeakerEditValue(segment.speaker);
  };

  const handleSaveSpeaker = () => {
    if (editingSpeakerId && speakerEditValue.trim()) {
      onUpdateSpeaker(editingSpeakerId, speakerEditValue.trim());
      setEditingSpeakerId(null);
      setSpeakerEditValue("");
    }
  };

  const handleCancelSpeakerEdit = () => {
    setEditingSpeakerId(null);
    setSpeakerEditValue("");
  };

  const handleSpeakerKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSaveSpeaker();
    }
    if (e.key === "Escape") {
      handleCancelSpeakerEdit();
    }
  };

  // Cancel edit when clicking outside (blur event)
  const handleSpeakerBlur = () => {
    // Small delay to allow check button click to register first
    setTimeout(() => {
      handleCancelSpeakerEdit();
    }, 150);
  };

  if (!segments) return null;

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="space-y-4">
        {segments.map((segment) => {
          const isEditing = editingId === segment.id;
          const isEditingSpeaker = editingSpeakerId === segment.id;

          return (
            <div
              key={segment.id}
              className="group relative"
            >
              {/* Speaker and timestamp */}
              <div className="flex items-center gap-2 mb-2">
                {isEditingSpeaker ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={speakerEditValue}
                      onChange={(e) => setSpeakerEditValue(e.target.value)}
                      onKeyDown={handleSpeakerKeyDown}
                      onBlur={handleSpeakerBlur}
                      autoFocus
                      className="px-2 py-1 text-sm font-medium bg-accent border border-primary/20 rounded focus:outline-none focus:ring-2 focus:ring-ring"
                      style={{ color: '#7E2A5A' }}
                    />
                    <button
                      onMouseDown={(e) => {
                        e.preventDefault(); // Prevent blur event
                        handleSaveSpeaker();
                      }}
                      className="p-1 text-primary hover:bg-accent rounded transition-colors"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onMouseDown={(e) => {
                        e.preventDefault(); // Prevent blur event
                        handleCancelSpeakerEdit();
                      }}
                      className="p-1 text-muted-foreground hover:bg-secondary rounded transition-colors"
                    >
                      <XIcon className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div
                    className="flex items-center gap-1.5 text-sm font-medium cursor-pointer hover:bg-secondary/50 px-2 py-1 rounded transition-colors group/speaker"
                    style={{ color: '#7E2A5A' }}
                    onClick={() => handleStartEditSpeaker(segment)}
                  >
                    <User className="w-4 h-4" />
                    {segment.speaker}
                    <Edit2 className="w-3 h-3 opacity-0 group-hover/speaker:opacity-100 transition-opacity ml-1" />
                  </div>
                )}
                <span className="text-xs text-muted-foreground">
                  {segment.timestamp}
                </span>
              </div>

              {/* Text content */}
              {isEditing ? (
                <textarea
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onBlur={handleSaveEdit}
                  autoFocus
                  className="w-full p-3 text-sm leading-relaxed bg-accent border border-primary/20 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                  rows={3}
                />
              ) : (
                <p
                  onClick={() => handleStartEdit(segment)}
                  className="text-sm leading-relaxed text-foreground p-3 rounded-lg cursor-text hover:bg-secondary/50 transition-colors"
                >
                  {segment.text}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Editor hint */}
      <p className="text-center text-xs text-muted-foreground mt-8">
        Click any text to edit • Click speaker names to rename • Press Enter to save • Escape to cancel
      </p>
    </div>
  );
};

export default TranscriptEditor;
