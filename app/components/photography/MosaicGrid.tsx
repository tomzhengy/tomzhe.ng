"use client";

import { useState } from "react";
import { MosaicItem } from "../../types/photography";

const MOSAIC_ITEMS: MosaicItem[] = [
  {
    id: "1",
    title: "Golden Hour",
    description:
      "Late afternoon light cutting through the fog in the Outer Sunset.",
    color: "#8B7355",
    type: "still",
    aspect: "4/3",
  },
  {
    id: "2",
    title: "Morning Fog",
    description: "Karl the Fog rolling over Twin Peaks at sunrise.",
    color: "#7B8FA1",
    type: "still",
    aspect: "3/4",
  },
  {
    id: "3",
    title: "City Walk",
    description: "A walk through Chinatown on a rainy evening.",
    color: "#6B8E7B",
    type: "motion",
    aspect: "16/9",
  },
  {
    id: "4",
    title: "Desert Light",
    description: "Joshua Tree at dusk, the last light on the rocks.",
    color: "#9B7E6B",
    type: "still",
    aspect: "1/1",
  },
  {
    id: "5",
    title: "Ocean Breeze",
    description: "Waves breaking at Ocean Beach during a winter storm.",
    color: "#6E7B8B",
    type: "still",
    aspect: "3/2",
  },
  {
    id: "6",
    title: "Street Scene",
    description: "Market Street foot traffic on a Saturday morning.",
    color: "#A08B7A",
    type: "motion",
    aspect: "4/3",
  },
  {
    id: "7",
    title: "Mountain Trail",
    description: "Hiking the Dipsea Trail through redwoods in Marin.",
    color: "#7A8B6E",
    type: "still",
    aspect: "2/3",
  },
  {
    id: "8",
    title: "Sunset Drive",
    description: "Driving down Highway 1, golden hour on the coast.",
    color: "#8C7B6B",
    type: "motion",
    aspect: "16/9",
  },
  {
    id: "9",
    title: "Still Life",
    description: "Morning coffee and light on a kitchen counter.",
    color: "#9B8B7B",
    type: "still",
    aspect: "1/1",
  },
];

interface MosaicGridProps {
  header: React.ReactNode;
  footer: React.ReactNode;
}

export default function MosaicGrid({ header, footer }: MosaicGridProps) {
  const [hoveredItem, setHoveredItem] = useState<MosaicItem | null>(null);

  return (
    <div>
      {/* header - aligned with photo columns only */}
      <div className="md:ml-[calc(240px+2rem)]">{header}</div>

      {/* text panel + photos side by side */}
      <div className="flex gap-8 mt-6">
        {/* left: text panel */}
        <div className="hidden md:block w-[240px] shrink-0 sticky top-[8vh] self-start h-fit">
          <div
            className="transition-opacity duration-300"
            style={{ opacity: hoveredItem ? 1 : 0 }}
          >
            {hoveredItem && (
              <>
                <p className="text-lg">{hoveredItem.title}</p>
                <p className="text-sm opacity-60 mt-1">{hoveredItem.type}</p>
                <p className="text-sm opacity-80 mt-3">
                  {hoveredItem.description}
                </p>
              </>
            )}
          </div>
        </div>

        {/* right: photos */}
        <div className="flex-1 columns-1 sm:columns-2 lg:columns-3 gap-3">
          {MOSAIC_ITEMS.map((item) => (
            <div
              key={item.id}
              className="relative overflow-hidden w-full transition-opacity duration-300 hover:opacity-80 cursor-pointer mb-3 break-inside-avoid"
              style={{ backgroundColor: item.color, aspectRatio: item.aspect }}
              onMouseEnter={() => setHoveredItem(item)}
              onMouseLeave={() => setHoveredItem(null)}
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
            </div>
          ))}
        </div>
      </div>

      {/* footer - aligned with photo columns only */}
      <div className="md:ml-[calc(240px+2rem)]">{footer}</div>
    </div>
  );
}
