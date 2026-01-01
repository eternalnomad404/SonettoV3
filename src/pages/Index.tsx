import { useState } from "react";
import AppSidebar from "@/components/AppSidebar";
import MobileHeader from "@/components/MobileHeader";
import MobileSidebar from "@/components/MobileSidebar";
import UploadZone from "@/components/UploadZone";
import SessionsLibrary from "@/components/SessionsLibrary";

const Index = () => {
  const [, setUploadedFiles] = useState<string[]>([]);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleFileUploaded = (file: { name: string }) => {
    setUploadedFiles((prev) => [...prev, file.name]);
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
      <main className="flex-1 flex flex-col min-w-0 md:ml-56 pt-14 md:pt-0">
        {/* Page header */}
        <header className="sticky top-14 md:top-0 z-10 flex items-center justify-between px-4 md:px-8 py-4 md:py-6 border-b border-border bg-background">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Sessions</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Upload and organize your recordings
            </p>
          </div>
        </header>

        {/* Scrollable content area */}
        <div className="flex-1 px-4 md:px-8 py-4 md:py-6 overflow-auto">
          <div className="max-w-4xl mx-auto space-y-6 md:space-y-8">
            {/* Upload zone */}
            <section>
              <UploadZone onFileUploaded={handleFileUploaded} />
            </section>

            {/* Sessions library */}
            <section>
              <SessionsLibrary />
            </section>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
