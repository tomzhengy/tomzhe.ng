"use client";

import { useMemo, useRef, useState } from "react";

export type Stage = "awake" | "rem" | "light" | "deep";

export interface HypnoSegment {
  stage: Stage;
  startMs: number;
  endMs: number;
}

interface HypnogramProps {
  segments: HypnoSegment[];
  startIso: string;
  endIso: string;
}

const PLATEAU_Y: Record<Stage, number> = {
  awake: 16,
  rem: 46,
  light: 82,
  deep: 118,
};
const FLOOR = 136;
const VIEW_W = 800;
const VIEW_H = 140;

const STAGE_COLOR: Record<Stage, string> = {
  awake: "var(--accent)",
  rem: "color-mix(in oklab, var(--select) 70%, var(--fg))",
  light: "var(--select)",
  deep: "color-mix(in oklab, var(--select) 55%, #000)",
};

export default function Hypnogram({
  segments,
  startIso,
  endIso,
}: HypnogramProps) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [tip, setTip] = useState<{ x: number; y: number; text: string } | null>(
    null,
  );

  const { segs, totalMs } = useMemo(() => {
    if (!segments.length) return { segs: [], totalMs: 1 };
    const t0 = segments[0].startMs;
    const tN = segments[segments.length - 1].endMs;
    const total = Math.max(1, tN - t0);
    const scale = (ms: number) => ((ms - t0) / total) * VIEW_W;
    return {
      segs: segments.map((s) => ({
        stage: s.stage,
        x0: scale(s.startMs),
        x1: scale(s.endMs),
        y: PLATEAU_Y[s.stage],
        durationMin: Math.round((s.endMs - s.startMs) / 60000),
      })),
      totalMs: total,
    };
  }, [segments]);

  const outlinePath = useMemo(() => {
    if (!segs.length) return "";
    return segs
      .map((s, i) =>
        i === 0
          ? `M ${s.x0} ${s.y} L ${s.x1} ${s.y}`
          : ` L ${s.x0} ${s.y} L ${s.x1} ${s.y}`,
      )
      .join("");
  }, [segs]);

  const axisLabels = useMemo(() => {
    if (!segments.length) return [] as string[];
    const t0 = segments[0].startMs;
    const tN = segments[segments.length - 1].endMs;
    const pts = [0, 0.25, 0.5, 0.75, 1];
    return pts.map((p) => {
      const t = t0 + (tN - t0) * p;
      return new Date(t).toLocaleTimeString(undefined, {
        hour: "numeric",
        minute: "2-digit",
      });
    });
  }, [segments]);

  const handleMove = (
    e: React.MouseEvent<SVGRectElement>,
    seg: (typeof segs)[number],
  ) => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const r = wrap.getBoundingClientRect();
    setTip({
      x: e.clientX - r.left,
      y: e.clientY - r.top,
      text: `${seg.stage.toUpperCase()} · ${seg.durationMin} min`,
    });
  };

  void totalMs;
  void startIso;
  void endIso;

  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        preserveAspectRatio="none"
        style={{ width: "100%", height: 140, display: "block" }}
      >
        {segs.map((s, i) => (
          <rect
            key={`fill-${i}`}
            x={s.x0}
            y={s.y}
            width={Math.max(0, s.x1 - s.x0)}
            height={FLOOR - s.y}
            fill={STAGE_COLOR[s.stage]}
            fillOpacity={0.22}
          />
        ))}

        {outlinePath && (
          <path
            d={outlinePath}
            fill="none"
            stroke="var(--fg)"
            strokeWidth={1.25}
            strokeOpacity={0.85}
            strokeLinejoin="miter"
          />
        )}

        {segs.map((s, i) => (
          <line
            key={`cap-${i}`}
            x1={s.x0}
            x2={s.x1}
            y1={s.y}
            y2={s.y}
            stroke={STAGE_COLOR[s.stage]}
            strokeWidth={2.5}
          />
        ))}

        {segs.map((s, i) => (
          <rect
            key={`hit-${i}`}
            x={s.x0}
            y={0}
            width={Math.max(0, s.x1 - s.x0)}
            height={FLOOR}
            fill="transparent"
            style={{ cursor: "pointer" }}
            onMouseMove={(e) => handleMove(e, s)}
            onMouseLeave={() => setTip(null)}
          />
        ))}
      </svg>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontFamily: "var(--f-mono)",
          fontSize: 10,
          letterSpacing: "0.08em",
          color: "var(--fg-mute)",
          marginTop: 6,
        }}
      >
        {axisLabels.map((l, i) => (
          <span key={i}>{l}</span>
        ))}
      </div>

      {tip && (
        <div
          style={{
            position: "absolute",
            left: tip.x,
            top: tip.y,
            background: "var(--card-elev)",
            border: "1px solid var(--rule-strong)",
            padding: "8px 10px",
            fontFamily: "var(--f-mono)",
            fontSize: 11,
            color: "var(--fg)",
            pointerEvents: "none",
            whiteSpace: "nowrap",
            zIndex: 10,
            transform: "translate(-50%, -110%)",
          }}
        >
          {tip.text}
        </div>
      )}
    </div>
  );
}
