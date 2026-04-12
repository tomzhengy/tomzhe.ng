"use client";

import { useState, useRef } from "react";
import { analyzeImage, createThumbnail } from "./utils";

interface DevUploadModalProps {
  onClose: () => void;
  onUploaded: () => void;
}

export default function DevUploadModal({
  onClose,
  onUploaded,
}: DevUploadModalProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = (newFiles: FileList | null) => {
    if (!newFiles) return;
    setFiles(Array.from(newFiles));
    setError("");
  };

  const handleUpload = async () => {
    if (files.length === 0) return;
    setUploading(true);
    setError("");

    try {
      for (const file of files) {
        const info = await analyzeImage(file);
        const isImage = !file.type.startsWith("video/");
        const thumb = isImage ? await createThumbnail(file) : null;

        const formData = new FormData();
        formData.append("file", file);
        if (thumb) formData.append("thumb", thumb);
        formData.append("title", file.name.replace(/\.[^.]+$/, ""));
        formData.append("description", "");
        formData.append("type", isImage ? "still" : "motion");
        formData.append("width", String(info.width));
        formData.append("height", String(info.height));
        formData.append("color", info.color);
        formData.append("aspect", info.aspect);

        const res = await fetch("/api/photos", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "upload failed");
        }
      }
      onUploaded();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={onClose}
    >
      <div
        className="bg-[var(--background)] border border-[var(--foreground)]/20 p-6 w-[480px] max-w-[90vw]"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg mb-4">upload photos</h2>

        <div
          className="border-2 border-dashed border-[var(--foreground)]/30 p-8 text-center cursor-pointer mb-4"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            handleFiles(e.dataTransfer.files);
          }}
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/*,video/*"
            multiple
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
          {files.length > 0 ? (
            <p className="text-sm">
              {files.length} file{files.length > 1 ? "s" : ""} selected
            </p>
          ) : (
            <p className="text-sm opacity-60">
              drop files here or click to select
            </p>
          )}
        </div>

        {files.length > 0 && (
          <div className="mb-4 max-h-[200px] overflow-y-auto">
            {files.map((f, i) => (
              <div key={i} className="text-sm opacity-80 truncate">
                {f.name} ({(f.size / 1024 / 1024).toFixed(1)} MB)
              </div>
            ))}
          </div>
        )}

        {error && <p className="text-sm text-red-500 mb-4">{error}</p>}

        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="text-sm opacity-60 hover:opacity-100 cursor-pointer"
          >
            cancel
          </button>
          <button
            onClick={handleUpload}
            disabled={files.length === 0 || uploading}
            className="text-sm cursor-pointer disabled:opacity-30"
          >
            {uploading ? "uploading..." : "upload"}
          </button>
        </div>
      </div>
    </div>
  );
}
