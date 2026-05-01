"use client";

import { useMemo, useRef, useState } from "react";
import type { BodyData, BodyMeasurement } from "./types";
import { CardHead } from "./StrainCard";
import { formatClockTime, formatDateShort } from "./format";

interface BodyCardProps {
  body: BodyData | null;
}

type RangeKey = "3m" | "6m" | "1y" | "all";

const RANGE_OPTIONS: Array<{
  key: RangeKey;
  label: string;
  days: number | null;
}> = [
  { key: "3m", label: "3M", days: 90 },
  { key: "6m", label: "6M", days: 180 },
  { key: "1y", label: "1Y", days: 365 },
  { key: "all", label: "All", days: null },
];

type MetricKey =
  | "weight"
  | "muscle"
  | "fat_mass"
  | "hydration"
  | "visceral"
  | "bmr"
  | "body_fat";

interface MetricDef {
  key: MetricKey;
  label: string;
  short: string;
  accessor: (m: BodyMeasurement) => number | null;
  unit: string;
  digits: number;
  invertDelta?: boolean; // true when "down is good"
}

const METRICS: Record<MetricKey, MetricDef> = {
  weight: {
    key: "weight",
    label: "Weight",
    short: "Weight",
    accessor: (m) => m.weightKg,
    unit: "kg",
    digits: 1,
  },
  body_fat: {
    key: "body_fat",
    label: "Body Fat",
    short: "Body Fat",
    accessor: (m) => m.bodyFatPct,
    unit: "%",
    digits: 1,
    invertDelta: true,
  },
  muscle: {
    key: "muscle",
    label: "Muscle Mass",
    short: "Muscle Mass",
    accessor: (m) => m.muscleMassKg,
    unit: "kg",
    digits: 1,
  },
  fat_mass: {
    key: "fat_mass",
    label: "Fat Mass",
    short: "Fat Mass",
    accessor: (m) => m.fatMassKg,
    unit: "kg",
    digits: 1,
    invertDelta: true,
  },
  visceral: {
    key: "visceral",
    label: "Visceral Fat",
    short: "Visceral Fat",
    accessor: (m) => m.visceralFat,
    unit: "",
    digits: 1,
    invertDelta: true,
  },
  bmr: {
    key: "bmr",
    label: "BMR",
    short: "BMR",
    accessor: (m) => m.basalMetabolicRateKcal,
    unit: "kcal",
    digits: 0,
  },
  hydration: {
    key: "hydration",
    label: "Hydration",
    short: "Hydration",
    accessor: (m) => m.hydrationKg,
    unit: "kg",
    digits: 1,
  },
};

// the row of clickable tiles (offline html has 5 here, body-fat lives in the
// portrait; weight is the implicit chart default).
const TILE_METRICS: MetricKey[] = [
  "muscle",
  "fat_mass",
  "visceral",
  "bmr",
  "hydration",
];

export default function BodyCard({ body }: BodyCardProps) {
  const latest = body?.latest ?? null;
  const trend = body?.trend ?? [];

  // null = weight default; non-null = focused on that metric.
  const [focusedKey, setFocusedKey] = useState<MetricKey | null>(null);
  const [rangeKey, setRangeKey] = useState<RangeKey>("1y");

  const activeMetric = focusedKey ? METRICS[focusedKey] : METRICS.weight;

  const rangeDef =
    RANGE_OPTIONS.find((r) => r.key === rangeKey) ?? RANGE_OPTIONS[2];

  const displayTrend = useMemo(() => {
    if (rangeDef.days == null) return trend;
    const cutoff = Date.now() - rangeDef.days * 24 * 60 * 60 * 1000;
    return trend.filter((p) => new Date(p.measuredAt).getTime() >= cutoff);
  }, [trend, rangeDef]);

  const points = useMemo(
    () =>
      displayTrend
        .map((p) => {
          const v = activeMetric.accessor(p);
          return v != null
            ? { value: v, time: new Date(p.measuredAt).getTime() }
            : null;
        })
        .filter((p): p is { value: number; time: number } => p != null),
    [displayTrend, activeMetric],
  );

  // also need the latest body-fat delta for the portrait
  const bodyFatPoints = useMemo(
    () =>
      displayTrend
        .map((p) => p.bodyFatPct)
        .filter((v): v is number => v != null),
    [displayTrend],
  );
  const bodyFatDelta =
    bodyFatPoints.length > 1
      ? bodyFatPoints[bodyFatPoints.length - 1] - bodyFatPoints[0]
      : null;

  const onTileClick = (k: MetricKey) =>
    setFocusedKey((cur) => (cur === k ? null : k));

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
        rightSlot={latest ? <MeasuredAt iso={latest.measuredAt} /> : undefined}
      />

      {!latest ? (
        <EmptyBanner />
      ) : (
        <>
          <div
            className="hp-body-top"
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1.6fr)",
              gap: 40,
              marginTop: 16,
              alignItems: "stretch",
            }}
          >
            <Portrait latest={latest} bodyFatDelta={bodyFatDelta} />
            <TrendPanel
              metric={activeMetric}
              points={points}
              rangeKey={rangeKey}
              onRangeChange={setRangeKey}
            />
          </div>

          <Tiles
            latest={latest}
            displayTrend={displayTrend}
            focused={focusedKey}
            onSelect={onTileClick}
          />
        </>
      )}
    </article>
  );
}

