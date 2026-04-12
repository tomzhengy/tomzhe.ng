"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { MosaicItem } from "../../types/photography";
import DevToolbar from "./DevToolbar";
import DevPhotoOverlay from "./DevPhotoOverlay";

const R2_URL = process.env.NEXT_PUBLIC_R2_PUBLIC_URL || "";

const pendingSaves = new Map<
  string,
  {
    timer: ReturnType<typeof setTimeout>;
    photoId: string;
    field: string;
    value: string;
  }
>();

function debouncedSave(photoId: string, field: string, value: string) {
  const key = `${photoId}:${field}`;
  const existing = pendingSaves.get(key);
  if (existing) clearTimeout(existing.timer);
  pendingSaves.set(key, {
    photoId,
    field,
    value,
    timer: setTimeout(() => {
      fetch(`/api/photos?id=${photoId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      });
      pendingSaves.delete(key);
    }, 500),
  });
}

function flushAllSaves() {
  pendingSaves.forEach(({ timer, photoId, field, value }, key) => {
    clearTimeout(timer);
    fetch(`/api/photos?id=${photoId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value }),
    });
    pendingSaves.delete(key);
  });
}

interface PhotoCellProps {
  item: MosaicItem;
  index: number;
  total: number;
  getThumbUrl: (item: MosaicItem) => string | null;
  getImageUrl: (item: MosaicItem) => string | null;
  hoveredItem: MosaicItem | null;
  setHoveredItem: (item: MosaicItem | null) => void;
  setLastHoveredItem: (item: MosaicItem) => void;
  setSelectedItem: (item: MosaicItem) => void;
  editMode: boolean;
  isDevMode: boolean;
  onRefresh: () => void;
  style: React.CSSProperties;
  className: string;
  contain?: boolean;
}

