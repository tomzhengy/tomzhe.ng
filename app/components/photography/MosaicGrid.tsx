"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { MosaicItem } from "../../types/photography";
import DevToolbar from "./DevToolbar";
import DevPhotoOverlay from "./DevPhotoOverlay";

const R2_URL = process.env.NEXT_PUBLIC_R2_PUBLIC_URL || "";

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
}: PhotoCellProps) {
  return (
    <div
      className={`relative overflow-hidden w-full transition-opacity duration-300 hover:opacity-80 cursor-pointer ${className}`}
      style={{ backgroundColor: item.color, ...style }}
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
      {getThumbUrl(item) &&
        (item.type === "still" ? (
          <img
            src={getThumbUrl(item)!}
            alt={item.title}
            loading="lazy"
            className="w-full h-full object-cover opacity-0 transition-opacity duration-500"
            onLoad={(e) =>
              e.currentTarget.classList.replace("opacity-0", "opacity-100")
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
  const [hoveredItem, setHoveredItem] = useState<MosaicItem | null>(null);
  const [lastHoveredItem, setLastHoveredItem] = useState<MosaicItem | null>(
    null,
  );
  const [selectedItem, setSelectedItem] = useState<MosaicItem | null>(null);
  const [closing, setClosing] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [layoutMode, setLayoutMode] = useState<"masonry" | "heap">("masonry");
  const gridRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  useEffect(() => {
    const el = gridRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      setContainerWidth(entry.contentRect.width);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const closeSelected = useCallback(() => {
    setClosing(true);
    setTimeout(() => {
      setSelectedItem(null);
      setClosing(false);
    }, 200);
  }, []);

  const goToPrev = useCallback(() => {
    if (!selectedItem || photos.length === 0) return;
    const i = photos.findIndex((p) => p.id === selectedItem.id);
    setSelectedItem(photos[(i - 1 + photos.length) % photos.length]);
  }, [selectedItem, photos]);

  const goToNext = useCallback(() => {
    if (!selectedItem || photos.length === 0) return;
    const i = photos.findIndex((p) => p.id === selectedItem.id);
    setSelectedItem(photos[(i + 1) % photos.length]);
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

  const getThumbUrl = (item: MosaicItem) => {
    if (!R2_URL) return null;
    if (item.r2ThumbKey) return `${R2_URL}/${item.r2ThumbKey}`;
    if (item.r2Key) return `${R2_URL}/${item.r2Key}`;
    return null;
  };

  // compute justified rows for heap layout
  const TARGET_ROW_HEIGHT = 220;
  const GAP = 6;
  const justifiedRows = (() => {
    if (layoutMode !== "heap" || !containerWidth || photos.length === 0)
      return [];
    const rows: { items: MosaicItem[]; height: number }[] = [];
    let currentRow: MosaicItem[] = [];
    let rowWidth = 0;

    for (const item of photos) {
      const parts = item.aspect.split("/");
      const ratio =
        parts.length === 2 ? parseInt(parts[0]) / parseInt(parts[1]) : 1;
      const itemWidth = TARGET_ROW_HEIGHT * ratio;
      currentRow.push(item);
      rowWidth += itemWidth + (currentRow.length > 1 ? GAP : 0);

      if (rowWidth >= containerWidth) {
        const totalGap = (currentRow.length - 1) * GAP;
        const scale = (containerWidth - totalGap) / (rowWidth - totalGap);
        rows.push({ items: currentRow, height: TARGET_ROW_HEIGHT * scale });
        currentRow = [];
        rowWidth = 0;
      }
    }
    // last incomplete row
    if (currentRow.length > 0) {
      rows.push({ items: currentRow, height: TARGET_ROW_HEIGHT });
    }
    return rows;
  })();

  // preload full-res originals in the background
  useEffect(() => {
    photos.forEach((item) => {
      const url = getImageUrl(item);
      if (url && item.type === "still") {
        const img = new Image();
        img.src = url;
      }
    });
  }, [photos]);

  return (
    <div className="flex gap-8">
      {/* left: text panel */}
      <div className="hidden md:block w-[240px] shrink-0 self-start sticky top-[8vh] h-[calc(100vh-8vh)]">
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
          ref={gridRef}
          className={
            layoutMode === "masonry"
              ? "columns-1 sm:columns-2 lg:columns-3 gap-3 mt-2"
              : "mt-2"
          }
        >
          {layoutMode === "masonry"
            ? photos.map((item, index) => (
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
                  style={{ aspectRatio: item.aspect }}
                  className="mb-3 break-inside-avoid"
                />
              ))
            : justifiedRows.map((row, ri) => (
                <div
                  key={ri}
                  className="flex mb-[6px]"
                  style={{ height: row.height, gap: GAP }}
                >
                  {row.items.map((item) => {
                    const index = photos.findIndex((p) => p.id === item.id);
                    return (
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
                        style={{ height: row.height, aspectRatio: item.aspect }}
                        className=""
                      />
                    );
                  })}
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
                <div className="flex items-center gap-3 mb-2">
                  <button
                    className="text-sm text-white/50 hover:text-white cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      goToPrev();
                    }}
                  >
                    &lt;
                  </button>
                  <button
                    className="text-sm text-white/50 hover:text-white cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      goToNext();
                    }}
                  >
                    &gt;
                  </button>
                </div>
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
              {/* right: image */}
              <div className="flex-1 flex items-center justify-center p-8">
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
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
