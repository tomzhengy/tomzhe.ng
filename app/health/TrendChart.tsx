"use client";

import { useMemo, useRef, useState } from "react";
import type { TrendPoint } from "./types";

interface TrendChartProps {
  data: TrendPoint[];
  onPointClick?: (idx: number) => void;
}

const VIEW_W = 1000;
const VIEW_H = 260;
const PAD = { t: 20, r: 20, b: 30, l: 40 };
const LINES = [
  { key: "recovery", color: "var(--ok)", min: 0, max: 100 },
  { key: "strain", color: "var(--accent)", min: 0, max: 21 },
  { key: "sleep", color: "var(--select)", min: 0, max: 10 },
] as const;

export default function TrendChart({ data, onPointClick }: TrendChartProps) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [hover, setHover] = useState<{
    idx: number;
    clientX: number;
    clientY: number;
  } | null>(null);

  const innerW = VIEW_W - PAD.l - PAD.r;
  const innerH = VIEW_H - PAD.t - PAD.b;
  const n = data.length;
  const stepX = n > 1 ? innerW / (n - 1) : 0;

  const xFor = (i: number) => PAD.l + i * stepX;
  const yForNorm = (v: number, min: number, max: number) =>
    PAD.t + innerH - ((v - min) / (max - min)) * innerH;

  const paths = useMemo(() => {
    return LINES.map((ln) => {
      let d = "";
      data.forEach((dp, i) => {
        const raw = (dp as Record<string, number | string | null>)[ln.key];
        if (raw == null || typeof raw !== "number" || !Number.isFinite(raw))
          return;
        const x = xFor(i);
        const y = yForNorm(raw, ln.min, ln.max);
        d += d
          ? ` L ${x.toFixed(1)} ${y.toFixed(1)}`
          : `M ${x.toFixed(1)} ${y.toFixed(1)}`;
      });
      return { ...ln, d };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  const gridYs = [0, 0.25, 0.5, 0.75, 1].map((g) => PAD.t + innerH * (1 - g));

  const axisTicks = useMemo(() => {
    if (n === 0) return [];
    const positions = [0, 0.25, 0.5, 0.75, 1].map((p) =>
      Math.min(n - 1, Math.max(0, Math.round(p * (n - 1)))),
    );
    return positions.map((i) => {
      const d = new Date(data[i].date);
      return d.toLocaleDateString(undefined, {
        day: "numeric",
        month: "short",
      });
    });
  }, [data, n]);

  const handleMove = (e: React.MouseEvent<SVGRectElement>) => {
    const wrap = wrapRef.current;
    if (!wrap || n === 0) return;
    const r = wrap.getBoundingClientRect();
    const svgX = ((e.clientX - r.left) / r.width) * VIEW_W;
    let idx = Math.round((svgX - PAD.l) / (stepX || 1));
    idx = Math.max(0, Math.min(n - 1, idx));
    setHover({ idx, clientX: e.clientX - r.left, clientY: e.clientY - r.top });
  };

  const active = hover ? data[hover.idx] : null;
  const activePx = hover != null ? xFor(hover.idx) : 0;

  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        preserveAspectRatio="none"
        style={{ width: "100%", height: 260, display: "block" }}
      >
        {gridYs.map((y, i) => (
          <line
            key={`g-${i}`}
            x1={PAD.l}
            x2={VIEW_W - PAD.r}
            y1={y}
            y2={y}
            stroke="var(--rule)"
            strokeWidth={1}
            strokeDasharray="2 4"
          />
        ))}

        {paths.map((ln) => (
          <path
            key={ln.key}
            d={ln.d}
            fill="none"
            stroke={ln.color}
            strokeWidth={1.75}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}

        {hover && (
          <>
            <line
              x1={activePx}
              x2={activePx}
              y1={PAD.t}
              y2={PAD.t + innerH}
              stroke="var(--fg-mute)"
              strokeWidth={1}
              strokeDasharray="2 3"
              pointerEvents="none"
            />
            {LINES.map((ln) => {
              const raw = (
                active as Record<string, number | string | null> | null
              )?.[ln.key];
              if (raw == null || typeof raw !== "number") return null;
              return (
                <circle
                  key={`dot-${ln.key}`}
                  cx={activePx}
                  cy={yForNorm(raw, ln.min, ln.max)}
                  r={4.5}
                  fill={ln.color}
                  stroke="var(--background)"
                  strokeWidth={2}
                  pointerEvents="none"
                />
              );
            })}
          </>
        )}

        <rect
          x={PAD.l}
          y={PAD.t}
          width={innerW}
          height={innerH}
          fill="transparent"
          style={{ cursor: onPointClick ? "pointer" : "default" }}
          onMouseMove={handleMove}
          onMouseLeave={() => setHover(null)}
          onClick={() => {
            if (hover && onPointClick) onPointClick(hover.idx);
          }}
        />
      </svg>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontFamily: "var(--f-mono)",
          fontSize: 10,
          color: "var(--fg-mute)",
          letterSpacing: "0.08em",
          marginTop: 6,
        }}
      >
        {axisTicks.map((t, i) => (
          <span key={i}>{t}</span>
        ))}
      </div>

      {hover && active && (
        <div
          style={{
            position: "absolute",
            left:
              (activePx / VIEW_W) *
              (wrapRef.current?.getBoundingClientRect().width ?? VIEW_W),
            top: hover.clientY,
            background: "var(--card-elev)",
            border: "1px solid var(--rule-strong)",
            padding: "10px 12px",
            fontFamily: "var(--f-mono)",
            fontSize: 11,
            color: "var(--fg)",
            pointerEvents: "none",
            whiteSpace: "nowrap",
            zIndex: 10,
            transform: "translate(-50%, -120%)",
            minWidth: 140,
          }}
        >
          <div
            style={{
              fontFamily: "var(--f-serif)",
              fontSize: 14,
              fontStyle: "italic",
              marginBottom: 4,
              borderBottom: "1px solid var(--rule)",
              paddingBottom: 4,
              letterSpacing: 0,
            }}
          >
            {new Date(active.date).toLocaleDateString(undefined, {
              weekday: "short",
              day: "numeric",
              month: "short",
            })}
          </div>
          <Row
            label="Recovery"
            value={active.recovery != null ? `${active.recovery}%` : "—"}
          />
          <Row
            label="Strain"
            value={active.strain != null ? `${active.strain.toFixed(1)}` : "—"}
          />
          <Row
            label="Sleep"
            value={active.sleep != null ? `${active.sleep.toFixed(1)}h` : "—"}
          />
          <Row
            label="HRV"
            value={active.hrv != null ? `${active.hrv}ms` : "—"}
          />
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 18 }}>
      <span style={{ color: "var(--fg-mute)" }}>{label}</span>
      <span>{value}</span>
    </div>
  );
}
