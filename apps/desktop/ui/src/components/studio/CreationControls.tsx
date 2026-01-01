import { useState } from "react";
import { ChevronDown, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type ContentType = "linkedin" | "blog" | "magazine" | "social" | "custom";
type ToneType = "professional" | "casual" | "formal" | "friendly";
type LengthType = "short" | "medium" | "long";

type Transcript = {
  id: string;
  name: string;
  date: string;
};

type CreationControlsProps = {
  transcripts: Transcript[];
  selectedTranscript: Transcript | null;
  onSelectTranscript: (transcript: Transcript) => void;
  onGenerate: (options: {
    contentType: ContentType;
    tone: ToneType;
    length: LengthType;
    customPrompt?: string;
  }) => void;
  isGenerating: boolean;
};

const contentTypes: { id: ContentType; label: string; description: string }[] = [
  { id: "linkedin", label: "LinkedIn Post", description: "Professional network update" },
  { id: "blog", label: "Blog Article", description: "Long-form blog content" },
  { id: "magazine", label: "Magazine Feature", description: "Editorial-style article" },
  { id: "social", label: "Social Post", description: "Facebook / Twitter style" },
  { id: "custom", label: "Custom", description: "Define your own format" },
];

const tones: { id: ToneType; label: string }[] = [
  { id: "professional", label: "Professional" },
  { id: "casual", label: "Casual" },
  { id: "formal", label: "Formal" },
  { id: "friendly", label: "Friendly" },
];

const lengths: { id: LengthType; label: string; words: string }[] = [
  { id: "short", label: "Short", words: "~150 words" },
  { id: "medium", label: "Medium", words: "~400 words" },
  { id: "long", label: "Long", words: "~800 words" },
];

const CreationControls = ({
  transcripts,
  selectedTranscript,
  onSelectTranscript,
  onGenerate,
  isGenerating,
}: CreationControlsProps) => {
  const [contentType, setContentType] = useState<ContentType>("linkedin");
  const [tone, setTone] = useState<ToneType>("professional");
  const [length, setLength] = useState<LengthType>("medium");
  const [customPrompt, setCustomPrompt] = useState("");
  const [showTranscripts, setShowTranscripts] = useState(false);

  const handleGenerate = () => {
    onGenerate({
      contentType,
      tone,
      length,
      customPrompt: contentType === "custom" ? customPrompt : undefined,
    });
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-auto p-4 space-y-6">
        {/* Transcript Selection */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Source Transcript</label>
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowTranscripts(!showTranscripts)}
              className="w-full flex items-center justify-between px-3 py-2.5 bg-secondary rounded-lg text-sm text-left hover:bg-secondary/80 transition-colors"
            >
              <span className={selectedTranscript ? "text-foreground" : "text-muted-foreground"}>
                {selectedTranscript?.name || "Select a transcript..."}
              </span>
              <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${showTranscripts ? "rotate-180" : ""}`} />
            </button>
            
            {showTranscripts && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-lg z-10 max-h-48 overflow-auto">
                {transcripts.length === 0 ? (
                  <p className="px-3 py-2 text-sm text-muted-foreground">No transcripts available</p>
                ) : (
                  transcripts.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => {
                        onSelectTranscript(t);
                        setShowTranscripts(false);
                      }}
                      className="w-full px-3 py-2.5 text-left text-sm hover:bg-secondary transition-colors first:rounded-t-lg last:rounded-b-lg"
                    >
                      <p className="font-medium text-foreground truncate">{t.name}</p>
                      <p className="text-xs text-muted-foreground">{t.date}</p>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* Content Type */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Content Type</label>
          <div className="space-y-2">
            {contentTypes.map((type) => (
              <button
                key={type.id}
                type="button"
                onClick={() => setContentType(type.id)}
                className={`
                  w-full flex flex-col items-start px-4 py-3 rounded-lg border text-left transition-all
                  ${contentType === type.id
                    ? "border-primary bg-accent/50"
                    : "border-border bg-card hover:border-primary/30 hover:bg-secondary/30"
                  }
                `}
              >
                <span className={`text-sm font-medium ${contentType === type.id ? "text-primary" : "text-foreground"}`}>
                  {type.label}
                </span>
                <span className="text-xs text-muted-foreground mt-0.5">{type.description}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Custom Prompt (only for custom type) */}
        {contentType === "custom" && (
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Custom Instructions</label>
            <Textarea
              value={customPrompt}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setCustomPrompt(e.target.value)}
              placeholder="Describe the content format you want..."
              className="min-h-[80px] resize-none"
            />
          </div>
        )}

        {/* Tone */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Tone</label>
          <div className="flex flex-wrap gap-2">
            {tones.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTone(t.id)}
                className={`
                  px-3 py-1.5 rounded-full text-sm font-medium transition-colors
                  ${tone === t.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                  }
                `}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Length */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Length</label>
          <div className="grid grid-cols-3 gap-2">
            {lengths.map((l) => (
              <button
                key={l.id}
                type="button"
                onClick={() => setLength(l.id)}
                className={`
                  flex flex-col items-center px-3 py-3 rounded-lg border text-center transition-all
                  ${length === l.id
                    ? "border-primary bg-accent/50"
                    : "border-border bg-card hover:border-primary/30"
                  }
                `}
              >
                <span className={`text-sm font-medium ${length === l.id ? "text-primary" : "text-foreground"}`}>
                  {l.label}
                </span>
                <span className="text-[11px] text-muted-foreground mt-0.5">{l.words}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Generate Button */}
      <div className="shrink-0 p-4 border-t border-border">
        <Button
          onClick={handleGenerate}
          disabled={!selectedTranscript || isGenerating}
          className="w-full gap-2"
          size="lg"
        >
          <Sparkles className="w-4 h-4" />
          {isGenerating ? "Generating..." : "Generate Content"}
        </Button>
      </div>
    </div>
  );
};

export default CreationControls;
