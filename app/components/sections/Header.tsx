"use client";

import { ComponentType } from "react";
import Link from "next/link";
import Tooltip from "../ui/Tooltip";

interface HeaderProps {
  ThemeToggleComponent: ComponentType;
  currentPage?: "home" | "investing" | "blog";
}

export default function Header({
  ThemeToggleComponent,
  currentPage,
}: HeaderProps) {
  return (
    <div className="flex items-center justify-between mb-8 h-8 w-full">
      {/* Navigation links */}
      <div className="flex gap-6 text-lg opacity-85 hover:opacity-100 transition-all">
        <Link
          href="/"
          className={`transition-all ${currentPage === "home" ? "underline" : "hover:underline"}`}
        >
          Tom Zheng
        </Link>
        <Link
          href="/investing"
          className={`transition-all ${currentPage === "investing" ? "underline" : "hover:underline"}`}
        >
          Investing
        </Link>
        <Tooltip text="coming soon!">
          <span className="hover:underline transition-all cursor-not-allowed">
            Blog
          </span>
        </Tooltip>
      </div>

      {/* Theme toggle */}
      <div className="min-w-[24px] min-h-[24px] flex justify-end opacity-85 hover:opacity-100 transition-all">
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
  );
}
