"use client";

import { useRef, useState } from "react";

interface SparklineProps {
  values: number[];
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

  const d = clean
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

  const daysAgo = hoverIdx != null ? clean.length - 1 - hoverIdx : 0;
  const dayLabel =
    daysAgo === 0
      ? "today"
      : daysAgo === 1
        ? "1 day ago"
        : `${daysAgo} days ago`;

  return (
    <div ref={wrapRef} style={{ position: "relative", marginTop: 14 }}>
      <svg
        className="spark"
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        style={{ width: "100%", height, display: "block" }}
      >
        <path d={d} fill="none" stroke={color} strokeWidth={1.25} />
        <rect
          x={lastX - 3}
          y={lastY - 3}
          width={6}
          height={6}
          fill={dotColor}
        />
        {hoverIdx != null && hoverValue != null && (
          <>
            <line
              x1={hoverX}
              x2={hoverX}
              y1={padTop}
              y2={height - padBottom}
              stroke="var(--fg-mute)"
              strokeWidth={1}
              strokeDasharray="2 3"
              pointerEvents="none"
            />
            <circle
              cx={hoverX}
              cy={hoverY}
              r={3}
              fill={dotColor}
              stroke="var(--background)"
              strokeWidth={1.5}
              pointerEvents="none"
            />
          </>
        )}
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

      {hoverIdx != null && hoverValue != null && (
        <div
          style={{
            position: "absolute",
            left:
              (hoverX / width) *
              (wrapRef.current?.getBoundingClientRect().width ?? width),
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
          <div style={{ color: "var(--fg-mute)" }}>{dayLabel}</div>
        </div>
      )}
    </div>
  );
}
