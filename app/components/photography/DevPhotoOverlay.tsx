"use client";

import { useState } from "react";
import { MosaicItem } from "../../types/photography";
import DevEditModal from "./DevEditModal";

interface DevPhotoOverlayProps {
  photo: MosaicItem;
  index: number;
  total: number;
  onRefresh: () => void;
}

export default function DevPhotoOverlay({
  photo,
  index,
  total,
  onRefresh,
}: DevPhotoOverlayProps) {
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleMove = async (direction: "up" | "down") => {
    const res = await fetch("/api/photos");
    const { photos } = await res.json();
    const ids = photos.map((p: MosaicItem) => p.id);
    const i = ids.indexOf(photo.id);
    if (i === -1) return;

    const swapWith = direction === "up" ? i - 1 : i + 1;
    if (swapWith < 0 || swapWith >= ids.length) return;

    [ids[i], ids[swapWith]] = [ids[swapWith], ids[i]];

    await fetch("/api/photos", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderedIds: ids }),
    });
    onRefresh();
  };

  const handleDelete = async () => {
    if (!confirm("delete this photo?")) return;
    setDeleting(true);
    await fetch(`/api/photos?id=${photo.id}`, { method: "DELETE" });
    onRefresh();
  };

  return (
    <>
      <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 flex items-center justify-center gap-2 z-20">
        {index > 0 && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleMove("up");
            }}
            className="bg-white/90 text-black px-2 py-1 text-xs cursor-pointer"
          >
            ←
          </button>
        )}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setEditing(true);
          }}
          className="bg-white/90 text-black px-2 py-1 text-xs cursor-pointer"
        >
          edit
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleDelete();
          }}
          disabled={deleting}
          className="bg-red-500/90 text-white px-2 py-1 text-xs cursor-pointer disabled:opacity-50"
        >
          {deleting ? "..." : "delete"}
        </button>
        {index < total - 1 && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleMove("down");
            }}
            className="bg-white/90 text-black px-2 py-1 text-xs cursor-pointer"
          >
            →
          </button>
        )}
      </div>

      {editing && (
        <DevEditModal
          photo={photo}
          onClose={() => setEditing(false)}
          onSaved={onRefresh}
        />
      )}
    </>
  );
}
