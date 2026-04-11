"use client";

import { useState } from "react";
import DevUploadModal from "./DevUploadModal";

interface DevToolbarProps {
  editMode: boolean;
  onToggleEditMode: () => void;
  onRefresh: () => void;
}

export default function DevToolbar({
  editMode,
  onToggleEditMode,
  onRefresh,
}: DevToolbarProps) {
  const [showUpload, setShowUpload] = useState(false);

  return (
    <>
      <div className="flex gap-3 items-center mb-4 text-sm">
        <button
          onClick={() => setShowUpload(true)}
          className="border border-[var(--foreground)]/30 px-3 py-1 cursor-pointer hover:border-[var(--foreground)]/60"
        >
          upload
        </button>
        <button
          onClick={onToggleEditMode}
          className={`border px-3 py-1 cursor-pointer ${
            editMode
              ? "border-[var(--foreground)] bg-[var(--foreground)]/10"
              : "border-[var(--foreground)]/30 hover:border-[var(--foreground)]/60"
          }`}
        >
          {editMode ? "done editing" : "edit"}
        </button>
      </div>

      {showUpload && (
        <DevUploadModal
          onClose={() => setShowUpload(false)}
          onUploaded={onRefresh}
        />
      )}
    </>
  );
}
