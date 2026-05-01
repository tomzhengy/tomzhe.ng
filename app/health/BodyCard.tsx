"use client";

import { useMemo, useRef, useState } from "react";
import type { BodyData, BodyMeasurement } from "./types";
import { CardHead } from "./StrainCard";
import { formatClockTime, formatDateShort } from "./format";

interface BodyCardProps {
  body: BodyData | null;
}

type Range = "3m" | "6m" | "1y" | "all";

const RANGE_DAYS: Record<Range, number | null> = {
  "3m": 90,
  "6m": 180,
  "1y": 365,
  all: null,
};

const RANGE_LABEL: Record<Range, string> = {
  "3m": "3M",
  "6m": "6M",
  "1y": "1Y",
  all: "All",
};

export default function BodyCard({ body }: BodyCardProps) {
  const trend = useMemo(() => body?.trend ?? [], [body]);
  const [range, setRange] = useState<Range>("1y");

  // withings often splits a single weigh-in across multiple rows (one for
  // weight, one for pwv, etc.). build a composite "latest" by walking the
  // sorted trend backward and keeping the first non-null value for each field.
  const latest = useMemo<BodyMeasurement | null>(() => {
    if (trend.length === 0) return body?.latest ?? null;
    return mergeLatest(trend, body?.latest ?? null);
  }, [trend, body]);

  // weight points filtered by range, sorted by time
  const weightSeries = useMemo(() => {
    const days = RANGE_DAYS[range];
    const cutoff = days != null ? Date.now() - days * 86_400_000 : 0;
    return trend
      .filter((p) => p.weightKg != null)
      .filter((p) => days == null || new Date(p.measuredAt).getTime() >= cutoff)
      .map((p) => ({
        date: new Date(p.measuredAt),
        w: p.weightKg as number,
      }))
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [trend, range]);

  // body fat delta vs prior measurement that has a body-fat reading
  const bfDelta = useMemo(() => {
    if (!latest || latest.bodyFatPct == null) return null;
    const sorted = [...trend].sort(
      (a, b) =>
        new Date(a.measuredAt).getTime() - new Date(b.measuredAt).getTime(),
    );
    for (let i = sorted.length - 2; i >= 0; i--) {
      const p = sorted[i];
      if (p.bodyFatPct != null) {
        return latest.bodyFatPct - p.bodyFatPct;
      }
    }
    return null;
  }, [latest, trend]);

  // ~30 days ago measurement, used for "vs last month" deltas
  const monthAgo = useMemo<BodyMeasurement | null>(() => {
    const cutoff = Date.now() - 30 * 86_400_000;
    const sorted = [...trend].sort(
      (a, b) =>
        new Date(a.measuredAt).getTime() - new Date(b.measuredAt).getTime(),
    );
    let best: BodyMeasurement | null = null;
    for (const p of sorted) {
      if (new Date(p.measuredAt).getTime() <= cutoff) best = p;
      else break;
    }
    return best;
  }, [trend]);

  const summary = useMemo(() => {
    if (weightSeries.length < 2) return null;
    const first = weightSeries[0];
    const last = weightSeries[weightSeries.length - 1];
    const days = Math.max(
      1,
      Math.round((last.date.getTime() - first.date.getTime()) / 86_400_000),
    );
    return { from: first.w, to: last.w, days };
  }, [weightSeries]);

  return (
    <article
      className="health-card filled"
      style={{
        background: "var(--card)",
        border: "1px solid transparent",
        padding: "22px 24px 24px",
        gridColumn: "span 12",
        position: "relative",
      }}
    >
      <CardHead
        title="Body"
        subtitleAccent="the long arc."
        rightSlot={<MeasuredAt iso={latest?.measuredAt ?? null} />}
      />

      <div
        className="hp-body-top"
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1.6fr",
          gap: 40,
          paddingTop: 6,
        }}
      >
        <Portrait latest={latest} bfDelta={bfDelta} />
        <TrendPanel
          series={weightSeries}
          range={range}
          onRangeChange={setRange}
          summary={summary}
        />
      </div>

      <Tiles latest={latest} monthAgo={monthAgo} />
    </article>
  );
}

