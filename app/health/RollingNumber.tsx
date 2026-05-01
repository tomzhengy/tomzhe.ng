"use client";

interface RollingNumberProps {
  value: number | null;
  digits?: number;
  // grouping = true uses locale-aware comma separators (e.g. 1,977)
  grouping?: boolean;
  // pad with leading zeros up to this width (integer part), e.g. "08"
  minIntDigits?: number;
  // text shown when value is null, e.g. "—"
  fallback?: string;
}

// renders the formatted number as plain text. animation is disabled for now;
// restore the count-up by wrapping the value in a useEffect-driven rAF tween
// (previous implementation in git history).
export default function RollingNumber({
  value,
  digits = 0,
  grouping = false,
  minIntDigits,
  fallback = "—",
}: RollingNumberProps) {
  if (value == null || !Number.isFinite(value)) {
    return <>{fallback}</>;
  }

  return (
    <>
      {value.toLocaleString(undefined, {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
        useGrouping: grouping,
        minimumIntegerDigits: minIntDigits,
      })}
    </>
  );
}
