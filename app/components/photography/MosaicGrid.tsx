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
  const [editMode, setEditMode] = useState(false);

  const closeSelected = useCallback(() => setSelectedItem(null), []);

  useEffect(() => {
    if (!selectedItem) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeSelected();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedItem, closeSelected]);

  const refreshPhotos = useCallback(async () => {
    if (!isDevMode) return;
    const res = await fetch("/api/photos");
    const data = await res.json();
    setPhotos(data.photos);
  }, [isDevMode]);

  const displayedItem = selectedItem || hoveredItem || lastHoveredItem;

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
              <p className="text-lg">{displayedItem.title}</p>
              <p className="text-sm opacity-60 mt-1">{displayedItem.type}</p>
              <p className="text-sm opacity-80 mt-3">
                {displayedItem.description}
              </p>
            </>
          )}
        </div>
      </div>

      {/* right: header + photos + footer */}
      <div className="flex-1 relative">
        {/* header - hidden when photo is expanded */}
        <div style={{ visibility: selectedItem ? "hidden" : "visible" }}>
          {header}
        </div>

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
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <video
                    src={getImageUrl(item)!}
                    muted
                    loop
                    playsInline
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

        {!selectedItem && footer}

        {/* expanded photo - covers entire right column */}
        {selectedItem && (
          <div
            className="absolute inset-0 z-10 flex items-center justify-center bg-[var(--background)] cursor-pointer animate-[photo-expand_0.3s_ease]"
            onClick={() => setSelectedItem(null)}
          >
            <div
              className="w-full h-full"
              style={{ backgroundColor: selectedItem.color }}
            >
              {getImageUrl(selectedItem) &&
                (selectedItem.type === "still" ? (
                  <img
                    src={getImageUrl(selectedItem)!}
                    alt={selectedItem.title}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <video
                    src={getImageUrl(selectedItem)!}
                    autoPlay
                    muted
                    loop
                    playsInline
                    className="w-full h-full object-contain"
                  />
                ))}

              {!getImageUrl(selectedItem) && selectedItem.type === "motion" && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <svg
                    width="48"
                    height="48"
                    viewBox="0 0 24 24"
                    fill="none"
                    className="text-white/60"
                  >
                    <path d="M8 5v14l11-7L8 5z" fill="currentColor" />
                  </svg>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
