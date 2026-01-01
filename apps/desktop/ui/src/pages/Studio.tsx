import { useState } from "react";
import AppSidebar from "@/components/AppSidebar";
import MobileHeader from "@/components/MobileHeader";
import MobileSidebar from "@/components/MobileSidebar";
import ContentEditor from "@/components/studio/ContentEditor";
import CreationControls from "@/components/studio/CreationControls";
import MobileControlsDrawer from "@/components/studio/MobileControlsDrawer";

type Transcript = {
  id: string;
  name: string;
  date: string;
};

type ContentType = "linkedin" | "blog" | "magazine" | "social" | "custom";
type ToneType = "professional" | "casual" | "formal" | "friendly";
type LengthType = "short" | "medium" | "long";

const mockTranscripts: Transcript[] = [
  { id: "1", name: "Q4 Planning Meeting Recording", date: "Dec 28, 2025" },
  { id: "2", name: "Interview - Sarah Johnson", date: "Dec 26, 2025" },
  { id: "3", name: "Product Demo - Enterprise Client", date: "Dec 27, 2025" },
];

const Studio = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isControlsDrawerOpen, setIsControlsDrawerOpen] = useState(false);
  const [selectedTranscript, setSelectedTranscript] = useState<Transcript | null>(null);
  const [content, setContent] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = (options: {
    contentType: ContentType;
    tone: ToneType;
    length: LengthType;
    customPrompt?: string;
  }) => {
    if (!selectedTranscript) return;

    setIsGenerating(true);
    
    // Simulate AI content generation
    setTimeout(() => {
      const generatedContent = generateMockContent(options.contentType, options.tone, options.length);
      setContent(generatedContent);
      setIsGenerating(false);
    }, 2000);
  };

  return (
    <div className="flex min-h-screen w-full bg-background">
      {/* Mobile Header */}
      <MobileHeader onMenuClick={() => setIsMobileMenuOpen(true)} />
      
      {/* Mobile Sidebar Drawer */}
      <MobileSidebar isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />
      
      {/* Desktop Fixed Sidebar */}
      <AppSidebar />

      {/* Main content - offset by sidebar width on desktop, padding top for mobile header */}
      <main className="flex-1 flex flex-col min-w-0 md:ml-56 h-screen pt-14 md:pt-0">
        {/* Page header */}
        <header className="sticky top-14 md:top-0 z-10 flex items-center justify-between px-4 md:px-8 py-4 md:py-6 border-b border-border bg-background shrink-0">
          <div>
            <h1 className="text-lg md:text-xl font-semibold text-foreground">Studio</h1>
            <p className="text-xs md:text-sm text-muted-foreground mt-0.5">
              Create content from your transcripts
            </p>
          </div>
        </header>

        {/* Content area - desktop: two columns, mobile: single column */}
        <div className="flex-1 flex min-h-0">
          {/* Main editor - full width on mobile, flex-1 on desktop */}
          <div className="flex-1 flex flex-col overflow-hidden border-r border-border md:border-r-0">
            <ContentEditor
              content={content}
              onChange={setContent}
              isGenerating={isGenerating}
            />
          </div>

          {/* Desktop Controls Panel - hidden on mobile */}
          <aside className="hidden md:flex w-80 lg:w-96 border-l border-border bg-card shrink-0 flex-col overflow-hidden">
            <div className="px-4 py-4 border-b border-border shrink-0">
              <h2 className="text-sm font-semibold text-foreground">Create Content</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Configure your output</p>
            </div>
            <div className="flex-1 min-h-0">
              <CreationControls
                transcripts={mockTranscripts}
                selectedTranscript={selectedTranscript}
                onSelectTranscript={setSelectedTranscript}
                onGenerate={handleGenerate}
                isGenerating={isGenerating}
              />
            </div>
          </aside>
        </div>

        {/* Mobile Controls Drawer */}
        <MobileControlsDrawer
          transcripts={mockTranscripts}
          selectedTranscript={selectedTranscript}
          onSelectTranscript={setSelectedTranscript}
          onGenerate={handleGenerate}
          isGenerating={isGenerating}
          isOpen={isControlsDrawerOpen}
          onOpenChange={setIsControlsDrawerOpen}
        />
      </main>
    </div>
  );
};