function Portrait({
  latest,
  bodyFatDelta,
}: {
  latest: BodyMeasurement;
  bodyFatDelta: number | null;
}) {
  const fat = latest.fatMassKg ?? 0;
  const muscle = latest.muscleMassKg ?? 0;
  const bone = latest.boneMassKg ?? 0;
  const total = fat + muscle + bone;

  const segments =
    total > 0
      ? [
          {
            key: "muscle",
            label: "Muscle",
            value: muscle,
            color: "var(--fg)",
          },
          {
            key: "fat",
            label: "Fat",
            value: fat,
            color: "var(--accent)",
          },
          {
            key: "bone",
            label: "Bone",
            value: bone,
            color: "var(--fg-mute)",
          },
        ]
      : [];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div
        style={{
          fontFamily: "var(--f-serif)",
          fontSize: 96,
          lineHeight: 0.9,
          letterSpacing: "-0.03em",
          margin: 0,
        }}
      >
        <span className="skel">
          {latest.weightKg != null ? latest.weightKg.toFixed(1) : "—"}
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
      {latest.bodyFatPct != null && (
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            fontFamily: "var(--f-serif)",
            gap: 14,
          }}
        >
          <span style={{ fontSize: 32, color: "var(--fg)" }}>
            {latest.bodyFatPct.toFixed(1)}
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
          <DeltaPill delta={bodyFatDelta} digits={1} invertDelta />
        </div>
      )}

      {total > 0 && (
        <>
          <div
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
                title={`${s.label} ${s.value.toFixed(1)} kg · ${((s.value / total) * 100).toFixed(1)}%`}
                style={{
                  width: `${(s.value / total) * 100}%`,
                  height: "100%",
                  background: s.color,
                  display: "block",
                  transition: "width 240ms cubic-bezier(.4,0,.2,1)",
                }}
              />
            ))}
          </div>
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
              <span
                key={`leg-${s.key}`}
                style={{ display: "inline-flex", alignItems: "center" }}
              >
                <span
                  style={{
                    display: "inline-block",
                    width: 10,
                    height: 10,
                    background: s.color,
                    marginRight: 6,
                    verticalAlign: "-1px",
                  }}
                />
                {s.label} {s.value.toFixed(1)}
              </span>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function DeltaPill({
  delta,
  digits,
  invertDelta = false,
}: {
  delta: number | null;
  digits: number;
  invertDelta?: boolean;
}) {
  if (delta == null) return null;
  const sign = delta === 0 ? 0 : delta > 0 ? 1 : -1;
  const scored = invertDelta ? -sign : sign;
  const color =
    scored > 0 ? "var(--ok)" : scored < 0 ? "var(--danger)" : "var(--fg-mute)";
  const arrow = sign > 0 ? "▲" : sign < 0 ? "▼" : "◆";
  return (
    <span
      style={{
        fontFamily: "var(--f-mono)",
        fontSize: 11,
        letterSpacing: "0.06em",
        color,
        marginLeft: 4,
      }}
    >
      {arrow} {Math.abs(delta).toFixed(digits)}
    </span>
  );
}

