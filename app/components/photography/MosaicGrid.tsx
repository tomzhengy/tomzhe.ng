"use client";

import { useState } from "react";
import { MosaicItem } from "../../types/photography";
import Lightbox from "./Lightbox";

const MOSAIC_ITEMS: MosaicItem[] = [
  { id: "1", title: "Golden Hour", color: "#8B7355", type: "still" },
  { id: "2", title: "Morning Fog", color: "#7B8FA1", type: "still" },
  { id: "3", title: "City Walk", color: "#6B8E7B", type: "motion" },
  { id: "4", title: "Desert Light", color: "#9B7E6B", type: "still" },
  { id: "5", title: "Ocean Breeze", color: "#6E7B8B", type: "still" },
  { id: "6", title: "Street Scene", color: "#A08B7A", type: "motion" },
  { id: "7", title: "Mountain Trail", color: "#7A8B6E", type: "still" },
  { id: "8", title: "Sunset Drive", color: "#8C7B6B", type: "motion" },
  { id: "9", title: "Still Life", color: "#9B8B7B", type: "still" },
];

export default function MosaicGrid() {
  const [selectedItem, setSelectedItem] = useState<MosaicItem | null>(null);

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {MOSAIC_ITEMS.map((item) => (
          <button
            key={item.id}
            className="relative overflow-hidden aspect-[4/3] w-full cursor-pointer rounded-sm transition-opacity duration-300 hover:opacity-80"
            style={{ backgroundColor: item.color }}
            onClick={() => setSelectedItem(item)}
          >
            {item.type === "motion" && (
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
            <span className="absolute bottom-3 left-3 text-white/80 text-sm">
              {item.title}
            </span>
          </button>
        ))}
      </div>

      <Lightbox item={selectedItem} onClose={() => setSelectedItem(null)} />
    </>
  );
}
