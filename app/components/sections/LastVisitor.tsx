"use client";

import { useLastVisitor } from "./LastVisitorProvider";

export default function LastVisitor() {
  const { lastVisitor, loading, displayedLocation, isTyping } =
    useLastVisitor();

  // Don't render if we're still loading
  if (loading) {
    return (
      <div className="text-sm text-foreground/50 mb-4">
        last visit from <span className="inline-block animate-[blink_0.5s_ease_infinite]">_</span>
      </div>
    );
  }

  if (!lastVisitor || !lastVisitor.city || !lastVisitor.country) {
    return null;
  }

  return (
    <div className="text-sm text-foreground/50 mb-4">
      last visit from {displayedLocation}
      <span
        className={`inline-block ${isTyping ? "" : "animate-[blink_0.5s_ease_infinite]"}`}
      >
        _
      </span>
    </div>
  );
}
