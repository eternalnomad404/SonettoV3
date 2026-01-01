import { useState } from "react";
import { User } from "lucide-react";

type TranscriptSegment = {
  id: string;
  speaker: string;
  timestamp: string;
  text: string;
};

type TranscriptEditorProps = {
  segments: TranscriptSegment[] | null;
  onUpdateSegment: (id: string, newText: string) => void;
};

const speakerColors: Record<string, string> = {
  "Sarah Johnson": "text-primary",
  "Michael Chen": "text-primary",
  "Emily Rodriguez": "text-primary",
};

const TranscriptEditor = ({ segments, onUpdateSegment }: TranscriptEditorProps) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

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

  if (!segments) return null;

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="space-y-4">
        {segments.map((segment) => {
          const isEditing = editingId === segment.id;
          const colorClass = speakerColors[segment.speaker] || "bg-secondary text-secondary-foreground";

          return (
            <div
              key={segment.id}
              className="group relative"
            >
              {/* Speaker and timestamp */}
              <div className="flex items-center gap-2 mb-2">
                <div className={`flex items-center gap-1.5 text-sm font-medium ${colorClass}`}>
                  <User className="w-4 h-4" />
                  {segment.speaker}
                </div>
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
        Click any text to edit • Press Enter to save • Escape to cancel
      </p>
    </div>
  );
};

export default TranscriptEditor;
