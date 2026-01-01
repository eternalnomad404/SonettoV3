type ContentEditorProps = {
  content: string;
  onChange: (content: string) => void;
  isGenerating: boolean;
};

export default function ContentEditor({ content, onChange, isGenerating }: ContentEditorProps) {
  return (
    <div className="flex flex-col h-full bg-background">
      {/* Editor Area */}
      <div className="flex-1 p-6 overflow-auto">
        <textarea
          className="w-full h-full resize-none border-none outline-none text-base leading-relaxed bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none"
          placeholder="Start writing your content..."
          value={content}
          onChange={(e) => onChange(e.target.value)}
          disabled={isGenerating}
        />
      </div>
    </div>
  );
}