function PhotoCell({
  item,
  index,
  total,
  getThumbUrl,
  getImageUrl,
  hoveredItem,
  setHoveredItem,
  setLastHoveredItem,
  setSelectedItem,
  editMode,
  isDevMode,
  onRefresh,
  style,
  className,
  contain,
}: PhotoCellProps) {
  const objectFit = contain ? "object-contain" : "object-cover";
  return (
    <div
      className={`relative overflow-hidden transition-opacity duration-300 hover:opacity-80 cursor-pointer ${contain ? "" : "w-full"} ${className}`}
      style={{ backgroundColor: item.color, ...style }}
      onMouseEnter={() => {
        setHoveredItem(item);
        setLastHoveredItem(item);
        // preload full-res on hover
        const url = getImageUrl(item);
        if (url && item.type === "still") {
          const img = new Image();
          img.src = url;
        }
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
      {getThumbUrl(item) &&
        (item.type === "still" ? (
          <img
            src={getThumbUrl(item)!}
            alt={item.title}
            loading="lazy"
            className={`w-full h-full ${objectFit} transition-opacity duration-500`}
            style={{ opacity: 0 }}
            ref={(el) => {
              if (!el) return;
              if (el.complete) {
                el.style.opacity = "1";
              } else {
                el.onload = () => {
                  el.style.opacity = "1";
                };
              }
            }}
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
            className={`w-full h-full ${objectFit}`}
          />
        ))}

      {!getThumbUrl(item) && item.type === "motion" && (
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

      {isDevMode && editMode && (
        <DevPhotoOverlay
          photo={item}
          index={index}
          total={total}
          onRefresh={onRefresh}
        />
      )}
    </div>
  );
}

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

  // shuffle after mount to avoid server/client hydration mismatch
  useEffect(() => {
    setPhotos((prev) => {
      const shuffled = [...prev];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return shuffled;
    });
  }, []);
  const [hoveredItem, setHoveredItem] = useState<MosaicItem | null>(null);
  const [lastHoveredItem, setLastHoveredItem] = useState<MosaicItem | null>(
    null,
  );
  const [selectedItem, setSelectedItem] = useState<MosaicItem | null>(null);
  const [closing, setClosing] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [layoutMode, setLayoutMode] = useState<"masonry" | "heap">("masonry");

  const closeSelected = useCallback(() => {
    flushAllSaves();
    setClosing(true);
    setTimeout(() => {
      setSelectedItem(null);
      setClosing(false);
    }, 200);
  }, []);

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

  const displayedRef = selectedItem || hoveredItem || lastHoveredItem;
  // look up current version from photos array so edits aren't stale
  const displayedItem = displayedRef
    ? photos.find((p) => p.id === displayedRef.id) || displayedRef
    : null;

  const getImageUrl = (item: MosaicItem) => {
    if (!item.r2Key || !R2_URL) return null;
    return `${R2_URL}/${item.r2Key}`;
  };

  const getThumbUrl = (item: MosaicItem) => {
    if (!R2_URL) return null;
    if (item.r2ThumbKey) return `${R2_URL}/${item.r2ThumbKey}`;
    if (item.r2Key) return `${R2_URL}/${item.r2Key}`;
    return null;
  };

  const currentSelected = selectedItem
    ? photos.find((p) => p.id === selectedItem.id) || selectedItem
    : null;

  return (
    <div className="flex gap-4">
      {/* left: text panel */}
      <div className="hidden md:block w-[200px] shrink-0 self-start sticky top-[8vh] h-[calc(100vh-8vh)] overflow-hidden break-words">
        {/* spacer to align with photos below header */}
        <div className="h-8 mb-8" />
        <div className="mt-6 pt-4">
          {displayedItem && (
            <>
              {isDevMode ? (
                <textarea
                  className="text-2xl bg-transparent border-b border-transparent focus:border-[var(--foreground)]/30 outline-none w-full resize-none"
                  value={displayedItem.title}
                  rows={1}
                  onInput={(e) => {
                    const el = e.currentTarget;
                    el.style.height = "auto";
                    el.style.height = el.scrollHeight + "px";
                  }}
                  ref={(el) => {
                    if (!el) return;
                    el.style.height = "auto";
                    el.style.height = el.scrollHeight + "px";
                  }}
                  onChange={(e) => {
                    const val = e.target.value;
                    const updated = photos.map((p) =>
                      p.id === displayedItem.id ? { ...p, title: val } : p,
                    );
                    setPhotos(updated);
                    debouncedSave(displayedItem.id, "title", val);
                  }}
                />
              ) : (
                <p className="text-2xl leading-tight mb-0">
                  {displayedItem.title}
                </p>
              )}
              {isDevMode ? (
                <input
                  className="text-sm opacity-60 -mt-1 bg-transparent border-b border-transparent focus:border-[var(--foreground)]/30 outline-none w-full"
                  value={displayedItem.subtitle || ""}
                  placeholder="add subtitle..."
                  onChange={(e) => {
                    const val = e.target.value;
                    const updated = photos.map((p) =>
                      p.id === displayedItem.id ? { ...p, subtitle: val } : p,
                    );
                    setPhotos(updated);
                    debouncedSave(displayedItem.id, "subtitle", val);
                  }}
                />
              ) : (
                displayedItem.subtitle && (
                  <p className="text-sm opacity-60 -mt-1">
                    {displayedItem.subtitle}
                  </p>
                )
              )}
              {isDevMode ? (
                <textarea
                  className="text-sm opacity-80 mt-3 bg-transparent border-b border-transparent focus:border-[var(--foreground)]/30 outline-none w-full resize-none"
                  value={displayedItem.description}
                  placeholder="add description..."
                  rows={1}
                  onInput={(e) => {
                    const el = e.currentTarget;
                    el.style.height = "auto";
                    el.style.height = el.scrollHeight + "px";
                  }}
                  ref={(el) => {
                    if (!el) return;
                    el.style.height = "auto";
                    el.style.height = el.scrollHeight + "px";
                  }}
                  onChange={(e) => {
                    const val = e.target.value;
                    const updated = photos.map((p) =>
                      p.id === displayedItem.id
                        ? { ...p, description: val }
                        : p,
                    );
                    setPhotos(updated);
                    debouncedSave(displayedItem.id, "description", val);
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

        {/* scroll to top button */}
        <button
          className="absolute bottom-4 right-0 w-8 h-8 flex items-center justify-center border border-[var(--foreground)]/20 hover:border-[var(--foreground)]/50 opacity-60 hover:opacity-100 cursor-pointer transition-opacity"
          onClick={() => {
            const start = window.scrollY;
            const duration = Math.min(800, 300 + start * 0.3);
            const startTime = performance.now();
            const ease = (t: number) =>
              t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
            const step = (now: number) => {
              const t = Math.min((now - startTime) / duration, 1);
              window.scrollTo(0, start * (1 - ease(t)));
              if (t < 1) requestAnimationFrame(step);
            };
            requestAnimationFrame(step);
          }}
          aria-label="scroll to top"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M12 19V5M5 12l7-7 7 7" />
          </svg>
        </button>
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

        {/* layout toggle */}
        <div className="flex gap-2 mt-4 mb-2">
          <button
            className={`text-xs px-2 py-1 cursor-pointer border ${layoutMode === "masonry" ? "border-[var(--foreground)] opacity-100" : "border-[var(--foreground)]/30 opacity-60"}`}
            onClick={() => setLayoutMode("masonry")}
          >
            masonry
          </button>
          <button
            className={`text-xs px-2 py-1 cursor-pointer border ${layoutMode === "heap" ? "border-[var(--foreground)] opacity-100" : "border-[var(--foreground)]/30 opacity-60"}`}
            onClick={() => setLayoutMode("heap")}
          >
            heap
          </button>
        </div>

        <div
          className={
            layoutMode === "masonry"
              ? "columns-1 sm:columns-2 lg:columns-3 gap-3 mt-2"
              : "flex flex-wrap items-center justify-center mt-2"
          }
        >
          {photos.map((item, index) => (
            <PhotoCell
              key={item.id}
              item={item}
              index={index}
              total={photos.length}
              getThumbUrl={getThumbUrl}
              getImageUrl={getImageUrl}
              hoveredItem={hoveredItem}
              setHoveredItem={setHoveredItem}
              setLastHoveredItem={setLastHoveredItem}
              setSelectedItem={setSelectedItem}
              editMode={editMode}
              isDevMode={isDevMode}
              onRefresh={refreshPhotos}
              style={
                layoutMode === "masonry"
                  ? { aspectRatio: item.aspect }
                  : {
                      height: 140 + ((index * 37) % 80),
                      width: "auto",
                      aspectRatio: item.aspect,
                      marginTop: ((index * 53) % 30) - 15,
                      marginLeft: 16 + ((index * 41) % 24),
                      marginRight: 16 + ((index * 29) % 24),
                      marginBottom: 12 + ((index * 47) % 16),
                    }
              }
              className={
                layoutMode === "masonry" ? "mb-3 break-inside-avoid" : ""
              }
              contain={layoutMode === "heap"}
            />
          ))}
        </div>

        {footer}

        {/* expanded photo - fullscreen */}
        {currentSelected && (
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
              <div
                className="hidden md:flex w-[200px] min-w-0 shrink-0 flex-col pt-[calc(8vh+5.5rem)] pl-4 pr-4 break-words overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                {isDevMode ? (
                  <>
                    <textarea
                      className="text-2xl bg-transparent text-white border-b border-transparent focus:border-white/30 outline-none w-full resize-none"
                      value={currentSelected.title}
                      rows={1}
                      onInput={(e) => {
                        const el = e.currentTarget;
                        el.style.height = "auto";
                        el.style.height = el.scrollHeight + "px";
                      }}
                      ref={(el) => {
                        if (!el) return;
                        el.style.height = "auto";
                        el.style.height = el.scrollHeight + "px";
                      }}
                      onChange={(e) => {
                        const val = e.target.value;
                        const updated = photos.map((p) =>
                          p.id === currentSelected.id
                            ? { ...p, title: val }
                            : p,
                        );
                        setPhotos(updated);
                        debouncedSave(currentSelected.id, "title", val);
                      }}
                    />
                    <input
                      className="text-sm text-white/60 -mt-1 bg-transparent border-b border-transparent focus:border-white/30 outline-none w-full"
                      value={currentSelected.subtitle || ""}
                      placeholder="add subtitle..."
                      onChange={(e) => {
                        const val = e.target.value;
                        const updated = photos.map((p) =>
                          p.id === currentSelected.id
                            ? { ...p, subtitle: val }
                            : p,
                        );
                        setPhotos(updated);
                        debouncedSave(currentSelected.id, "subtitle", val);
                      }}
                    />
                    <textarea
                      className="text-sm text-white/80 mt-3 bg-transparent border-b border-transparent focus:border-white/30 outline-none w-full resize-none"
                      value={currentSelected.description}
                      placeholder="add description..."
                      rows={1}
                      onInput={(e) => {
                        const el = e.currentTarget;
                        el.style.height = "auto";
                        el.style.height = el.scrollHeight + "px";
                      }}
                      ref={(el) => {
                        if (!el) return;
                        el.style.height = "auto";
                        el.style.height = el.scrollHeight + "px";
                      }}
                      onChange={(e) => {
                        const val = e.target.value;
                        const updated = photos.map((p) =>
                          p.id === currentSelected.id
                            ? { ...p, description: val }
                            : p,
                        );
                        setPhotos(updated);
                        debouncedSave(currentSelected.id, "description", val);
                      }}
                    />
                  </>
                ) : (
                  <>
                    <p className="text-2xl leading-tight text-white">
                      {currentSelected.title}
                    </p>
                    {currentSelected.subtitle && (
                      <p className="text-sm text-white/60 -mt-1">
                        {currentSelected.subtitle}
                      </p>
                    )}
                    {currentSelected.description && (
                      <p className="text-sm text-white/80 mt-3">
                        {currentSelected.description}
                      </p>
                    )}
                  </>
                )}
              </div>
              {/* right: image */}
              <div className="flex-1 flex items-center justify-center py-8 px-12 overflow-hidden">
                {currentSelected.type === "still" ? (
                  <div
                    className="relative flex items-center justify-center max-w-full"
                    style={{ maxHeight: "calc(100vh - 4rem)" }}
                  >
                    {/* thumbnail shown instantly as blurred placeholder */}
                    {getThumbUrl(currentSelected) && (
                      <img
                        src={getThumbUrl(currentSelected)!}
                        alt={currentSelected.title}
                        className="max-w-full object-contain blur-sm"
                        style={{ maxHeight: "calc(100vh - 4rem)" }}
                      />
                    )}
                    {/* full-res loads on top, same size as thumbnail */}
                    {getImageUrl(currentSelected) && (
                      <img
                        src={getImageUrl(currentSelected)!}
                        alt={currentSelected.title}
                        className="absolute inset-0 w-full h-full object-contain opacity-0 transition-opacity duration-300"
                        onLoad={(e) => {
                          e.currentTarget.style.opacity = "1";
                        }}
                      />
                    )}
                  </div>
                ) : (
                  getImageUrl(currentSelected) && (
                    <video
                      src={getImageUrl(currentSelected)!}
                      autoPlay
                      muted
                      loop
                      playsInline
                      className="max-w-full max-h-full object-contain"
                    />
                  )
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
