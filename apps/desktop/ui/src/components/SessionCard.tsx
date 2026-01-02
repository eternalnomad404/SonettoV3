import { FileAudio, FileVideo, Trash2, Clock, Calendar } from "lucide-react";

export type SessionStatus = "uploaded" | "processing" | "ready";

export type Session = {
  id: string;
  name: string;
  duration: string;
  uploadDate: string;
  status: SessionStatus;
  type: "audio" | "video";
  tags?: string[];
};

type SessionCardProps = {
  session: Session;
  onDelete?: (id: string) => void;
};

const statusConfig: Record<SessionStatus, { label: string; className: string }> = {
  uploaded: {
    label: "Uploaded",
    className: "bg-secondary text-muted-foreground",
  },
  processing: {
    label: "Processing",
    className: "bg-yellow-50 text-yellow-700 border border-yellow-200",
  },
  ready: {
    label: "Ready",
    className: "bg-primary/10 text-primary border border-primary/20",
  },
};

const SessionCard = ({ session, onDelete }: SessionCardProps) => {
  const status = statusConfig[session.status];
  const Icon = session.type === "audio" ? FileAudio : FileVideo;

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDelete && confirm(`Delete "${session.name}"?`)) {
      onDelete(session.id);
    }
  };

  return (
    <div className="group flex items-center gap-4 p-4 bg-card rounded-lg border border-border hover:border-primary/20 transition-colors sonetto-shadow">
      {/* Icon */}
      <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-secondary shrink-0">
        <Icon className="w-5 h-5 text-muted-foreground" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h4 className="text-sm font-medium text-foreground truncate">
            {session.name}
          </h4>
          {session.tags?.map((tag) => (
            <span
              key={tag}
              className="px-1.5 py-0.5 text-[10px] font-medium bg-secondary text-muted-foreground rounded"
            >
              {tag}
            </span>
          ))}
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {session.duration}
          </span>
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {session.uploadDate}
          </span>
        </div>
      </div>

      {/* Status badge */}
      <span
        className={`px-2.5 py-1 text-xs font-medium rounded-full ${status.className}`}
      >
        {status.label}
      </span>

      {/* Actions */}
      <button 
        onClick={handleDelete}
        className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-secondary rounded-md transition-colors opacity-0 group-hover:opacity-100"
        title="Delete session"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
};

export default SessionCard;