function TrendPanel({
  metric,
  points,
  rangeKey,
  onRangeChange,
}: {
  metric: MetricDef;
  points: Array<{ value: number; time: number }>;
  rangeKey: RangeKey;
  onRangeChange: (k: RangeKey) => void;
}) {
  const summary = useMemo(() => {
    if (points.length < 2) return null;
    const first = points[0];
    const last = points[points.length - 1];
    const spanDays = (last.time - first.time) / 86_400_000;
    let spanLabel: string;
    if (spanDays >= 365) {
      const years = spanDays / 365;
      spanLabel = `${years >= 1.5 ? years.toFixed(1) : Math.round(years)} ${years >= 1.5 || years < 1 ? "years" : "year"}`;
    } else if (spanDays >= 60) {
      spanLabel = `${Math.round(spanDays / 30)} months`;
    } else {
      spanLabel = `${Math.round(spanDays)} days`;
    }
    return {
      from: first.value,
      to: last.value,
      spanLabel,
    };
  }, [points]);

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
        <RangeSelector value={rangeKey} onChange={onRangeChange} />
        {summary && (
          <div
            style={{
              fontFamily: "var(--f-serif)",
              fontSize: 18,
              color: "var(--fg)",
            }}
          >
            <span style={{ color: "var(--fg-mute)" }}>
              {summary.from.toFixed(metric.digits)}
            </span>
            <span style={{ color: "var(--fg-mute)", margin: "0 6px" }}>→</span>
            <span>
              {summary.to.toFixed(metric.digits)}
              {metric.unit ? ` ${metric.unit}` : ""}
            </span>
            <span
              style={{
                fontStyle: "italic",
                color: "var(--fg-mute)",
                fontSize: 15,
                marginLeft: 10,
              }}
            >
              over <em>{summary.spanLabel}</em>.
            </span>
          </div>
        )}
      </div>

      <ChartSvg metric={metric} points={points} />
    </div>
  );
}

