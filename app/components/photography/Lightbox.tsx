"use client";

import { useEffect } from "react";
import { MosaicItem } from "../../types/photography";

interface LightboxProps {
  item: MosaicItem | null;
  onClose: () => void;
}

export default function Lightbox({ item, onClose }: LightboxProps) {
  useEffect(() => {
    if (!item) return;

    document.body.style.overflow = "hidden";

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [item, onClose]);

  if (!item) return null;

  return (
    <div
      className="fixed inset-0 z-[50] flex items-center justify-center bg-black/85 transition-opacity duration-300"
      onClick={onClose}
    >
      {/* close button */}
      <button
        onClick={onClose}
        className="absolute top-6 right-6 text-white/70 hover:text-white cursor-pointer text-2xl transition-opacity duration-300"
      >
        ✕
      </button>

      {/* content */}
      <div
        className="flex flex-col items-center"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="max-w-[800px] w-[90vw] aspect-[4/3] rounded-sm relative"
          style={{ backgroundColor: item.color }}
        >
          {item.type === "motion" && (
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
        <p className="text-white/80 text-lg mt-4 text-center">{item.title}</p>
        <p className="text-white/50 text-sm mt-1">{item.type}</p>
      </div>
    </div>
  );
}
