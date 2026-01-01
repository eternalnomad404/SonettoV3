import { useState } from "react";
import { X, Sparkles, Send, Eraser, Type, Minimize2, MessageSquare } from "lucide-react";

type AIAssistantPanelProps = {
  onAction: (action: string) => void;
  onClose: () => void;
};

const quickActions = [
  { id: "clean", label: "Clean transcript", icon: Eraser, description: "Remove filler words and false starts" },
  { id: "grammar", label: "Fix grammar", icon: Type, description: "Correct grammatical errors" },
  { id: "shorten", label: "Shorten", icon: Minimize2, description: "Make text more concise" },
  { id: "clarity", label: "Improve clarity", icon: MessageSquare, description: "Enhance readability" },
];

const AIAssistantPanel = ({ onAction, onClose }: AIAssistantPanelProps) => {
  const [customPrompt, setCustomPrompt] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const handleQuickAction = (actionId: string) => {
    setIsProcessing(true);
    onAction(actionId);
    // Simulate processing
    setTimeout(() => setIsProcessing(false), 1500);
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (customPrompt.trim()) {
      setIsProcessing(true);
      onAction(customPrompt);
      setCustomPrompt("");
      setTimeout(() => setIsProcessing(false), 1500);
    }
  };

  return (
    <aside className="w-72 border-l border-border bg-card flex flex-col shrink-0">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <h4 className="text-sm font-medium text-foreground">AI Assistant</h4>
        </div>
        <button
          onClick={onClose}
          className="p-1 text-muted-foreground hover:text-foreground hover:bg-secondary rounded transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Quick actions */}
      <div className="flex-1 overflow-auto p-4">
        <p className="text-xs text-muted-foreground mb-3">Quick actions</p>
        <div className="space-y-2">
          {quickActions.map((action) => (
            <button
              key={action.id}
              onClick={() => handleQuickAction(action.id)}
              disabled={isProcessing}
              className="w-full flex items-start gap-3 p-3 text-left bg-background border border-border rounded-lg hover:border-primary/30 hover:bg-accent/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                <action.icon className="w-4 h-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{action.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{action.description}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Custom prompt input */}
      <div className="p-4 border-t border-border">
        <form onSubmit={handleCustomSubmit}>
          <p className="text-xs text-muted-foreground mb-2">Custom instruction</p>
          <div className="relative">
            <textarea
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder="e.g., Summarize key points..."
              disabled={isProcessing}
              className="w-full h-20 p-3 pr-10 text-sm bg-background border border-input rounded-lg resize-none placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!customPrompt.trim() || isProcessing}
              className="absolute right-2 bottom-2 p-1.5 text-primary hover:bg-accent rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>

      {/* Processing indicator */}
      {isProcessing && (
        <div className="px-4 py-2 bg-accent border-t border-border">
          <p className="text-xs text-accent-foreground animate-pulse">
            Processing transcript...
          </p>
        </div>
      )}
    </aside>
  );
};

export default AIAssistantPanel;
