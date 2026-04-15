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
              if (el.complete && el.naturalWidth > 0) {
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
  const parseDescriptionDate = (desc: string): number => {
    const firstLine = desc.split("\n")[0].trim();
    // "Month Year" format isn't reliably parsed by Date() across browsers
    const d = new Date(`${firstLine} 1`);
    if (!isNaN(d.getTime())) return d.getTime();
    return 0;
  };

  const [photos, setPhotos] = useState<MosaicItem[]>(() =>
    [...items].sort(
      (a, b) =>
        parseDescriptionDate(b.description) -
        parseDescriptionDate(a.description),
    ),
  );

  const shufflePhotos = useCallback(() => {
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
  const [colCount, setColCount] = useState(3);
  useEffect(() => {
    const update = () => {
      const w = window.innerWidth;
      setColCount(w < 640 ? 1 : w < 1024 ? 2 : 3);
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  const [suggestion, setSuggestion] = useState("");
  const [suggestionSent, setSuggestionSent] = useState(false);
  const [showContactPrompt, setShowContactPrompt] = useState(false);
  const [contact, setContact] = useState("");

  const submitSuggestion = (contactValue: string | null) => {
    fetch("/api/suggestions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: suggestion.trim(),
        contact: contactValue,
      }),
    });
    setSuggestion("");
    setContact("");
    setShowContactPrompt(false);
    setSuggestionSent(true);
  };

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

  const [sidebarItem, setSidebarItem] = useState<MosaicItem | null>(null);
  const [sidebarFading, setSidebarFading] = useState(false);
  const fadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (hoveredItem || selectedItem) {
      // hovering or selected: cancel any pending fade/clear and show immediately
      if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
      if (clearTimerRef.current) clearTimeout(clearTimerRef.current);
      setSidebarFading(false);
      setSidebarItem(hoveredItem || selectedItem);
    } else if (sidebarItem) {
      // just stopped hovering: wait 3s, then fade out
      fadeTimerRef.current = setTimeout(() => {
        setSidebarFading(true);
        clearTimerRef.current = setTimeout(() => {
          setSidebarItem(null);
          setSidebarFading(false);
        }, 200);
      }, 750);
    }
    return () => {
      if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
      if (clearTimerRef.current) clearTimeout(clearTimerRef.current);
    };
  }, [hoveredItem, selectedItem]);

  // look up current version from photos array so edits aren't stale
  const displayedItem = sidebarItem
    ? photos.find((p) => p.id === sidebarItem.id) || sidebarItem
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
        <div className="relative">
          {/* photo info - fades in/out */}
          {displayedItem && (
            <div
              className="transition-opacity duration-200"
              style={{ opacity: sidebarFading ? 0 : 1 }}
            >
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
                  className="text-sm opacity-60 mt-0.5 bg-transparent border-b border-transparent focus:border-[var(--foreground)]/30 outline-none w-full"
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
                  <p className="text-sm opacity-60 mt-0.5">
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
            </div>
          )}
          {/* default text - shown when no photo info */}
          {!displayedItem && (
            <div className="text-sm animate-[fade-in_0.2s_ease]">
              <p>
                I have a wide selection of photos that I'm unsure on organizing
                as my collection grows. Please inspire me!
              </p>
              <div className="mt-3 flex flex-col gap-2">
                <input
                  className="text-sm w-full bg-transparent border-b border-[var(--foreground)]/30 focus:border-[var(--foreground)] outline-none py-1"
                  placeholder="your idea here..."
                  value={suggestion}
                  onChange={(e) => setSuggestion(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && suggestion.trim()) {
                      setShowContactPrompt(true);
                    }
                  }}
                  disabled={suggestionSent}
                />
                <button
                  className="text-sm px-2 py-1 self-start border border-[var(--foreground)] cursor-pointer disabled:opacity-30 disabled:cursor-default"
                  disabled={!suggestion.trim() || suggestionSent}
                  onClick={() => setShowContactPrompt(true)}
                >
                  {suggestionSent ? "sent!" : "send"}
                </button>
              </div>
              <p className="mt-4">
                Images are shown in reverse
                chronological order, but you can{" "}
                <button
                  className="underline cursor-pointer"
                  onClick={shufflePhotos}
                >
                  shuffle
                </button>{" "}
                the heap. I plan on adding film soon!
              </p>
            </div>
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

        {/* layout toggle - dev only */}
        {isDevMode && (
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
        )}

        {/* contact prompt modal */}
        {showContactPrompt && (
          <>
            <div
              className="fixed inset-0 z-50 bg-black/50"
              onClick={() => setShowContactPrompt(false)}
            />
            <div className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[var(--background)] border border-[var(--foreground)] p-6 w-[90vw] max-w-md">
              <p className="text-sm">
                want to leave your contact so we can chat about this? totally
                optional!
              </p>
              <input
                className="text-sm w-full bg-transparent border-b border-[var(--foreground)]/30 focus:border-[var(--foreground)] outline-none py-2 mt-3"
                placeholder="email, twitter, etc."
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    submitSuggestion(contact.trim() || null);
                  }
                }}
              />
              <div className="flex gap-2 mt-4 justify-end">
                <button
                  className="text-sm px-3 py-1.5 border border-[var(--foreground)]/30 cursor-pointer"
                  onClick={() => submitSuggestion(null)}
                >
                  skip
                </button>
                <button
                  className="text-sm px-3 py-1.5 border border-[var(--foreground)] cursor-pointer"
                  onClick={() => submitSuggestion(contact.trim() || null)}
                >
                  send
                </button>
              </div>
            </div>
          </>
        )}

        {layoutMode === "masonry" ? (
          <div className="flex gap-3 mt-2">
            {(() => {
              // distribute items to shortest column for balanced heights
              const columns: MosaicItem[][] = Array.from(
                { length: colCount },
                () => [],
              );
              const heights = new Array(colCount).fill(0);
              photos.forEach((item) => {
                const parts = item.aspect.split("/");
                const aspect =
                  parts.length === 2
                    ? Number(parts[0]) / Number(parts[1])
                    : parseFloat(item.aspect) || 1;
                // height is inversely proportional to aspect ratio (wider = shorter)
                const h = 1 / aspect;
                const shortest = heights.indexOf(Math.min(...heights));
                columns[shortest].push(item);
                heights[shortest] += h;
              });
              return columns.map((col, colIdx) => (
                <div key={colIdx} className="flex-1 flex flex-col gap-3">
                  {col.map((item) => (
                    <PhotoCell
                      key={item.id}
                      item={item}
                      index={photos.indexOf(item)}
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
                      className=""
                    />
                  ))}
                </div>
              ));
            })()}
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-center mt-2">
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
                style={{
                  height: 140 + ((index * 37) % 80),
                  width: "auto",
                  aspectRatio: item.aspect,
                  marginTop: ((index * 53) % 30) - 15,
                  marginLeft: 16 + ((index * 41) % 24),
                  marginRight: 16 + ((index * 29) % 24),
                  marginBottom: 12 + ((index * 47) % 16),
                }}
                className=""
                contain
              />
            ))}
          </div>
        )}

        {footer}

        {/* expanded photo - fullscreen */}
        {currentSelected && (
          <>
            {/* backdrop */}
            <div
              className={`fixed inset-0 z-50 bg-black/80 backdrop-blur-sm cursor-pointer transition-opacity duration-200 ${closing ? "opacity-0" : "animate-[fade-in_0.3s_ease]"}`}
              onClick={closeSelected}
            />
            {/* desktop: text panel - not animated, appears instantly */}
            <div
              className={`hidden md:flex fixed inset-0 z-50 justify-center pointer-events-none transition-opacity duration-200 ${closing ? "opacity-0" : ""}`}
            >
              <div className="w-full max-w-[1400px] px-4 flex gap-4">
                <div
                  className="w-[200px] shrink-0 min-w-0 flex flex-col pt-[calc(8vh+4rem)] break-words overflow-hidden pointer-events-auto"
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
                        className="text-sm text-white/60 mt-0.5 bg-transparent border-b border-transparent focus:border-white/30 outline-none w-full"
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
                        <p className="text-sm text-white/60 mt-0.5">
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
              </div>
            </div>
            {/* content: mobile text + image (animated) */}
            <div
              className={`fixed inset-0 z-50 cursor-pointer transition-opacity duration-200 ${closing ? "opacity-0" : "animate-[fade-in_0.3s_ease_0.15s_backwards]"}`}
              onClick={closeSelected}
            >
              {/* mobile: text + image in a column */}
              <div className="md:hidden flex flex-col h-full px-4 pt-6 pb-4">
                <div className="shrink-0">
                  <p className="text-xl text-white">{currentSelected.title}</p>
                  {currentSelected.subtitle && (
                    <p className="text-sm text-white/60 mt-0.5">
                      {currentSelected.subtitle}
                    </p>
                  )}
                  {currentSelected.description && (
                    <p className="text-sm text-white/80 mt-2">
                      {currentSelected.description}
                    </p>
                  )}
                </div>
                <div className="flex-1 flex items-center justify-center py-4 overflow-hidden min-h-0 relative">
                  {currentSelected.type === "still" &&
                    getThumbUrl(currentSelected) && (
                      <>
                        <img
                          src={getThumbUrl(currentSelected)!}
                          alt={currentSelected.title}
                          className="max-w-full max-h-full object-contain transition-[filter] duration-300"
                        />
                        {getImageUrl(currentSelected) && (
                          <img
                            src={getImageUrl(currentSelected)!}
                            alt={currentSelected.title}
                            className="absolute inset-0 w-full h-full object-contain opacity-0 transition-opacity duration-300"
                            onLoad={(e) => {
                              e.currentTarget.style.opacity = "1";
                              // blur the thumbnail behind
                              const thumb = e.currentTarget
                                .previousElementSibling as HTMLElement;
                              if (thumb) thumb.style.filter = "blur(4px)";
                            }}
                          />
                        )}
                      </>
                    )}
                </div>
              </div>
              {/* desktop: image centered in mosaic area */}
              <div className="hidden md:flex absolute inset-0 justify-center">
                <div className="w-full max-w-[1400px] px-4 flex gap-4 h-full">
                  <div className="w-[200px] shrink-0" />
                  <div className="flex-1 flex items-center justify-center py-8 overflow-hidden">
                    {currentSelected.type === "still" ? (
                      <div
                        className="relative flex items-center justify-center max-w-full"
                        style={{ maxHeight: "calc(100vh - 4rem)" }}
                      >
                        {/* thumbnail shown instantly, blurs when full-res loads */}
                        {getThumbUrl(currentSelected) && (
                          <img
                            src={getThumbUrl(currentSelected)!}
                            alt={currentSelected.title}
                            className="max-w-full object-contain transition-[filter] duration-300"
                            style={{ maxHeight: "calc(100vh - 4rem)" }}
                          />
                        )}
                        {/* full-res loads on top */}
                        {getImageUrl(currentSelected) && (
                          <img
                            src={getImageUrl(currentSelected)!}
                            alt={currentSelected.title}
                            className="absolute inset-0 w-full h-full object-contain opacity-0 transition-opacity duration-300"
                            onLoad={(e) => {
                              e.currentTarget.style.opacity = "1";
                              const thumb = e.currentTarget
                                .previousElementSibling as HTMLElement;
                              if (thumb) thumb.style.filter = "blur(4px)";
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
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
