"use client";

import SlotCounter from "react-slot-counter";

interface RollingNumberProps {
  value: number | null;
  digits?: number;
  // duration in ms, mapped to react-slot-counter's seconds value
  duration?: number;
  grouping?: boolean;
  // pad with leading zeros up to this width (integer part), e.g. "08"
  minIntDigits?: number;
  fallback?: string;
}

const DEFAULT_DURATION_MS = 900;

// thin wrapper around react-slot-counter that handles our value formatting
// (digits, grouping, leading zeros) and passes a string to the slot counter
// so it can do per-character roll animation. inherits font, size, color,
// and line-height from the parent.
export default function RollingNumber({
  value,
  digits = 0,
  duration = DEFAULT_DURATION_MS,
  grouping = false,
  minIntDigits,
  fallback = "—",
}: RollingNumberProps) {
  if (value == null || !Number.isFinite(value)) {
    return <>{fallback}</>;
  }

  const formatted = value.toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
    useGrouping: grouping,
    minimumIntegerDigits: minIntDigits,
  });

  return (
    <SlotCounter
      value={formatted}
      duration={duration / 1000}
      useMonospaceWidth
      direction="bottom-up"
    />
  );
}