function RangeSelector({
  value,
  onChange,
}: {
  value: RangeKey;
  onChange: (v: RangeKey) => void;
}) {
  return (
    <div
      style={{
        display: "inline-flex",
        border: "1px solid var(--rule-strong)",
        fontFamily: "var(--f-mono)",
        fontSize: 10.5,
        letterSpacing: "0.16em",
        textTransform: "uppercase",
      }}
    >
      {RANGE_OPTIONS.map((o, i) => {
        const active = o.key === value;
        return (
          <button
            key={o.key}
            type="button"
            onClick={() => onChange(o.key)}
            style={{
              background: active ? "var(--fg)" : "transparent",
              color: active ? "var(--background)" : "var(--fg-mute)",
              border: "none",
              padding: "6px 12px",
              cursor: "pointer",
              font: "inherit",
              letterSpacing: "inherit",
              textTransform: "inherit",
              borderRight:
                i < RANGE_OPTIONS.length - 1
                  ? "1px solid var(--rule-strong)"
                  : "none",
              transition: "background 140ms ease, color 140ms ease",
            }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

const VIEW_W = 1000;
const VIEW_H = 200;
const PAD = { t: 18, r: 24, b: 24, l: 36 };
const innerW = VIEW_W - PAD.l - PAD.r;
const innerH = VIEW_H - PAD.t - PAD.b;

function ChartSvg({
  metric,
  points,
}: {
  metric: MetricDef;
  points: Array<{ value: number; time: number }>;
}) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const chart = useMemo(() => {
    if (points.length < 2) return null;
    const values = points.map((p) => p.value);
    let yMin = Math.min(...values);
    let yMax = Math.max(...values);
    if (yMin === yMax) {
      yMin -= 1;
      yMax += 1;
    } else {
      const pad = (yMax - yMin) * 0.1;
      yMin = Math.floor(yMin - pad);
      yMax = Math.ceil(yMax + pad);
    }
    const stepX = innerW / (points.length - 1);
    const xFor = (i: number) => PAD.l + i * stepX;
    const yFor = (v: number) =>
      PAD.t + innerH - ((v - yMin) / (yMax - yMin)) * innerH;
    let d = "";
    points.forEach((p, i) => {
      const x = xFor(i);
      const y = yFor(p.value);
      d +=
        i === 0
          ? `M ${x.toFixed(1)} ${y.toFixed(1)}`
          : ` L ${x.toFixed(1)} ${y.toFixed(1)}`;
    });
    return { yMin, yMax, stepX, xFor, yFor, d };
  }, [points]);

  const monthTicks = useMemo(() => {
    if (points.length < 2) return [];
    const startMs = points[0].time;
    const endMs = points[points.length - 1].time;
    const totalDays = (endMs - startMs) / 86_400_000;
    const ticks: Array<{ pct: number; label: string }> = [];
    const cur = new Date(startMs);
    cur.setUTCDate(1);
    cur.setUTCMonth(cur.getUTCMonth() + 1);
    while (cur.getTime() <= endMs) {
      ticks.push({
        pct: ((cur.getTime() - startMs) / (endMs - startMs)) * 100,
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
  }, [points]);

  if (!chart) {
    return (
      <div
        style={{
          height: VIEW_H,
          display: "flex",
          alignItems: "center",
          fontFamily: "var(--f-mono)",
          fontSize: 11,
          letterSpacing: "0.1em",
          color: "var(--fg-mute)",
        }}
      >
        Not enough data in this window.
      </div>
    );
  }

  const handleMove = (e: React.MouseEvent<SVGRectElement>) => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const rect = wrap.getBoundingClientRect();
    if (rect.width <= 0) return;
    const svgX = ((e.clientX - rect.left) / rect.width) * VIEW_W;
    let idx = Math.round((svgX - PAD.l) / chart.stepX);
    idx = Math.max(0, Math.min(points.length - 1, idx));
    setHoverIdx(idx);
  };

  const startY = chart.yFor(points[0].value);
  const lastIdx = points.length - 1;
  const endX = chart.xFor(lastIdx);
  const endY = chart.yFor(points[lastIdx].value);

  const hoverPoint = hoverIdx != null ? points[hoverIdx] : null;
  const hoverX = hoverIdx != null ? chart.xFor(hoverIdx) : 0;
  const hoverY = hoverPoint ? chart.yFor(hoverPoint.value) : 0;

  // five y-axis ticks at 0/25/50/75/100% of the value range
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((g) => ({
    y: PAD.t + innerH * (1 - g),
    label: (chart.yMin + (chart.yMax - chart.yMin) * g).toFixed(metric.digits),
  }));

  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        preserveAspectRatio="none"
        style={{ width: "100%", height: VIEW_H, display: "block" }}
      >
        {yTicks.map((t, i) => (
          <g key={`yt-${i}`}>
            <line
              x1={PAD.l}
              x2={VIEW_W - PAD.r}
              y1={t.y}
              y2={t.y}
              stroke="var(--rule)"
              strokeWidth={1}
              strokeDasharray="2 4"
              vectorEffect="non-scaling-stroke"
            />
            <text
              x={PAD.l - 8}
              y={t.y + 3}
              textAnchor="end"
              fill="var(--fg-mute)"
              fontFamily="var(--f-mono)"
              fontSize={10}
            >
              {t.label}
            </text>
          </g>
        ))}

        {/* baseline at the starting value */}
        <line
          x1={PAD.l}
          x2={VIEW_W - PAD.r}
          y1={startY}
          y2={startY}
          stroke="var(--fg-mute)"
          strokeWidth={1}
          strokeDasharray="1 6"
          vectorEffect="non-scaling-stroke"
        />

        <path
          d={chart.d}
          fill="none"
          stroke="var(--fg)"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
          style={{ transition: "d 240ms cubic-bezier(.4,0,.2,1)" }}
        />

        {/* end-of-line cap */}
        <rect
          x={endX - 4}
          y={endY - 4}
          width={8}
          height={8}
          fill="var(--accent)"
        />

        {hoverPoint && (
          <line
            x1={hoverX}
            x2={hoverX}
            y1={PAD.t}
            y2={PAD.t + innerH}
            stroke="var(--fg-mute)"
            strokeWidth={1}
            strokeDasharray="2 3"
            vectorEffect="non-scaling-stroke"
          />
        )}
        {hoverPoint && (
          <rect
            x={hoverX - 4}
            y={hoverY - 4}
            width={8}
            height={8}
            fill="var(--fg)"
          />
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

      {hoverPoint && (
        <div
          style={{
            position: "absolute",
            left: `${(hoverX / VIEW_W) * 100}%`,
            top: -6,
            transform: "translate(-50%, -100%)",
            background: "var(--card-elev)",
            border: "1px solid var(--rule-strong)",
            padding: "8px 10px",
            fontFamily: "var(--f-mono)",
            fontSize: 10.5,
            letterSpacing: "0.06em",
            color: "var(--fg)",
            pointerEvents: "none",
            whiteSpace: "nowrap",
            zIndex: 10,
            lineHeight: 1.45,
            transition: "left 130ms linear",
          }}
        >
          <div style={{ color: "var(--fg-mute)", marginBottom: 2 }}>
            {new Date(hoverPoint.time).toLocaleDateString(undefined, {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </div>
          <div>
            <span style={{ color: "var(--fg-mute)" }}>{metric.short}</span>
            <span style={{ marginLeft: 12 }}>
              {hoverPoint.value.toFixed(metric.digits)}
              {metric.unit ? (
                <span style={{ color: "var(--fg-mute)", marginLeft: 3 }}>
                  {metric.unit}
                </span>
              ) : null}
            </span>
          </div>
        </div>
      )}

      <div
        style={{
          position: "relative",
          height: 14,
          marginTop: 6,
          fontFamily: "var(--f-mono)",
          fontSize: 10,
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
    </div>
  );
}

function Tiles({
  latest,
  displayTrend,
  focused,
  onSelect,
}: {
  latest: BodyMeasurement;
  displayTrend: BodyMeasurement[];
  focused: MetricKey | null;
  onSelect: (k: MetricKey) => void;
}) {
  // delta vs first value in current window for each tile metric
  const deltas = useMemo(() => {
    const out: Partial<Record<MetricKey, number | null>> = {};
    for (const k of TILE_METRICS) {
      const m = METRICS[k];
      const series = displayTrend
        .map((p) => m.accessor(p))
        .filter((v): v is number => v != null);
      out[k] = series.length > 1 ? series[series.length - 1] - series[0] : null;
    }
    return out;
  }, [displayTrend]);

  return (
    <div
      className="hp-body-tiles"
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
        marginTop: 36,
        paddingTop: 24,
        borderTop: "1px solid var(--rule)",
      }}
    >
      {TILE_METRICS.map((k, i) => {
        const m = METRICS[k];
        const v = m.accessor(latest);
        const isActive = focused === k;
        const delta = deltas[k] ?? null;
        return (
          <button
            key={k}
            type="button"
            onClick={() => onSelect(k)}
            style={{
              appearance: "none",
              background: isActive ? "var(--card-elev)" : "transparent",
              border: "none",
              borderLeft: isActive ? "1px solid var(--fg)" : "none",
              borderRight:
                i < TILE_METRICS.length - 1 ? "1px solid var(--rule)" : "none",
              padding: "6px 22px",
              paddingLeft: i === 0 ? (isActive ? 22 : 0) : 22,
              paddingRight: i === TILE_METRICS.length - 1 ? 0 : 22,
              cursor: "pointer",
              textAlign: "left",
              outline: "none",
              fontFamily: "inherit",
              color: "inherit",
              transition: "background 160ms ease, transform 120ms ease",
              minWidth: 0,
            }}
            onMouseDown={(e) =>
              (e.currentTarget.style.transform = "scale(0.99)")
            }
            onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
            onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
          >
            <div
              style={{
                fontFamily: "var(--f-mono)",
                fontSize: 10.5,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: isActive ? "var(--fg)" : "var(--fg-mute)",
                marginBottom: 8,
              }}
            >
              {m.label}
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
              <span>{v != null ? v.toFixed(m.digits) : "—"}</span>
              {m.unit && (
                <span
                  style={{
                    fontStyle: "italic",
                    fontSize: 16,
                    color: "var(--fg-mute)",
                    marginLeft: 6,
                  }}
                >
                  {m.unit}
                </span>
              )}
            </div>
            <div
              style={{
                fontFamily: "var(--f-serif)",
                fontStyle: "italic",
                fontSize: 14,
                color: "var(--fg-mute)",
                marginTop: 10,
                display: "flex",
                alignItems: "center",
                gap: 6,
                flexWrap: "wrap",
              }}
            >
              {delta != null ? (
                <>
                  <DeltaPill
                    delta={delta}
                    digits={m.digits}
                    invertDelta={m.invertDelta}
                  />
                  <span>vs window start</span>
                </>
              ) : (
                <span>—</span>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}

function MeasuredAt({ iso }: { iso: string }) {
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
      Measured · {formatDateShort(iso)} · {formatClockTime(iso)}
    </span>
  );
}

function EmptyBanner() {
  return (
    <div
      style={{
        margin: "12px 0 0",
        padding: "12px 16px",
        border: "1px dashed var(--rule-strong)",
        fontFamily: "var(--f-mono)",
        fontSize: 11,
        color: "var(--fg-mute)",
        letterSpacing: "0.1em",
      }}
    >
      No Withings data yet. Run scripts/withings-auth.ts to connect.
    </div>
  );
}
