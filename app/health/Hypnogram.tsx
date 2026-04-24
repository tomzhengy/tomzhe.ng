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

// horizontal band per stage: top = y offset, h = band height
const BAND: Record<Stage, { top: number; h: number }> = {
  awake: { top: 10, h: 24 },
  rem: { top: 42, h: 28 },
  light: { top: 78, h: 30 },
  deep: { top: 116, h: 22 },
};
const VIEW_W = 800;
const VIEW_H = 148;

// monochromatic depth scale: awake (lightest) -> deep (darkest)
const STAGE_COLOR: Record<Stage, string> = {
  awake: "color-mix(in oklab, var(--foreground) 22%, var(--background))",
  light: "color-mix(in oklab, var(--foreground) 45%, var(--background))",
  rem: "color-mix(in oklab, var(--foreground) 68%, var(--background))",
  deep: "var(--foreground)",
};

const STAGE_LABEL: Record<Stage, string> = {
  awake: "AWAKE",
  rem: "REM",
  light: "LIGHT",
  deep: "DEEP",
};

const STAGE_ORDER: Stage[] = ["awake", "rem", "light", "deep"];

const CONNECTOR_W = 3;

export default function Hypnogram({
  segments,
  startIso,
  endIso,
}: HypnogramProps) {
  const svgWrapRef = useRef<HTMLDivElement | null>(null);
  const [tip, setTip] = useState<{
    xPx: number;
    svgX: number;
    text: string;
  } | null>(null);

  const { segs, connectors, totalMs } = useMemo(() => {
    if (!segments.length) return { segs: [], connectors: [], totalMs: 1 };
    const t0 = segments[0].startMs;
    const tN = segments[segments.length - 1].endMs;
    const total = Math.max(1, tN - t0);
    const scale = (ms: number) => ((ms - t0) / total) * VIEW_W;
    const mapped = segments.map((s) => ({
      stage: s.stage,
      x0: scale(s.startMs),
      x1: scale(s.endMs),
      band: BAND[s.stage],
      durationMin: Math.round((s.endMs - s.startMs) / 60000),
    }));
    const bridges: Array<{
      x: number;
      yTop: number;
      yBot: number;
      gapStartPct: number;
      gapEndPct: number;
      upperStage: Stage;
      lowerStage: Stage;
    }> = [];
    for (let i = 0; i < mapped.length - 1; i++) {
      const a = mapped[i];
      const b = mapped[i + 1];
      if (a.stage === b.stage) continue;
      const aUp = BAND[a.stage].top <= BAND[b.stage].top;
      const upperStage = aUp ? a.stage : b.stage;
      const lowerStage = aUp ? b.stage : a.stage;
      const U = BAND[upperStage];
      const L = BAND[lowerStage];
      const yTop = U.top;
      const yBot = L.top + L.h;
      const total = yBot - yTop;
      bridges.push({
        x: a.x1,
        yTop,
        yBot,
        gapStartPct: (U.h / total) * 100,
        gapEndPct: ((L.top - yTop) / total) * 100,
        upperStage,
        lowerStage,
      });
    }
    return { segs: mapped, connectors: bridges, totalMs: total };
  }, [segments]);

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
    const wrap = svgWrapRef.current;
    if (!wrap) return;
    const r = wrap.getBoundingClientRect();
    const xPx = e.clientX - r.left;
    const svgX = r.width > 0 ? (xPx / r.width) * VIEW_W : 0;
    setTip({
      xPx,
      svgX,
      text: `${seg.stage.toUpperCase()} · ${seg.durationMin} min`,
    });
  };

  void totalMs;
  void startIso;
  void endIso;

  const labelStyle: React.CSSProperties = {
    position: "absolute",
    left: 0,
    fontFamily: "var(--f-mono)",
    fontSize: 10,
    letterSpacing: "0.14em",
    textTransform: "uppercase",
    color: "var(--fg-mute)",
    lineHeight: 1,
  };

  return (
    <div
      style={{
        position: "relative",
        display: "flex",
        alignItems: "flex-start",
        gap: 10,
      }}
    >
      <div
        style={{
          position: "relative",
          width: 44,
          height: VIEW_H,
          flexShrink: 0,
        }}
      >
        {STAGE_ORDER.map((st) => (
          <span
            key={`label-${st}`}
            style={{
              ...labelStyle,
              top: BAND[st].top + BAND[st].h / 2 - 5,
            }}
          >
            {STAGE_LABEL[st]}
          </span>
        ))}
      </div>

      <div
        ref={svgWrapRef}
        style={{ flex: 1, minWidth: 0, position: "relative" }}
      >
        <svg
          viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
          preserveAspectRatio="none"
          style={{ width: "100%", height: VIEW_H, display: "block" }}
        >
          <defs>
            {connectors.map((c, i) => (
              <linearGradient
                key={`grad-${i}`}
                id={`hypno-conn-${i}`}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop
                  offset="0%"
                  style={{ stopColor: STAGE_COLOR[c.upperStage] }}
                />
                <stop
                  offset={`${c.gapStartPct}%`}
                  style={{ stopColor: STAGE_COLOR[c.upperStage] }}
                />
                <stop
                  offset={`${c.gapEndPct}%`}
                  style={{ stopColor: STAGE_COLOR[c.lowerStage] }}
                />
                <stop
                  offset="100%"
                  style={{ stopColor: STAGE_COLOR[c.lowerStage] }}
                />
              </linearGradient>
            ))}
          </defs>

          {STAGE_ORDER.slice(0, -1).map((st, i) => {
            const U = BAND[st];
            const L = BAND[STAGE_ORDER[i + 1]];
            const y = (U.top + U.h + L.top) / 2;
            return (
              <line
                key={`sep-${st}`}
                x1={0}
                x2={VIEW_W}
                y1={y}
                y2={y}
                stroke="var(--rule)"
                strokeWidth={1}
                strokeDasharray="2 4"
              />
            );
          })}

          {segs.map((s, i) => (
            <rect
              key={`fill-${i}`}
              x={s.x0}
              y={s.band.top}
              width={Math.max(0, s.x1 - s.x0)}
              height={s.band.h}
              fill={STAGE_COLOR[s.stage]}
            />
          ))}

          {connectors.map((c, i) => (
            <rect
              key={`conn-${i}`}
              x={c.x - CONNECTOR_W / 2}
              y={c.yTop}
              width={CONNECTOR_W}
              height={c.yBot - c.yTop}
              fill={`url(#hypno-conn-${i})`}
            />
          ))}

          {segs.map((s, i) => (
            <rect
              key={`hit-${i}`}
              x={s.x0}
              y={0}
              width={Math.max(0, s.x1 - s.x0)}
              height={VIEW_H}
              fill="transparent"
              style={{ cursor: "pointer" }}
              onMouseMove={(e) => handleMove(e, s)}
              onMouseLeave={() => setTip(null)}
            />
          ))}

          {tip && (
            <line
              x1={tip.svgX}
              x2={tip.svgX}
              y1={0}
              y2={VIEW_H}
              stroke="var(--fg-mute)"
              strokeWidth={1}
              strokeDasharray="2 3"
              pointerEvents="none"
            />
          )}
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
              left: tip.xPx,
              top: 8,
              background: "var(--card-elev)",
              border: "1px solid var(--rule-strong)",
              padding: "8px 10px",
              fontFamily: "var(--f-mono)",
              fontSize: 11,
              color: "var(--foreground)",
              pointerEvents: "none",
              whiteSpace: "nowrap",
              zIndex: 10,
              transform: "translate(-50%, 0)",
            }}
          >
            {tip.text}
          </div>
        )}
      </div>
    </div>
  );
}