// Mock content generator
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function generateMockContent(contentType: ContentType, _tone: ToneType, _length: LengthType): string {
  const templates = {
    linkedin: `🚀 Exciting insights from our recent planning session!

We've been diving deep into our Q4 strategy, and I wanted to share some key takeaways that might resonate with your own planning process.

**Key Highlights:**

1. **Focus on customer value** - Every decision we make starts with asking "How does this benefit our customers?"

2. **Data-driven decisions** - We're leveraging analytics more than ever to guide our strategic choices.

3. **Team alignment** - Clear communication and shared goals are the foundation of execution.

The energy in our team is incredible, and I'm excited about what we're building together.

What strategies are you implementing for your end-of-year push? I'd love to hear your thoughts! 👇

#Leadership #Strategy #Q4Planning #BusinessGrowth`,

    blog: `# Transforming Meeting Insights into Action: A Q4 Strategy Deep Dive

In today's fast-paced business environment, the ability to quickly translate meeting discussions into actionable strategies can make the difference between success and stagnation. Our recent Q4 planning session offered valuable insights that I believe can benefit organizations of any size.

## The Power of Structured Planning

When we gathered our leadership team for our quarterly planning session, we approached it with a clear framework in mind. Rather than allowing discussions to meander, we structured our time around three core pillars:

### 1. Customer-Centricity

Every initiative we considered was filtered through a simple but powerful question: "How does this create value for our customers?" This approach helped us quickly identify which projects deserved priority and which could wait.

### 2. Data-Informed Decision Making

Gone are the days of making strategic choices based purely on intuition. We reviewed our key metrics, analyzed trends, and used this information to validate our assumptions about market direction.

### 3. Team Alignment and Communication

Perhaps most importantly, we focused on ensuring everyone left the room with a shared understanding of our goals and their role in achieving them.

## Looking Ahead

As we move into the final quarter of the year, these principles will guide our execution. The real work begins now, and I'm confident our team is prepared for the challenge ahead.`,

    magazine: `THE ART OF STRATEGIC PLANNING IN THE MODERN ENTERPRISE

A behind-the-scenes look at how leading organizations are reimagining their approach to quarterly planning.

—

The conference room buzzes with energy. Laptops open, whiteboards covered in colorful diagrams, and a team of executives engaged in what might be the most important conversation of their quarter. Welcome to the new era of strategic planning.

"We've moved beyond the traditional top-down approach," explains one senior leader. "Today's planning sessions are collaborative, data-rich, and focused on rapid iteration."

This shift reflects a broader transformation in how successful organizations operate. In an environment where market conditions can change overnight, the ability to plan effectively while remaining adaptable has become a crucial competitive advantage.

The session we observed followed a carefully designed structure, balancing free-flowing discussion with rigorous analysis. Participants moved fluidly between big-picture strategy and tactical implementation details, always returning to a central question: What value are we creating?

—

This feature continues on page 24...`,

    social: `Just wrapped up an incredible Q4 planning session with the team! 🎯

Key takeaways:
✅ Customer value comes first
✅ Data drives decisions  
✅ Team alignment is everything

Excited for what's ahead! Who else is deep in planning mode right now?

#Business #Planning #TeamWork`,

    custom: `Your custom content has been generated based on the transcript analysis.

This content follows your specific instructions while maintaining the key themes and insights from the source material.

The transcript has been analyzed for:
- Main topics and themes
- Key quotes and statements
- Action items and conclusions

You can now edit this content to better fit your needs.`,
  };

  return templates[contentType] || templates.custom;
}

export default Studio;
