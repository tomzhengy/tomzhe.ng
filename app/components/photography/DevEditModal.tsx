"use client";

import { useState } from "react";
import { MosaicItem } from "../../types/photography";

interface DevEditModalProps {
  photo: MosaicItem;
  onClose: () => void;
  onSaved: () => void;
}

export default function DevEditModal({
  photo,
  onClose,
  onSaved,
}: DevEditModalProps) {
  const [title, setTitle] = useState(photo.title);
  const [description, setDescription] = useState(photo.description);
  const [type, setType] = useState(photo.type);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSave = async () => {
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/photos/${photo.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description, type }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "save failed");
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={onClose}
    >
      <div
        className="bg-[var(--background)] border border-[var(--foreground)]/20 p-6 w-[400px] max-w-[90vw]"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg mb-4">edit photo</h2>

        <label className="block text-sm opacity-60 mb-1">title</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full bg-transparent border border-[var(--foreground)]/20 px-2 py-1 text-sm mb-3"
        />

        <label className="block text-sm opacity-60 mb-1">description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="w-full bg-transparent border border-[var(--foreground)]/20 px-2 py-1 text-sm mb-3 resize-none"
        />

        <label className="block text-sm opacity-60 mb-1">type</label>
        <select
          value={type}
          onChange={(e) => setType(e.target.value as "still" | "motion")}
          className="w-full bg-transparent border border-[var(--foreground)]/20 px-2 py-1 text-sm mb-4"
        >
          <option value="still">still</option>
          <option value="motion">motion</option>
        </select>

        {error && <p className="text-sm text-red-500 mb-4">{error}</p>}

        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="text-sm opacity-60 hover:opacity-100 cursor-pointer"
          >
            cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="text-sm cursor-pointer disabled:opacity-30"
          >
            {saving ? "saving..." : "save"}
          </button>
        </div>
      </div>
    </div>
  );
}
