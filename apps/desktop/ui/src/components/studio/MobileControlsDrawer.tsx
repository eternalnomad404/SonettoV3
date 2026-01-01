import { X, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import CreationControls from "./CreationControls";

type Transcript = {
  id: string;
  name: string;
  date: string;
};

type ContentType = "linkedin" | "blog" | "magazine" | "social" | "custom";
type ToneType = "professional" | "casual" | "formal" | "friendly";
type LengthType = "short" | "medium" | "long";

type MobileControlsDrawerProps = {
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
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
};

const MobileControlsDrawer = ({
  transcripts,
  selectedTranscript,
  onSelectTranscript,
  onGenerate,
  isGenerating,
  isOpen,
  onOpenChange,
}: MobileControlsDrawerProps) => {
  const handleGenerate = (options: {
    contentType: ContentType;
    tone: ToneType;
    length: LengthType;
    customPrompt?: string;
  }) => {
    onGenerate(options);
    onOpenChange(false);
  };

  return (
    <Drawer open={isOpen} onOpenChange={onOpenChange}>
      <DrawerTrigger asChild>
        <Button
          variant="default"
          size="lg"
          className="md:hidden fixed bottom-4 left-4 right-4 z-30 gap-2 shadow-lg"
        >
          <Settings2 className="w-4 h-4" />
          Generate Options
        </Button>
      </DrawerTrigger>
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader className="flex items-center justify-between border-b border-border pb-4">
          <DrawerTitle>Create Content</DrawerTitle>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onOpenChange(false)}
            className="h-8 w-8"
          >
            <X className="h-4 w-4" />
          </Button>
        </DrawerHeader>
        <div className="overflow-auto max-h-[calc(85vh-80px)]">
          <CreationControls
            transcripts={transcripts}
            selectedTranscript={selectedTranscript}
            onSelectTranscript={onSelectTranscript}
            onGenerate={handleGenerate}
            isGenerating={isGenerating}
          />
        </div>
      </DrawerContent>
    </Drawer>
  );
};

export default MobileControlsDrawer;