function Portrait({
  latest,
  bfDelta,
}: {
  latest: BodyMeasurement | null;
  bfDelta: number | null;
}) {
  const weight = latest?.weightKg ?? null;
  const bf = latest?.bodyFatPct ?? null;
  const muscle = latest?.muscleMassKg ?? 0;
  const fat = latest?.fatMassKg ?? 0;
  const bone = latest?.boneMassKg ?? 0;
  const total = weight ?? muscle + fat + bone;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div
        className="hp-body-weight"
        style={{
          fontFamily: "var(--f-serif)",
          fontSize: 96,
          lineHeight: 0.9,
          letterSpacing: "-0.03em",
        }}
      >
        <span style={{ fontWeight: 400 }} className="skel">
          {weight != null ? weight.toFixed(1) : "—"}
        </span>
        <span
          style={{
            fontStyle: "italic",
            fontSize: 32,
            color: "var(--fg-mute)",
            marginLeft: 8,
          }}
        >
          kg
        </span>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          fontFamily: "var(--f-serif)",
        }}
      >
        <span
          className="skel"
          style={{ fontSize: 32, color: "var(--fg)", marginRight: 8 }}
        >
          {bf != null ? bf.toFixed(1) : "—"}
        </span>
        <span
          style={{
            fontStyle: "italic",
            fontSize: 16,
            color: "var(--fg-mute)",
          }}
        >
          % body fat
        </span>
        {bfDelta != null && Math.abs(bfDelta) >= 0.05 && (
          <DeltaTag value={bfDelta} digits={1} style={{ marginLeft: 14 }} />
        )}
      </div>

      <CompositionBar
        muscle={muscle}
        fat={fat}
        bone={bone}
        total={total}
        empty={latest == null || total <= 0}
      />
    </div>
  );
}

function CompositionBar({
  muscle,
  fat,
  bone,
  total,
  empty,
}: {
  muscle: number;
  fat: number;
  bone: number;
  total: number;
  empty: boolean;
}) {
  const segments = [
    { key: "muscle", label: "Muscle", value: muscle, color: "var(--fg)" },
    { key: "fat", label: "Fat", value: fat, color: "var(--accent)" },
    { key: "bone", label: "Bone", value: bone, color: "var(--fg-mute)" },
  ];

  return (
    <>
      {empty ? (
        <div
          className="skel hp-skel-block"
          aria-label="Body composition"
          style={{
            height: 14,
            width: "100%",
            marginTop: 10,
            border: "1px solid var(--rule-strong)",
          }}
        />
      ) : (
        <div
          aria-label="Body composition"
          style={{
            display: "flex",
            height: 14,
            width: "100%",
            marginTop: 10,
            border: "1px solid var(--rule-strong)",
          }}
        >
          {segments.map((s) => (
            <span
              key={s.key}
              style={{
                display: "block",
                height: "100%",
                width: `${(s.value / total) * 100}%`,
                background: s.color,
              }}
            />
          ))}
        </div>
      )}
      <div
        style={{
          display: "flex",
          gap: 22,
          fontFamily: "var(--f-mono)",
          fontSize: 10.5,
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          color: "var(--fg-mute)",
          flexWrap: "wrap",
        }}
      >
        {segments.map((s) => (
          <span key={s.key}>
            <i
              style={{
                display: "inline-block",
                width: 10,
                height: 10,
                marginRight: 6,
                verticalAlign: -1,
                background: empty ? "var(--rule-strong)" : s.color,
              }}
            />
            {s.label}{" "}
            <span className="skel">{empty ? "—" : s.value.toFixed(1)}</span>
          </span>
        ))}
      </div>
    </>
  );
}

function TrendPanel({
  series,
  range,
  onRangeChange,
  summary,
}: {
  series: Array<{ date: Date; w: number }>;
  range: Range;
  onRangeChange: (r: Range) => void;
  summary: { from: number; to: number; days: number } | null;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 18,
          flexWrap: "wrap",
        }}
      >
        <RangeTabs value={range} onChange={onRangeChange} />
        <div
          style={{
            fontFamily: "var(--f-serif)",
            fontSize: 18,
            color: "var(--fg)",
          }}
        >
          <span className="skel" style={{ color: "var(--fg-mute)" }}>
            {summary ? summary.from.toFixed(1) : "—"}
          </span>
          <span style={{ color: "var(--fg-mute)", margin: "0 4px" }}>→</span>
          <span className="skel">
            {summary ? `${summary.to.toFixed(1)} kg` : "—"}
          </span>
          {summary && (
            <span
              style={{
                fontFamily: "var(--f-serif)",
                fontStyle: "italic",
                color: "var(--fg-soft)",
                marginLeft: 10,
                fontSize: 15,
              }}
            >
              over <em>{formatSpan(summary.days)}</em>.
            </span>
          )}
        </div>
      </div>
      <WeightChart series={series} />
    </div>
  );
}

