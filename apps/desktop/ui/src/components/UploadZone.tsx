import { useState, useRef, useCallback } from "react";
import { Upload, FileAudio, FileVideo, Check, Loader2 } from "lucide-react";

type UploadState = "idle" | "dragging" | "uploading" | "success";

type UploadedFile = {
  name: string;
  size: number;
  type: string;
  progress: number;
  status: "uploading" | "processing" | "ready";
};

type UploadZoneProps = {
  onFileUploaded?: (file: UploadedFile) => void;
};

const UploadZone = ({ onFileUploaded }: UploadZoneProps) => {
  const [state, setState] = useState<UploadState>("idle");
  const [uploadingFile, setUploadingFile] = useState<UploadedFile | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setState("dragging");
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setState("idle");
  }, []);

  const simulateUpload = useCallback(
    (file: File) => {
      const uploadedFile: UploadedFile = {
        name: file.name,
        size: file.size,
        type: file.type,
        progress: 0,
        status: "uploading",
      };

      setUploadingFile(uploadedFile);
      setState("uploading");

      // Simulate upload progress
      let progress = 0;
      const interval = setInterval(() => {
        progress += Math.random() * 15 + 5;
        if (progress >= 100) {
          progress = 100;
          clearInterval(interval);
          
          const completedFile = { ...uploadedFile, progress: 100, status: "ready" as const };
          setUploadingFile(completedFile);
          setState("success");
          
          setTimeout(() => {
            onFileUploaded?.(completedFile);
            setState("idle");
            setUploadingFile(null);
          }, 1500);
        } else {
          setUploadingFile((prev) =>
            prev ? { ...prev, progress } : null
          );
        }
      }, 200);
    },
    [onFileUploaded]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const files = Array.from(e.dataTransfer.files);
      const mediaFile = files.find(
        (f) => f.type.startsWith("audio/") || f.type.startsWith("video/")
      );

      if (mediaFile) {
        simulateUpload(mediaFile);
      } else {
        setState("idle");
      }
    },
    [simulateUpload]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        simulateUpload(file);
      }
    },
    [simulateUpload]
  );

  const handleClick = () => {
    if (state === "idle") {
      fileInputRef.current?.click();
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div
      onClick={handleClick}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`
        relative flex flex-col items-center justify-center
        w-full min-h-[280px] p-8
        rounded-xl border-2 border-dashed
        transition-all duration-200 cursor-pointer
        ${
          state === "dragging"
            ? "bg-upload-zone-hover border-upload-zone-border-active"
            : state === "uploading" || state === "success"
            ? "bg-upload-zone border-upload-zone-border cursor-default"
            : "bg-upload-zone border-upload-zone-border hover:border-upload-zone-border-active hover:bg-upload-zone-hover"
        }
      `}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*,video/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      {state === "idle" && (
        <>
          <div className="flex items-center justify-center w-14 h-14 rounded-full bg-secondary mb-4">
            <Upload className="w-6 h-6 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium text-foreground mb-1">
            Upload a session recording
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            Drag and drop your audio or video file here
          </p>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <FileAudio className="w-3.5 h-3.5" />
              Audio
            </span>
            <span className="flex items-center gap-1.5">
              <FileVideo className="w-3.5 h-3.5" />
              Video
            </span>
          </div>
          <button className="mt-6 px-5 py-2.5 text-sm font-medium text-primary-foreground bg-primary rounded-md hover:bg-primary/90 transition-colors">
            Browse files
          </button>
        </>
      )}

      {state === "dragging" && (
        <>
          <div className="flex items-center justify-center w-14 h-14 rounded-full bg-accent mb-4">
            <Upload className="w-6 h-6 text-accent-foreground" />
          </div>
          <h3 className="text-lg font-medium text-accent-foreground">
            Drop your file here
          </h3>
        </>
      )}

      {(state === "uploading" || state === "success") && uploadingFile && (
        <div className="w-full max-w-sm">
          <div className="flex items-start gap-3 mb-4">
            <div
              className={`flex items-center justify-center w-10 h-10 rounded-lg ${
                state === "success" ? "bg-accent" : "bg-secondary"
              }`}
            >
              {state === "success" ? (
                <Check className="w-5 h-5 text-primary" />
              ) : (
                <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {uploadingFile.name}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatFileSize(uploadingFile.size)}
              </p>
            </div>
            <span
              className={`text-xs font-medium ${
                state === "success" ? "text-primary" : "text-muted-foreground"
              }`}
            >
              {state === "success" ? "Ready" : `${Math.round(uploadingFile.progress)}%`}
            </span>
          </div>

          {/* Progress bar */}
          <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-200 rounded-full"
              style={{ width: `${uploadingFile.progress}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default UploadZone;
