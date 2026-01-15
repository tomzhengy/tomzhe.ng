"use client";

import { ComponentType } from "react";
import Tooltip from "../ui/Tooltip";

interface HeaderProps {
  currentTime: string;
  ThemeToggleComponent: ComponentType;
  currentPage?: "investing" | "writings";
}

export default function Header({
  currentTime,
  ThemeToggleComponent,
  currentPage,
}: HeaderProps) {
  return (
    <div className="flex items-center justify-between mb-8 h-8 w-full">
      <div className="relative">
        <a
          href="/"
          className="text-lg opacity-85 hover:opacity-100 min-w-[120px] h-8 flex items-center transition-all"
        >
          {currentTime}
        </a>
      </div>

      <div className="flex items-center gap-6">
        {/* Navigation links */}
        <div className="text-base opacity-85 hover:opacity-100 transition-all">
          <a
            href="/investing"
            className={`transition-all ${currentPage === "investing" ? "underline" : "hover:underline"}`}
          >
            investing
          </a>
          <span className="mx-2">•</span>
          <Tooltip text="coming soon!">
            <a href="#" className="hover:underline transition-all">
              writings
            </a>
          </Tooltip>
        </div>

        {/* Theme toggle */}
        <div className="min-w-[24px] min-h-[24px] flex justify-end opacity-85 hover:opacity-100 transition-all ml-auto">
          <div
            className="transform hover:rotate-12 transition-transform"
            style={{
              transitionDuration: "var(--animation-short)",
              transitionTimingFunction: "var(--transition-timing)",
            }}
          >
            <ThemeToggleComponent />
          </div>
        </div>
      </div>
    </div>
  );
}
