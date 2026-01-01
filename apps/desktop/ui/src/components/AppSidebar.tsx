import { Mic, FileText, Wand2 } from "lucide-react";
import { useLocation, Link } from "react-router-dom";
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

const AppSidebar = () => {
  const location = useLocation();

  return (
    <aside className="hidden md:flex fixed left-0 top-0 bottom-0 flex-col w-56 h-screen bg-sidebar border-r border-sidebar-border z-50">
      {/* Logo area */}
      <div className="px-5 py-6 border-b border-sidebar-border">
        <SonettoLogo />
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 overflow-hidden">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <li key={item.id}>
                <Link
                  to={item.path}
                  className={`
                    w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                    transition-colors duration-150
                    ${
                      isActive
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                    }
                  `}
                >
                  <item.icon
                    className={`w-4 h-4 ${
                      isActive ? "text-primary" : "text-muted-foreground"
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

      {/* Footer - User profile, fixed at bottom */}
      <div className="px-5 py-4 border-t border-sidebar-border mt-auto">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center shrink-0">
            <span className="text-xs font-medium text-secondary-foreground">JD</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">Jane Doe</p>
            <p className="text-xs text-muted-foreground truncate">Workspace</p>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default AppSidebar;
