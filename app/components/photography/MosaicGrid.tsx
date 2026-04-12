"use client";

import { useState, useEffect, useCallback } from "react";
import { MosaicItem } from "../../types/photography";
import DevToolbar from "./DevToolbar";
import DevPhotoOverlay from "./DevPhotoOverlay";

const R2_URL = process.env.NEXT_PUBLIC_R2_PUBLIC_URL || "";

interface MosaicGridProps {
  header: React.ReactNode;
  footer: React.ReactNode;
  items: MosaicItem[];
  isDevMode: boolean;
}

export default function MosaicGrid({
  header,
  footer,
  items,
  isDevMode,
}: MosaicGridProps) {
  const [photos, setPhotos] = useState<MosaicItem[]>(items);
  const [hoveredItem, setHoveredItem] = useState<MosaicItem | null>(null);
  const [lastHoveredItem, setLastHoveredItem] = useState<MosaicItem | null>(
    null,
  );
  const [selectedItem, setSelectedItem] = useState<MosaicItem | null>(null);
  const [closing, setClosing] = useState(false);
  const [editMode, setEditMode] = useState(false);

  const closeSelected = useCallback(() => {
    setClosing(true);
    setTimeout(() => {
      setSelectedItem(null);
      setClosing(false);
    }, 200);
  }, []);

  const goToPrev = useCallback(() => {
    if (!selectedItem) return;
    const i = photos.findIndex((p) => p.id === selectedItem.id);
    if (i > 0) setSelectedItem(photos[i - 1]);
  }, [selectedItem, photos]);

  const goToNext = useCallback(() => {
    if (!selectedItem) return;
    const i = photos.findIndex((p) => p.id === selectedItem.id);
    if (i < photos.length - 1) setSelectedItem(photos[i + 1]);
  }, [selectedItem, photos]);

  useEffect(() => {
    if (!selectedItem) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeSelected();
      if (e.key === "ArrowLeft") goToPrev();
      if (e.key === "ArrowRight") goToNext();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedItem, closeSelected, goToPrev, goToNext]);

  const refreshPhotos = useCallback(async () => {
    if (!isDevMode) return;
    const res = await fetch("/api/photos");
    const data = await res.json();
    setPhotos(data.photos);
  }, [isDevMode]);

  const displayedRef = selectedItem || hoveredItem || lastHoveredItem;
  // look up current version from photos array so edits aren't stale
  const displayedItem = displayedRef
    ? photos.find((p) => p.id === displayedRef.id) || displayedRef
    : null;

  const getImageUrl = (item: MosaicItem) => {
    if (!item.r2Key || !R2_URL) return null;
    return `${R2_URL}/${item.r2Key}`;
  };

  return (
    <div className="flex gap-8">
      {/* left: text panel */}
      <div className="hidden md:block w-[240px] shrink-0 self-start sticky top-[8vh]">
        {/* spacer to align with photos below header */}
        <div className="h-8 mb-8" />
        <div className="mt-6">
          {displayedItem && (
            <>
              {isDevMode ? (
                <input
                  className="text-lg bg-transparent border-b border-transparent focus:border-[var(--foreground)]/30 outline-none w-full"
                  value={displayedItem.title}
                  onChange={(e) => {
                    const updated = photos.map((p) =>
                      p.id === displayedItem.id
                        ? { ...p, title: e.target.value }
                        : p,
                    );
                    setPhotos(updated);
                  }}
                  onBlur={() => {
                    fetch(`/api/photos?id=${displayedItem.id}`, {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ title: displayedItem.title }),
                    });
                  }}
                />
              ) : (
                <p className="text-lg">{displayedItem.title}</p>
              )}
              {isDevMode ? (
                <input
                  className="text-sm opacity-60 mt-1 bg-transparent border-b border-transparent focus:border-[var(--foreground)]/30 outline-none w-full"
                  value={displayedItem.subtitle || ""}
                  placeholder="add subtitle..."
                  onChange={(e) => {
                    const updated = photos.map((p) =>
                      p.id === displayedItem.id
                        ? { ...p, subtitle: e.target.value }
                        : p,
                    );
                    setPhotos(updated);
                  }}
                  onBlur={() => {
                    fetch(`/api/photos?id=${displayedItem.id}`, {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        subtitle: displayedItem.subtitle,
                      }),
                    });
                  }}
                />
              ) : (
                displayedItem.subtitle && (
                  <p className="text-sm opacity-60 mt-1">
                    {displayedItem.subtitle}
                  </p>
                )
              )}
              {isDevMode ? (
                <textarea
                  className="text-sm opacity-80 mt-3 bg-transparent border-b border-transparent focus:border-[var(--foreground)]/30 outline-none w-full resize-none"
                  value={displayedItem.description}
                  placeholder="add description..."
                  rows={3}
                  onChange={(e) => {
                    const updated = photos.map((p) =>
                      p.id === displayedItem.id
                        ? { ...p, description: e.target.value }
                        : p,
                    );
                    setPhotos(updated);
                  }}
                  onBlur={() => {
                    fetch(`/api/photos?id=${displayedItem.id}`, {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        description: displayedItem.description,
                      }),
                    });
                  }}
                />
              ) : (
                <p className="text-sm opacity-80 mt-3">
                  {displayedItem.description}
                </p>
              )}
            </>
          )}
        </div>
      </div>

      {/* right: header + photos + footer */}
      <div className="flex-1 relative">
        {/* header - hidden when photo is expanded */}
        <div>{header}</div>

        {/* dev toolbar */}
        {isDevMode && (
          <DevToolbar
            editMode={editMode}
            onToggleEditMode={() => setEditMode((v) => !v)}
            onRefresh={refreshPhotos}
          />
        )}

        <div className="columns-1 sm:columns-2 lg:columns-3 gap-3 mt-6">
          {photos.map((item, index) => (
            <div
              key={item.id}
              className="relative overflow-hidden w-full transition-opacity duration-300 hover:opacity-80 cursor-pointer mb-3 break-inside-avoid"
              style={{
                backgroundColor: item.color,
                aspectRatio: item.aspect,
              }}
              onMouseEnter={() => {
                setHoveredItem(item);
                setLastHoveredItem(item);
              }}
              onMouseMove={() => {
                if (hoveredItem?.id !== item.id) {
                  setHoveredItem(item);
                  setLastHoveredItem(item);
                }
              }}
              onMouseLeave={() => setHoveredItem(null)}
              onClick={() => !editMode && setSelectedItem(item)}
            >
              {getImageUrl(item) &&
                (item.type === "still" ? (
                  <img
                    src={getImageUrl(item)!}
                    alt={item.title}
                    loading="lazy"
                    className="w-full h-full object-cover opacity-0 transition-opacity duration-500"
                    onLoad={(e) =>
                      e.currentTarget.classList.replace(
                        "opacity-0",
                        "opacity-100",
                      )
                    }
                  />
                ) : (
                  <video
                    src={getImageUrl(item)!}
                    muted
                    loop
                    playsInline
                    preload="none"
                    onMouseEnter={(e) => e.currentTarget.play()}
                    onMouseLeave={(e) => {
                      e.currentTarget.pause();
                      e.currentTarget.currentTime = 0;
                    }}
                    className="w-full h-full object-cover"
                  />
                ))}

              {!getImageUrl(item) && item.type === "motion" && (
                <div className="absolute top-3 right-3">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    className="text-white/60"
                  >
                    <path d="M8 5v14l11-7L8 5z" fill="currentColor" />
                  </svg>
                </div>
              )}

              {/* dev edit overlay */}
              {isDevMode && editMode && (
                <DevPhotoOverlay
                  photo={item}
                  index={index}
                  total={photos.length}
                  onRefresh={refreshPhotos}
                />
              )}
            </div>
          ))}
        </div>

        {footer}

        {/* expanded photo - fullscreen */}
        {selectedItem && (
          <>
            {/* backdrop */}
            <div
              className={`fixed inset-0 z-50 bg-black/80 backdrop-blur-sm cursor-pointer transition-opacity duration-200 ${closing ? "opacity-0" : "animate-[fade-in_0.3s_ease]"}`}
              onClick={closeSelected}
            />
            {/* content: text + image */}
            <div
              className={`fixed inset-0 z-50 flex cursor-pointer transition-opacity duration-200 ${closing ? "opacity-0" : "animate-[fade-in_0.3s_ease_0.15s_backwards]"}`}
              onClick={closeSelected}
            >
              {/* left: text panel */}
              <div className="hidden md:flex w-[240px] shrink-0 flex-col justify-center px-4">
                <p className="text-lg text-white">{selectedItem.title}</p>
                {selectedItem.subtitle && (
                  <p className="text-sm text-white/60 mt-1">
                    {selectedItem.subtitle}
                  </p>
                )}
                {selectedItem.description && (
                  <p className="text-sm text-white/80 mt-3">
                    {selectedItem.description}
                  </p>
                )}
              </div>
              {/* right: image with nav arrows */}
              <div className="flex-1 flex items-center justify-center p-8 relative">
                {photos.findIndex((p) => p.id === selectedItem.id) > 0 && (
                  <button
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-white/50 hover:text-white text-2xl cursor-pointer z-10"
                    onClick={(e) => {
                      e.stopPropagation();
                      goToPrev();
                    }}
                  >
                    ←
                  </button>
                )}
                {getImageUrl(selectedItem) &&
                  (selectedItem.type === "still" ? (
                    <img
                      src={getImageUrl(selectedItem)!}
                      alt={selectedItem.title}
                      className="max-w-full max-h-full object-contain"
                    />
                  ) : (
                    <video
                      src={getImageUrl(selectedItem)!}
                      autoPlay
                      muted
                      loop
                      playsInline
                      className="max-w-full max-h-full object-contain"
                    />
                  ))}
                {photos.findIndex((p) => p.id === selectedItem.id) <
                  photos.length - 1 && (
                  <button
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white/50 hover:text-white text-2xl cursor-pointer z-10"
                    onClick={(e) => {
                      e.stopPropagation();
                      goToNext();
                    }}
                  >
                    →
                  </button>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
