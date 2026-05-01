"use client";

import { useEffect, useRef, useState } from "react";

interface RollingNumberProps {
  value: number | null;
  digits?: number;
  // duration in ms
  duration?: number;
  grouping?: boolean;
  // pad with leading zeros up to this width (integer part), e.g. "08"
  minIntDigits?: number;
  fallback?: string;
}

const DEFAULT_DURATION = 1100;

// renders a number that smoothly counts up to its target on mount, and
// re-tweens whenever the target changes. the markup is plain text inside
// a fragment so it inherits font, weight, color, and baseline behavior
// exactly as a static text node would. trade-off: no per-digit slot-roll
// (instrument serif lacks tabular figures, which is what makes that effect
// look right), just a smooth value count-up.
export default function RollingNumber({
  value,
  digits = 0,
  duration = DEFAULT_DURATION,
  grouping = false,
  minIntDigits,
  fallback = "—",
}: RollingNumberProps) {
  const [shown, setShown] = useState<number | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (value == null || !Number.isFinite(value)) {
      setShown(null);
      return;
    }
    const target = value;
    const from = shown ?? 0;
    const startTs = performance.now();

    const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

    const tick = (now: number) => {
      const t = Math.min(1, (now - startTs) / duration);
      const eased = easeOutCubic(t);
      const v = from + (target - from) * eased;
      setShown(t < 1 ? v : target);
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, duration]);

  if (shown == null) {
    return <>{fallback}</>;
  }

  return (
    <>
      {shown.toLocaleString(undefined, {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
        useGrouping: grouping,
        minimumIntegerDigits: minIntDigits,
      })}
    </>
  );
}