function RangeTabs({
  value,
  onChange,
}: {
  value: Range;
  onChange: (v: Range) => void;
}) {
  const ranges: Range[] = ["3m", "6m", "1y", "all"];
  return (
    <div
      role="tablist"
      style={{
        display: "inline-flex",
        border: "1px solid var(--rule-strong)",
        fontFamily: "var(--f-mono)",
        fontSize: 10.5,
        letterSpacing: "0.16em",
        textTransform: "uppercase",
      }}
    >
      {ranges.map((r, i) => {
        const active = r === value;
        return (
          <button
            key={r}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(r)}
            style={{
              background: active ? "var(--fg)" : "transparent",
              color: active ? "var(--bg)" : "var(--fg-mute)",
              border: "none",
              borderRight:
                i < ranges.length - 1 ? "1px solid var(--rule-strong)" : "none",
              padding: "6px 12px",
              cursor: "pointer",
              font: "inherit",
              letterSpacing: "inherit",
              textTransform: "inherit",
            }}
          >
            {RANGE_LABEL[r]}
          </button>
        );
      })}
    </div>
  );
}

function WeightChart({ series }: { series: Array<{ date: Date; w: number }> }) {
  const W = 1000;
  const H = 200;
  const PAD = { t: 18, r: 24, b: 24, l: 36 };
  const innerW = W - PAD.l - PAD.r;
  const innerH = H - PAD.t - PAD.b;

  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const n = series.length;
  const ws = series.map((d) => d.w);
  const wMin = n > 0 ? Math.floor(Math.min(...ws) - 1) : 0;
  const wMax = n > 0 ? Math.ceil(Math.max(...ws) + 1) : 1;

  // x is positioned by actual time, not by index, so gaps in measurements
  // render as longer connecting lines instead of being smoothed out.
  const tMin = n > 0 ? series[0].date.getTime() : 0;
  const tMax = n > 0 ? series[n - 1].date.getTime() : 1;
  const tSpan = Math.max(1, tMax - tMin);

  const xForTime = (t: number) => PAD.l + ((t - tMin) / tSpan) * innerW;
  const yFor = (w: number) =>
    PAD.t + innerH - ((w - wMin) / (wMax - wMin || 1)) * innerH;

  const gridLevels = [0, 0.25, 0.5, 0.75, 1];
  const gridYs = gridLevels.map((g) => ({
    g,
    y: PAD.t + innerH * (1 - g),
    label: (wMin + (wMax - wMin) * g).toFixed(0),
  }));

  let path = "";
  for (let i = 0; i < n; i++) {
    const x = xForTime(series[i].date.getTime());
    const y = yFor(series[i].w);
    path += i === 0 ? `M ${x} ${y}` : ` L ${x} ${y}`;
  }

  const startY = n > 0 ? yFor(series[0].w) : 0;
  const endX = n > 0 ? xForTime(tMax) : 0;
  const endY = n > 0 ? yFor(series[n - 1].w) : 0;

  const handleMove = (e: React.MouseEvent<SVGRectElement>) => {
    if (n < 2) return;
    const wrap = wrapRef.current;
    if (!wrap) return;
    const rect = wrap.getBoundingClientRect();
    if (rect.width <= 0) return;
    // map cursor x → time → nearest point by time
    const svgX = ((e.clientX - rect.left) / rect.width) * W;
    const tCursor = tMin + ((svgX - PAD.l) / innerW) * tSpan;
    let nearest = 0;
    let nearestDist = Math.abs(series[0].date.getTime() - tCursor);
    for (let i = 1; i < n; i++) {
      const d = Math.abs(series[i].date.getTime() - tCursor);
      if (d < nearestDist) {
        nearestDist = d;
        nearest = i;
      }
    }
    setHoverIdx(nearest);
  };

  const monthTicks = useMemo(() => {
    if (n < 2) return [] as Array<{ pct: number; label: string }>;
    const start = series[0].date.getTime();
    const end = series[n - 1].date.getTime();
    const span = end - start;
    if (span <= 0) return [];
    const totalDays = span / 86_400_000;
    const ticks: Array<{ pct: number; label: string }> = [];
    const cur = new Date(start);
    cur.setUTCDate(1);
    cur.setUTCMonth(cur.getUTCMonth() + 1);
    while (cur.getTime() <= end) {
      ticks.push({
        pct: ((cur.getTime() - start) / span) * 100,
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
  }, [series, n]);

  if (n < 2) {
    return (
      <div
        className="skel hp-skel-block"
        style={{
          height: H,
          width: "100%",
          marginTop: 4,
        }}
      />
    );
  }

  const hovered = hoverIdx != null ? series[hoverIdx] : null;
  const hoverX = hovered ? xForTime(hovered.date.getTime()) : 0;
  const hoverPct = hovered ? (hoverX / W) * 100 : 0;

  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        style={{ width: "100%", height: H, display: "block" }}
      >
        {gridYs.map((g) => (
          <g key={g.g}>
            <line
              x1={PAD.l}
              x2={W - PAD.r}
              y1={g.y}
              y2={g.y}
              stroke="var(--rule)"
              strokeWidth={1}
              strokeDasharray="2 4"
            />
            <text
              x={PAD.l - 8}
              y={g.y + 3}
              textAnchor="end"
              fill="var(--fg-mute)"
              fontFamily="var(--f-mono)"
              fontSize={10}
            >
              {g.label}
            </text>
          </g>
        ))}

        <line
          x1={PAD.l}
          x2={W - PAD.r}
          y1={startY}
          y2={startY}
          stroke="var(--fg-mute)"
          strokeWidth={1}
          strokeDasharray="1 6"
        />

        <path
          d={path}
          fill="none"
          stroke="var(--fg)"
          strokeWidth={1.5}
          strokeLinejoin="miter"
          vectorEffect="non-scaling-stroke"
        />

        <rect
          x={endX - 4}
          y={endY - 4}
          width={8}
          height={8}
          fill="var(--accent)"
        />

        {hovered && (
          <>
            <line
              x1={hoverX}
              x2={hoverX}
              y1={PAD.t}
              y2={PAD.t + innerH}
              stroke="var(--fg-mute)"
              strokeWidth={1}
              strokeDasharray="2 3"
              pointerEvents="none"
            />
            <rect
              x={hoverX - 4}
              y={yFor(hovered.w) - 4}
              width={8}
              height={8}
              fill="var(--fg)"
              pointerEvents="none"
            />
          </>
        )}

        <rect
          x={PAD.l}
          y={PAD.t}
          width={innerW}
          height={innerH}
          fill="transparent"
          style={{ cursor: "crosshair" }}
          onMouseMove={handleMove}
          onMouseLeave={() => setHoverIdx(null)}
        />
      </svg>

      {hovered && (
        <div
          style={{
            position: "absolute",
            left: `${hoverPct}%`,
            top: -8,
            transform: "translate(-50%, -100%)",
            background: "var(--card-elev)",
            border: "1px solid var(--rule-strong)",
            padding: "8px 10px",
            fontFamily: "var(--f-mono)",
            fontSize: 10,
            letterSpacing: "0.06em",
            color: "var(--fg)",
            pointerEvents: "none",
            whiteSpace: "nowrap",
            zIndex: 10,
            lineHeight: 1.5,
          }}
        >
          <div style={{ color: "var(--fg-mute)", marginBottom: 4 }}>
            {hovered.date.toLocaleDateString(undefined, {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </div>
          <div>{hovered.w.toFixed(1)} kg</div>
        </div>
      )}

      <div
        style={{
          position: "relative",
          height: 14,
          fontFamily: "var(--f-mono)",
          fontSize: 10,
          letterSpacing: "0.1em",
          color: "var(--fg-mute)",
          marginTop: 4,
          textTransform: "uppercase",
        }}
      >
        {monthTicks.map((t) => {
          // tick.pct is the percent within the data span (0-100% across innerW).
          // convert to wrapper-relative percent so labels align with the
          // svg's inner coordinate system.
          const wrapperPct = ((PAD.l + (t.pct / 100) * innerW) / W) * 100;
          return (
            <span
              key={`${t.label}-${t.pct}`}
              style={{
                position: "absolute",
                left: `${wrapperPct}%`,
                transform: "translateX(-50%)",
                whiteSpace: "nowrap",
              }}
            >
              {t.label}
            </span>
          );
        })}
      </div>
    </div>
  );
}

function Tiles({
  latest,
  monthAgo,
}: {
  latest: BodyMeasurement | null;
  monthAgo: BodyMeasurement | null;
}) {
  const muscleDelta = delta(
    latest?.muscleMassKg ?? null,
    monthAgo?.muscleMassKg,
  );
  const fatDelta = delta(latest?.fatMassKg ?? null, monthAgo?.fatMassKg);
  const hydrationCap = hydrationCaption(latest);

  return (
    <div
      className="hp-body-tiles"
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(5, 1fr)",
        gap: 0,
        marginTop: 36,
        paddingTop: 24,
        borderTop: "1px solid var(--rule)",
      }}
    >
      <Tile
        label="Muscle Mass"
        value={latest?.muscleMassKg ?? null}
        unit="kg"
        digits={1}
        cap={
          muscleDelta != null ? (
            <>
              <DeltaTag value={muscleDelta} digits={1} inline /> vs last month
            </>
          ) : null
        }
      />
      <Tile
        label="Fat Mass"
        value={latest?.fatMassKg ?? null}
        unit="kg"
        digits={1}
        cap={
          fatDelta != null ? (
            <>
              <DeltaTag value={fatDelta} digits={1} inline invert /> vs last
              month
            </>
          ) : null
        }
      />
      <Tile
        label="Visceral Fat"
        value={latest?.visceralFat ?? null}
        digits={1}
        cap={
          <>
            In the <em style={{ color: "var(--fg)" }}>healthy</em> 1–9 range.
          </>
        }
      />
      <Tile
        label="BMR"
        value={latest?.basalMetabolicRateKcal ?? null}
        unit="kcal"
        digits={0}
        cap={<>Resting daily burn.</>}
      />
      <Tile
        label="Hydration"
        value={latest?.hydrationKg ?? null}
        unit="kg"
        digits={1}
        cap={hydrationCap}
      />
    </div>
  );
}

function Tile({
  label,
  value,
  unit,
  digits,
  cap,
}: {
  label: string;
  value: number | null;
  unit?: string;
  digits: number;
  cap: React.ReactNode;
}) {
  return (
    <div
      className="hp-body-tile"
      style={{
        padding: "0 22px",
        borderRight: "1px solid var(--rule)",
      }}
    >
      <div
        style={{
          fontFamily: "var(--f-mono)",
          fontSize: 10.5,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: "var(--fg-mute)",
          marginBottom: 8,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: "var(--f-serif)",
          fontSize: 38,
          lineHeight: 1,
          letterSpacing: "-0.01em",
          color: "var(--fg)",
        }}
      >
        <span className="skel">
          {value != null ? formatTileNumber(value, digits) : "—"}
        </span>
        {unit && (
          <span
            style={{
              fontStyle: "italic",
              fontSize: 16,
              color: "var(--fg-mute)",
              marginLeft: 6,
            }}
          >
            {unit}
          </span>
        )}
      </div>
      {cap && (
        <div
          style={{
            fontFamily: "var(--f-serif)",
            fontStyle: "italic",
            fontSize: 14,
            color: "var(--fg-mute)",
            marginTop: 10,
          }}
        >
          {cap}
        </div>
      )}
    </div>
  );
}

function DeltaTag({
  value,
  digits,
  inline,
  invert,
  style,
}: {
  value: number;
  digits: number;
  inline?: boolean;
  invert?: boolean;
  style?: React.CSSProperties;
}) {
  const sign = value === 0 ? 0 : value > 0 ? 1 : -1;
  const scored = invert ? -sign : sign;
  const color =
    scored > 0 ? "var(--ok)" : scored < 0 ? "var(--danger)" : "var(--fg-mute)";
  const arrow = sign > 0 ? "▲" : sign < 0 ? "▼" : "◆";
  return (
    <span
      style={{
        color,
        fontFamily: inline ? "var(--f-mono)" : undefined,
        fontSize: inline ? 11 : 14,
        letterSpacing: inline ? "0.06em" : undefined,
        ...style,
      }}
    >
      {arrow} {Math.abs(value).toFixed(digits)}
    </span>
  );
}

function MeasuredAt({ iso }: { iso: string | null }) {
  return (
    <span
      style={{
        fontFamily: "var(--f-mono)",
        fontSize: 10.5,
        letterSpacing: "0.18em",
        textTransform: "uppercase",
        color: "var(--fg-mute)",
      }}
    >
      Measured ·{" "}
      <span className="skel">
        {iso ? `${formatDateShort(iso)} · ${formatClockTime(iso)}` : "—"}
      </span>
    </span>
  );
}

function delta(a: number | null, b: number | null | undefined): number | null {
  if (a == null || b == null || !Number.isFinite(b)) return null;
  return a - b;
}

const COMPOSITE_FIELDS: Array<keyof BodyMeasurement> = [
  "weightKg",
  "bodyFatPct",
  "fatMassKg",
  "fatFreeMassKg",
  "muscleMassKg",
  "hydrationKg",
  "boneMassKg",
  "heightM",
  "heartRateBpm",
  "pulseWaveVelocityMs",
  "vascularAgeYears",
  "extracellularWaterKg",
  "intracellularWaterKg",
  "visceralFat",
  "basalMetabolicRateKcal",
];

// Withings sometimes splits a single weigh-in across rows. Walk the
// time-sorted trend backward and keep the first non-null value for each
// field so the card has a populated "latest" snapshot.
function mergeLatest(
  trend: BodyMeasurement[],
  fallback: BodyMeasurement | null,
): BodyMeasurement | null {
  if (trend.length === 0) return fallback;
  const sorted = [...trend].sort(
    (a, b) =>
      new Date(b.measuredAt).getTime() - new Date(a.measuredAt).getTime(),
  );
  const out: BodyMeasurement = {
    measuredAt: sorted[0].measuredAt,
    weightKg: null,
    bodyFatPct: null,
    fatMassKg: null,
    fatFreeMassKg: null,
    muscleMassKg: null,
    hydrationKg: null,
    boneMassKg: null,
    heightM: null,
    heartRateBpm: null,
    pulseWaveVelocityMs: null,
    vascularAgeYears: null,
    extracellularWaterKg: null,
    intracellularWaterKg: null,
    visceralFat: null,
    basalMetabolicRateKcal: null,
  };
  let measuredAtForWeight: string | null = null;
  for (const m of sorted) {
    for (const f of COMPOSITE_FIELDS) {
      if (out[f] == null && m[f] != null) {
        (out[f] as number | null) = m[f] as number | null;
        if (f === "weightKg") measuredAtForWeight = m.measuredAt;
      }
    }
  }
  // anchor the displayed timestamp to the most recent weigh-in if available,
  // otherwise the most recent row.
  if (measuredAtForWeight) out.measuredAt = measuredAtForWeight;
  return out;
}

function hydrationCaption(m: BodyMeasurement | null): React.ReactNode {
  const icw = m?.intracellularWaterKg ?? null;
  const ecw = m?.extracellularWaterKg ?? null;
  if (icw == null && ecw == null) return "Total body water.";
  const parts: React.ReactNode[] = [];
  if (icw != null) {
    parts.push(
      <span key="icw">
        ICW{" "}
        <b style={{ fontStyle: "normal", color: "var(--fg)" }}>
          {icw.toFixed(1)}
        </b>
      </span>,
    );
  }
  if (ecw != null) {
    parts.push(
      <span key="ecw">
        ECW{" "}
        <b style={{ fontStyle: "normal", color: "var(--fg)" }}>
          {ecw.toFixed(1)}
        </b>
      </span>,
    );
  }
  return parts.reduce<React.ReactNode[]>((acc, node, i) => {
    if (i > 0) acc.push(<span key={`sep-${i}`}> · </span>);
    acc.push(node);
    return acc;
  }, []);
}

function formatTileNumber(value: number, digits: number): string {
  return value.toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function formatSpan(days: number): string {
  if (days < 14) return `${days} days`;
  if (days < 60) {
    const w = Math.round(days / 7);
    return `${w} week${w === 1 ? "" : "s"}`;
  }
  if (days < 365) {
    const m = Math.round(days / 30);
    return `${m} month${m === 1 ? "" : "s"}`;
  }
  if (days < 730) {
    const m = Math.round(days / 30);
    return `${m} months`;
  }
  const y = (days / 365).toFixed(1);
  return `${y} years`;
}
