import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import SonettoLogo from "./SonettoLogo";

type MobileHeaderProps = {
  onMenuClick: () => void;
};

const MobileHeader = ({ onMenuClick }: MobileHeaderProps) => {
  return (
    <header className="md:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 py-3 border-b border-border bg-background">
      <SonettoLogo />
      <Button
        variant="ghost"
        size="icon"
        onClick={onMenuClick}
        className="h-9 w-9"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </Button>
    </header>
  );
};

export default MobileHeader;
