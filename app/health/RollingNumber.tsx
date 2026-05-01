"use client";

import { useEffect, useRef, useState } from "react";

interface RollingNumberProps {
  value: number | null;
  digits?: number;
  duration?: number;
  // grouping = true uses locale-aware comma separators (e.g. 1,977)
  grouping?: boolean;
  // pad with leading zeros up to this width (integer part), e.g. "08"
  minIntDigits?: number;
  // text shown when value is null, e.g. "—"
  fallback?: string;
}

const DEFAULT_DURATION = 1100;

// renders a number that smoothly counts up to its target on mount and
// re-animates whenever the target changes. the markup is plain text inside
// a fragment so it inherits the parent's font, weight, color, line-height,
// and baseline behavior — no per-digit clipping or layout overrides.
export default function RollingNumber({
  value,
  digits = 0,
  duration = DEFAULT_DURATION,
  grouping = false,
  minIntDigits,
  fallback = "—",
}: RollingNumberProps) {
  const [shown, setShown] = useState<number | null>(null);
  const fromRef = useRef<number>(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (value == null || !Number.isFinite(value)) {
      setShown(null);
      return;
    }
    const target = value;
    const from = shown ?? 0;
    fromRef.current = from;
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
    // intentionally only depend on the target so each new value re-tweens
    // from the live displayed value (captured fresh in the closure).
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
