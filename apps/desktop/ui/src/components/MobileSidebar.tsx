import { X, Mic, FileText, Wand2 } from "lucide-react";
import { useLocation, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import SonettoLogo from "./SonettoLogo";

type NavItem = {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
};

const navItems: NavItem[] = [
  { id: "sessions", label: "Sessions", icon: Mic, path: "/" },
  { id: "transcripts", label: "Transcripts", icon: FileText, path: "/transcripts" },
  { id: "studio", label: "Studio", icon: Wand2, path: "/studio" },
];

type MobileSidebarProps = {
  isOpen: boolean;
  onClose: () => void;
};

const MobileSidebar = ({ isOpen, onClose }: MobileSidebarProps) => {
  const location = useLocation();

  return (
    <>
      {/* Backdrop */}
      <div
        className={`md:hidden fixed inset-0 z-40 bg-black/50 transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-in drawer */}
      <aside className={`md:hidden fixed left-0 top-0 bottom-0 z-50 w-64 bg-white border-r border-gray-200 shadow-xl flex flex-col transition-transform duration-300 ease-in-out ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        {/* Header with close button - exact same padding as MobileHeader */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 shrink-0 bg-white">
          <SonettoLogo />
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8"
            aria-label="Close menu"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 overflow-y-auto bg-white">
          <ul className="space-y-1">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <li key={item.id}>
                  <Link
                    to={item.path}
                    onClick={onClose}
                    className={`
                      w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium
                      transition-colors duration-150
                      ${
                        isActive
                          ? "bg-pink-50 text-primary"
                          : "text-gray-700 hover:bg-gray-50"
                      }
                    `}
                  >
                    <item.icon
                      className={`w-5 h-5 ${
                        isActive ? "text-primary" : "text-gray-500"
                      }`}
                    />
                    <span>{item.label}</span>
                    {isActive && (
                      <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Footer - User profile */}
        <div className="px-5 py-4 border-t border-gray-200 mt-auto shrink-0 bg-white">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
              <span className="text-xs font-medium text-gray-700">JD</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">Jane Doe</p>
              <p className="text-xs text-gray-500 truncate">Workspace</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

export default MobileSidebar;
