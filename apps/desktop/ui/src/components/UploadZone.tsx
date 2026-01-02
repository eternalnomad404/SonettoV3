import { useState, useRef, useCallback } from "react";
import { Upload, FileAudio, FileVideo, Check, Loader2, AlertCircle } from "lucide-react";
import { uploadSession } from "@/lib/api";

type UploadState = "idle" | "dragging" | "uploading" | "success" | "error";
type UploadedFile = {
  name: string;
  size: number;
  type: string;
  progress: number;
  status: "uploading" | "processing" | "ready";
};
type UploadZoneProps = {
  onFileUploaded?: () => void;
};

const UploadZone = ({ onFileUploaded }: UploadZoneProps) => {
  const [state, setState] = useState<UploadState>("idle");
  const [uploadingFile, setUploadingFile] = useState<UploadedFile | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>("");
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

  const handleUpload = useCallback(
    async (file: File) => {
      const uploadedFile: UploadedFile = {
        name: file.name,
        size: file.size,
        type: file.type,
        progress: 0,
        status: "uploading",
      };

      setUploadingFile(uploadedFile);
      setState("uploading");
      setErrorMessage("");

      try {
        const progressInterval = setInterval(() => {
          setUploadingFile((prev) => {
            if (!prev || prev.progress >= 90) return prev;
            return { ...prev, progress: prev.progress + Math.random() * 10 };
          });
        }, 300);

        const response = await uploadSession(file, file.name.replace(/\.[^/.]+$/, ""));
        clearInterval(progressInterval);

        if (response.status === "ready") {
          const completedFile = { ...uploadedFile, progress: 100, status: "ready" as const };
          setUploadingFile(completedFile);
          setState("success");
          
          setTimeout(() => {
            onFileUploaded?.();
            setState("idle");
            setUploadingFile(null);
          }, 1500);
        } else {
          throw new Error("Upload failed - audio extraction unsuccessful");
        }
      } catch (error) {
        console.error("Upload error:", error);
        setErrorMessage(error instanceof Error ? error.message : "Upload failed");
        setState("error");
        setTimeout(() => {
          setState("idle");
          setUploadingFile(null);
          setErrorMessage("");
        }, 3000);
      }
    },
    [onFileUploaded]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const files = Array.from(e.dataTransfer.files);
      const mediaFile = files.find((f) => f.type.startsWith("audio/") || f.type.startsWith("video/"));
      if (mediaFile) {
        handleUpload(mediaFile);
      } else {
        setState("idle");
      }
    },
    [handleUpload]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handleUpload(file);
      }
    },
    [handleUpload]
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
      className={`relative flex flex-col items-center justify-center w-full min-h-[280px] p-8 rounded-xl border-2 border-dashed transition-all duration-200 cursor-pointer ${
        state === "dragging"
          ? "bg-upload-zone-hover border-upload-zone-border-active"
          : state === "uploading" || state === "success" || state === "error"
          ? "bg-upload-zone border-upload-zone-border cursor-default"
          : "bg-upload-zone border-upload-zone-border hover:border-upload-zone-border-active hover:bg-upload-zone-hover"
      }`}
    >
      <input ref={fileInputRef} type="file" accept="audio/*,video/*" onChange={handleFileSelect} className="hidden" />

      {state === "idle" && (
        <>
          <div className="flex items-center justify-center w-14 h-14 rounded-full bg-secondary mb-4">
            <Upload className="w-6 h-6 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium text-foreground mb-1">Upload a session recording</h3>
          <p className="text-sm text-muted-foreground mb-4">Drag and drop your audio or video file here</p>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <FileAudio className="w-3.5 h-3.5" />Audio
            </span>
            <span className="flex items-center gap-1.5">
              <FileVideo className="w-3.5 h-3.5" />Video
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
          <h3 className="text-lg font-medium text-accent-foreground">Drop your file here</h3>
        </>
      )}

      {(state === "uploading" || state === "success" || state === "error") && uploadingFile && (
        <div className="w-full max-w-sm">
          <div className="flex items-start gap-3 mb-4">
            <div className={`flex items-center justify-center w-10 h-10 rounded-lg ${state === "success" ? "bg-accent" : state === "error" ? "bg-destructive/10" : "bg-secondary"}`}>
              {state === "success" ? <Check className="w-5 h-5 text-primary" /> : state === "error" ? <AlertCircle className="w-5 h-5 text-destructive" /> : <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{uploadingFile.name}</p>
              <p className="text-xs text-muted-foreground">{state === "error" ? errorMessage : formatFileSize(uploadingFile.size)}</p>
            </div>
            <span className={`text-xs font-medium ${state === "success" ? "text-primary" : state === "error" ? "text-destructive" : "text-muted-foreground"}`}>
              {state === "success" ? "Ready" : state === "error" ? "Failed" : `${Math.round(uploadingFile.progress)}%`}
            </span>
          </div>
          {state !== "error" && (
            <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
              <div className="h-full bg-primary transition-all duration-200 rounded-full" style={{ width: `${uploadingFile.progress}%` }} />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default UploadZone;
