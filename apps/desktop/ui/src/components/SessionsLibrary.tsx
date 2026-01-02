import { useState, useEffect } from "react";
import { Search, SlidersHorizontal, ChevronDown } from "lucide-react";
import SessionCard from "./SessionCard";
import type { Session } from "./SessionCard";
import { fetchSessions, formatDuration, formatDate, deleteSession } from "@/lib/api";
import type { Session as APISession } from "@/lib/api";

type SortOption = "date" | "name" | "duration";
type FilterOption = "all" | "ready" | "processing" | "uploaded";

const SessionsLibrary = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("date");
  const [filterBy, setFilterBy] = useState<FilterOption>("all");
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch sessions from backend
  const loadSessions = async () => {
    try {
      setLoading(true);
      const apiSessions = await fetchSessions();
      
      // Transform API sessions to frontend format
      const transformedSessions: Session[] = apiSessions.map((s: APISession) => ({
        id: s.id,
        name: s.title,
        duration: formatDuration(s.duration_seconds),
        uploadDate: formatDate(s.created_at),
        status: s.status as "ready" | "processing" | "uploaded",
        type: s.session_type === "video" || s.original_file_path?.includes('.mp4') ? "video" : "audio",
        tags: s.session_type ? [s.session_type] : undefined,
      }));
      
      setSessions(transformedSessions);
      setError(null);
    } catch (err) {
      console.error("Failed to load sessions:", err);
      setError("Failed to load sessions from backend");
    } finally {
      setLoading(false);
    }
  };

  // Handle delete
  const handleDelete = async (id: string) => {
    try {
      await deleteSession(id);
      await loadSessions(); // Refresh the list
    } catch (err) {
      console.error("Failed to delete session:", err);
      alert("Failed to delete session");
    }
  };

  // Fetch sessions on mount
  useEffect(() => {
    loadSessions();
  }, []);

  const filteredSessions = sessions.filter((session) => {
    const matchesSearch = session.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesFilter = filterBy === "all" || session.status === filterBy;
    return matchesSearch && matchesFilter;
  });

  const sortedSessions = [...filteredSessions].sort((a, b) => {
    switch (sortBy) {
      case "name":
        return a.name.localeCompare(b.name);
      case "duration":
        return a.duration.localeCompare(b.duration);
      default:
        return 0; // Keep original order for date (already sorted)
    }
  });

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-foreground">
          Sessions
          <span className="ml-2 text-sm font-normal text-muted-foreground">
            ({filteredSessions.length})
          </span>
        </h2>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-4">
        {/* Search */}
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search sessions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-9 pl-9 pr-3 text-sm bg-background border border-input rounded-lg placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
          />
        </div>

        {/* Sort dropdown */}
        <div className="relative">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="h-9 pl-3 pr-8 text-sm bg-background border border-input rounded-lg appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
          >
            <option value="date">Sort by date</option>
            <option value="name">Sort by name</option>
            <option value="duration">Sort by duration</option>
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        </div>

        {/* Filter dropdown */}
        <div className="relative">
          <select
            value={filterBy}
            onChange={(e) => setFilterBy(e.target.value as FilterOption)}
            className="h-9 pl-3 pr-8 text-sm bg-background border border-input rounded-lg appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
          >
            <option value="all">All status</option>
            <option value="ready">Ready</option>
            <option value="processing">Processing</option>
            <option value="uploaded">Uploaded</option>
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        </div>

        {/* Filters button */}
        <button className="flex items-center gap-2 h-9 px-3 text-sm text-muted-foreground bg-background border border-input rounded-lg hover:bg-secondary transition-colors">
          <SlidersHorizontal className="w-4 h-4" />
          <span className="hidden sm:inline">Filters</span>
        </button>
      </div>

      {/* Sessions list */}
      <div className="space-y-2">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-sm text-muted-foreground">Loading sessions...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-sm text-red-500">{error}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Make sure the backend is running at http://localhost:8000
            </p>
          </div>
        ) : sortedSessions.length > 0 ? (
          sortedSessions.map((session) => (
            <SessionCard key={session.id} session={session} onDelete={handleDelete} />
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-sm text-muted-foreground">
              {searchQuery ? "No sessions match your search" : "No sessions yet"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Upload your first recording to get started
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SessionsLibrary;
