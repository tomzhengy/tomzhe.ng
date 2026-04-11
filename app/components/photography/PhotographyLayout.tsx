"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Header from "../sections/Header";
import SocialLinks from "../sections/SocialLinks";
import LastVisitor from "../sections/LastVisitor";
import ThemeToggle from "../ui/theme/ThemeToggle";
import MosaicGrid from "./MosaicGrid";

function wasPageReloaded() {
  if (typeof window === "undefined") return false;
  const entries = performance.getEntriesByType("navigation");
  if (entries.length > 0) {
    return (entries[0] as PerformanceNavigationTiming).type === "reload";
  }
  return false;
}

export default function PhotographyLayout() {
  const router = useRouter();
  const [exiting, setExiting] = useState(false);
  const [exitHref, setExitHref] = useState("");
  const [skipEnterAnimation] = useState(wasPageReloaded);

  const handleNavigate = (href: string) => {
    setExiting(true);
    setExitHref(href);
  };

  const handleContainerAnimationEnd = (e: React.AnimationEvent) => {
    if (exiting && e.target === e.currentTarget) {
      router.push(exitHref);
    }
  };

  return (
    <div
      className={`text-left max-w-[1080px] w-full px-4 pt-[8vh] pb-16 ${
        exiting
          ? "animate-[shrink-width_0.4s_ease_0.3s_forwards]"
          : skipEnterAnimation
            ? ""
            : "animate-[expand-width_0.5s_ease]"
      }`}
      onAnimationEnd={handleContainerAnimationEnd}
    >
      <Header
        ThemeToggleComponent={ThemeToggle}
        currentPage="photography"
        onNavigate={handleNavigate}
      />

      <section
        aria-labelledby="photography"
        className={`mt-6 overflow-hidden ${
          exiting
            ? "animate-[collapse-content_0.3s_ease_forwards]"
            : skipEnterAnimation
              ? ""
              : "animate-[reveal-content_0.4s_ease_0.5s_backwards]"
        }`}
      >
        <MosaicGrid />
      </section>

      <div className="mt-8">
        <SocialLinks />
        <LastVisitor />
      </div>
    </div>
  );
}
