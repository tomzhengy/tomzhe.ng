"use client";

interface RollingNumberProps {
  value: number | null;
  digits?: number;
  // grouping = true uses locale-aware comma separators (e.g. 1,977)
  grouping?: boolean;
  // pad with leading zeros up to this width (integer part), e.g. "08"
  minIntDigits?: number;
  // expected integer digit count, used to render a same-width placeholder
  // during loading so the layout doesn't shift when the real value lands.
  intDigits?: number;
  // text shown when value is null and intDigits isn't provided.
  fallback?: string;
}

// renders the formatted number as plain text. when null, renders a
// width-matching placeholder so the surrounding layout doesn't shift
// once the real number arrives.
export default function RollingNumber({
  value,
  digits = 0,
  grouping = false,
  minIntDigits,
  intDigits,
  fallback = "—",
}: RollingNumberProps) {
  if (value == null || !Number.isFinite(value)) {
    const placeholderInt = intDigits ?? minIntDigits ?? (digits > 0 ? 2 : 1);
    return <>{buildPlaceholder(placeholderInt, digits, grouping, fallback)}</>;
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

function buildPlaceholder(
  intDigits: number,
  decimals: number,
  grouping: boolean,
  fallback: string,
): string {
  if (intDigits <= 0 && decimals <= 0) return fallback;
  // build "0..0" with optional thousands separators and decimal places
  const intPart = "0".repeat(Math.max(1, intDigits));
  const grouped =
    grouping && intPart.length > 3
      ? intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
      : intPart;
  const decPart = decimals > 0 ? "." + "0".repeat(decimals) : "";
  return grouped + decPart;
}
