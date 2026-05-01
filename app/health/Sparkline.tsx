"use client";

import { useMemo, useRef, useState } from "react";

interface SparklineProps {
  values: number[];
  // optional iso timestamps aligned with values. when provided, the hover
  // label uses real days-ago and the chart renders month tick labels below
  // for spans long enough to need them.
  dates?: string[];
  color?: string;
  width?: number;
  height?: number;
  dotColor?: string;
  unit?: string;
  digits?: number;
  sharedHoverIdx?: number | null;
  onHoverChange?: (idx: number | null) => void;
}

export default function Sparkline({
  values,
  dates,
  color = "var(--fg-soft)",
  width = 200,
  height = 44,
  dotColor = "var(--accent)",
  unit = "",
  digits = 0,
  sharedHoverIdx,
  onHoverChange,
}: SparklineProps) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [localIdx, setLocalIdx] = useState<number | null>(null);
  const shared = onHoverChange != null;
  const hoverIdx = shared ? (sharedHoverIdx ?? null) : localIdx;

  // month ticks under the chart for spans long enough that points alone
  // don't reveal the timeline. only renders when `dates` is supplied.
  // hook order requires this to live above any early returns.
  const monthTicks = useMemo(() => {
    if (!dates || dates.length < 2) return [];
    const startMs = new Date(dates[0]).getTime();
    const endMs = new Date(dates[dates.length - 1]).getTime();
    const totalDays = (endMs - startMs) / 86_400_000;
    if (totalDays < 60) return [];
    const tickSpan = endMs - startMs;
    const ticks: Array<{ pct: number; label: string }> = [];
    const cur = new Date(startMs);
    cur.setUTCDate(1);
    cur.setUTCMonth(cur.getUTCMonth() + 1);
    while (cur.getTime() <= endMs) {
      ticks.push({
        pct: ((cur.getTime() - startMs) / tickSpan) * 100,
        label: cur.toLocaleDateString(undefined, {
          month: "short",
          year: totalDays > 365 ? "2-digit" : undefined,
        }),
      });
      cur.setUTCMonth(cur.getUTCMonth() + 1);
    }
    if (ticks.length <= 6) return ticks;
    const step = Math.ceil(ticks.length / 6);
    return ticks.filter((_, i) => i % step === 0);
  }, [dates]);

  if (!values.length) {
    return (
      <div style={{ position: "relative", marginTop: 14 }}>
        <svg
          className="spark"
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="none"
          style={{ width: "100%", height, display: "block" }}
        />
      </div>
    );
  }

  const padX = 4;
  const padTop = 8;
  const padBottom = 4;
  const clean = values.map((v) => (Number.isFinite(v) ? v : 0));
  const min = Math.min(...clean);
  const max = Math.max(...clean);
  const span = max - min || 1;
  const step = values.length > 1 ? (width - padX * 2) / (values.length - 1) : 0;

  const yFor = (v: number) =>
    padTop + (1 - (v - min) / span) * (height - padTop - padBottom);
  const xFor = (i: number) => padX + i * step;

  // a single datapoint produces just `M x y` which has no visible stroke.
  // draw a flat horizontal line across the chart at that value instead so
  // the user sees something even with sparse data.
  const d =
    clean.length === 1
      ? `M ${padX.toFixed(1)} ${yFor(clean[0]).toFixed(1)} L ${(width - padX).toFixed(1)} ${yFor(clean[0]).toFixed(1)}`
      : clean
          .map(
            (v, i) =>
              `${i === 0 ? "M" : "L"} ${xFor(i).toFixed(1)} ${yFor(v).toFixed(1)}`,
          )
          .join(" ");

  const lastX = xFor(clean.length - 1);
  const lastY = yFor(clean[clean.length - 1]);

  const handleMove = (e: React.MouseEvent<SVGRectElement>) => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const rect = wrap.getBoundingClientRect();
    const svgX = ((e.clientX - rect.left) / rect.width) * width;
    let idx = Math.round((svgX - padX) / (step || 1));
    idx = Math.max(0, Math.min(clean.length - 1, idx));
    if (shared) onHoverChange!(idx);
    else setLocalIdx(idx);
  };

  const handleLeave = () => {
    if (shared) onHoverChange!(null);
    else setLocalIdx(null);
  };

  const hoverValue =
    hoverIdx != null && hoverIdx < clean.length ? clean[hoverIdx] : null;
  const hoverX = hoverIdx != null ? xFor(hoverIdx) : 0;
  const hoverY = hoverValue != null ? yFor(hoverValue) : 0;

  // hover labels: when real dates are provided, compute days-ago + format
  // an absolute date so long-range views aren't ambiguous. otherwise fall
  // back to array-index distance (works for daily series like whoop trend).
  const hoverIso =
    hoverIdx != null && dates && dates[hoverIdx] ? dates[hoverIdx] : null;
  const dayLabel = (() => {
    if (hoverIdx == null) return "";
    if (hoverIso) {
      const ms = new Date(hoverIso).getTime();
      const days = Math.round((Date.now() - ms) / 86_400_000);
      if (days <= 0) return "today";
      if (days === 1) return "1 day ago";
      return `${days} days ago`;
    }
    const idxAgo = clean.length - 1 - hoverIdx;
    if (idxAgo === 0) return "today";
    return idxAgo === 1 ? "1 day ago" : `${idxAgo} days ago`;
  })();
  const dateLabel = hoverIso
    ? new Date(hoverIso).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null;

  // smooths the hover indicator's slide between snapped indices.
  const HOVER_EASE = "linear";
  const HOVER_DUR = "130ms";
  const slideTransition = `left ${HOVER_DUR} ${HOVER_EASE}, top ${HOVER_DUR} ${HOVER_EASE}`;
  const showHover = hoverIdx != null && hoverValue != null;
  const hoverLeftPct = `${(hoverX / width) * 100}%`;

  return (
    <div ref={wrapRef} style={{ position: "relative", marginTop: 14 }}>
      <svg
        className="spark"
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        style={{ width: "100%", height, display: "block" }}
      >
        <path
          d={d}
          fill="none"
          stroke={color}
          strokeWidth={1.25}
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
        <rect
          x={0}
          y={0}
          width={width}
          height={height}
          fill="transparent"
          style={{ cursor: "crosshair" }}
          onMouseMove={handleMove}
          onMouseLeave={handleLeave}
        />
      </svg>

      {/* end-of-series marker as html overlay so it stays a perfect square
          regardless of how the svg is stretched horizontally. */}
      {clean.length > 0 && (
        <div
          style={{
            position: "absolute",
            left: `${(lastX / width) * 100}%`,
            top: lastY,
            width: 6,
            height: 6,
            background: dotColor,
            transform: "translate(-50%, -50%)",
            pointerEvents: "none",
          }}
        />
      )}

      {/* hover line as html overlay (was an svg <line>) so it can transition
          smoothly between snapped indices. dashed via border-left. */}
      <div
        style={{
          position: "absolute",
          left: hoverLeftPct,
          top: padTop,
          height: height - padTop - padBottom,
          width: 0,
          borderLeft: "1px dashed var(--fg-mute)",
          transform: "translateX(-0.5px)",
          pointerEvents: "none",
          opacity: showHover ? 1 : 0,
          transition: `${slideTransition}, opacity 100ms linear`,
        }}
      />

      {/* hover dot as html overlay — circular regardless of stretch. */}
      <div
        style={{
          position: "absolute",
          left: hoverLeftPct,
          top: hoverY,
          width: 7,
          height: 7,
          borderRadius: "50%",
          background: dotColor,
          border: "1.5px solid var(--background)",
          transform: "translate(-50%, -50%)",
          pointerEvents: "none",
          opacity: showHover ? 1 : 0,
          transition: `${slideTransition}, opacity 100ms linear`,
        }}
      />

      {showHover && (
        <div
          style={{
            position: "absolute",
            left: hoverLeftPct,
            top: -4,
            transform: "translate(-50%, -100%)",
            background: "var(--card-elev)",
            border: "1px solid var(--rule-strong)",
            padding: "6px 8px",
            fontFamily: "var(--f-mono)",
            fontSize: 10,
            letterSpacing: "0.06em",
            color: "var(--fg)",
            pointerEvents: "none",
            whiteSpace: "nowrap",
            zIndex: 10,
            lineHeight: 1.4,
            transition: slideTransition,
          }}
        >
          <div>
            {hoverValue.toFixed(digits)}
            {unit && (
              <span style={{ color: "var(--fg-mute)", marginLeft: 3 }}>
                {unit}
              </span>
            )}
          </div>
          {dateLabel && (
            <div style={{ color: "var(--fg-mute)" }}>{dateLabel}</div>
          )}
          <div style={{ color: "var(--fg-mute)" }}>{dayLabel}</div>
        </div>
      )}

      {monthTicks.length > 0 && (
        <div
          style={{
            position: "relative",
            height: 14,
            marginTop: 6,
            fontFamily: "var(--f-mono)",
            fontSize: 9,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "var(--fg-mute)",
          }}
        >
          {monthTicks.map((t) => (
            <span
              key={`${t.label}-${t.pct}`}
              style={{
                position: "absolute",
                left: `${t.pct}%`,
                top: 0,
                transform: "translateX(-50%)",
                whiteSpace: "nowrap",
              }}
            >
              {t.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
