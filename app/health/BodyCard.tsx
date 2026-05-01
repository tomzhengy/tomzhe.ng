"use client";

import { useMemo, useRef, useState } from "react";
import type { BodyData, BodyMeasurement } from "./types";
import { CardHead } from "./StrainCard";
import { formatClockTime, formatDateShort } from "./format";

interface BodyCardProps {
  body: BodyData | null;
}

type WindowKey = "14" | "30" | "90" | "all";

const WINDOW_OPTIONS: Array<{ value: WindowKey; label: string }> = [
  { value: "14", label: "2 weeks" },
  { value: "30", label: "1 month" },
  { value: "90", label: "3 months" },
  { value: "all", label: "all time" },
];

const WINDOW_LABEL: Record<WindowKey, string> = {
  "14": "2 weeks",
  "30": "1 month",
  "90": "3 months",
  all: "all time",
};

type MetricKey =
  | "weight"
  | "body_fat"
  | "muscle"
  | "fat_mass"
  | "hydration"
  | "bone"
  | "visceral"
  | "bmr";

interface MetricDef {
  key: MetricKey;
  label: string;
  short: string;
  accessor: (m: BodyMeasurement) => number | null;
  unit: string;
  digits: number;
  color: string;
  invertDelta?: boolean;
}

const METRICS: MetricDef[] = [
  {
    key: "weight",
    label: "Weight",
    short: "Weight",
    accessor: (m) => m.weightKg,
    unit: "kg",
    digits: 1,
    color: "var(--fg)",
  },
  {
    key: "body_fat",
    label: "Body Fat",
    short: "Body Fat",
    accessor: (m) => m.bodyFatPct,
    unit: "%",
    digits: 1,
    color: "var(--accent)",
    invertDelta: true,
  },
  {
    key: "muscle",
    label: "Muscle Mass",
    short: "Muscle",
    accessor: (m) => m.muscleMassKg,
    unit: "kg",
    digits: 1,
    color: "var(--ok)",
  },
  {
    key: "fat_mass",
    label: "Fat Mass",
    short: "Fat",
    accessor: (m) => m.fatMassKg,
    unit: "kg",
    digits: 1,
    color: "var(--warn)",
    invertDelta: true,
  },
  {
    key: "hydration",
    label: "Hydration",
    short: "Hydration",
    accessor: (m) => m.hydrationKg,
    unit: "kg",
    digits: 1,
    color: "var(--select)",
  },
  {
    key: "bone",
    label: "Bone Mass",
    short: "Bone",
    accessor: (m) => m.boneMassKg,
    unit: "kg",
    digits: 1,
    color: "color-mix(in oklab, var(--fg) 55%, transparent)",
  },
  {
    key: "visceral",
    label: "Visceral Fat",
    short: "Visceral",
    accessor: (m) => m.visceralFat,
    unit: "",
    digits: 1,
    color: "var(--danger)",
    invertDelta: true,
  },
  {
    key: "bmr",
    label: "BMR",
    short: "BMR",
    accessor: (m) => m.basalMetabolicRateKcal,
    unit: "kcal",
    digits: 0,
    color: "color-mix(in oklab, var(--accent) 55%, var(--select))",
  },
];

const WEIGHT_METRIC = METRICS[0];

export default function BodyCard({ body }: BodyCardProps) {
  const latest = body?.latest ?? null;
  const trend = body?.trend ?? [];

  // null = no metric focused (all lines bold). non-null = that metric focused.
  const [selectedKey, setSelectedKey] = useState<MetricKey | null>(null);
  const [windowKey, setWindowKey] = useState<WindowKey>("30");

  const heroMetric =
    selectedKey != null
      ? (METRICS.find((m) => m.key === selectedKey) ?? WEIGHT_METRIC)
      : WEIGHT_METRIC;

  const displayTrend = useMemo(() => {
    if (windowKey === "all") return trend;
    const days = Number.parseInt(windowKey, 10);
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    return trend.filter((p) => new Date(p.measuredAt).getTime() >= cutoff);
  }, [trend, windowKey]);

  // build per-metric series for the multi-line chart, each normalized to its
  // own min/max so all 8 lines fit a single chart space.
  const allSeries = useMemo<SeriesData[]>(() => {
    return METRICS.map((m) => {
      const points = displayTrend
        .map((p) => {
          const v = m.accessor(p);
          return v != null ? { date: p.measuredAt, value: v } : null;
        })
        .filter((p): p is { date: string; value: number } => p != null);
      if (points.length === 0) {
        return { metric: m, points: [], min: 0, max: 1 };
      }
      const values = points.map((p) => p.value);
      let min = Math.min(...values);
      let max = Math.max(...values);
      if (min === max) {
        // pad a flat series so it doesn't render as a line on the bottom edge
        min -= 1;
        max += 1;
      }
      return { metric: m, points, min, max };
    });
  }, [displayTrend]);

  const heroSeries = allSeries.find((s) => s.metric.key === heroMetric.key);
  const heroPoints = heroSeries?.points ?? [];
  const heroValue = latest ? heroMetric.accessor(latest) : null;
  const delta =
    heroPoints.length > 1
      ? heroPoints[heroPoints.length - 1].value - heroPoints[0].value
      : null;

  // window counts use weight as the proxy since it's the most-captured metric.
  const windowCounts = useMemo(() => {
    const now = Date.now();
    const out: Record<WindowKey, number> = {
      "14": 0,
      "30": 0,
      "90": 0,
      all: 0,
    };
    for (const p of trend) {
      if (p.weightKg == null) continue;
      const t = new Date(p.measuredAt).getTime();
      out.all++;
      if (t >= now - 14 * 24 * 60 * 60 * 1000) out["14"]++;
      if (t >= now - 30 * 24 * 60 * 60 * 1000) out["30"]++;
      if (t >= now - 90 * 24 * 60 * 60 * 1000) out["90"]++;
    }
    return out;
  }, [trend]);

  const onTileClick = (k: MetricKey) => {
    setSelectedKey((cur) => (cur === k ? null : k));
  };

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
        subtitleAccent="weight & composition over time."
        rightSlot={latest ? <MeasuredAt iso={latest.measuredAt} /> : undefined}
      />

      {!latest ? (
        <EmptyBanner />
      ) : (
        <>
          <div
            className="hp-body-grid"
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0, 1.2fr) minmax(0, 1fr)",
              gap: 40,
              marginTop: 18,
              alignItems: "stretch",
            }}
          >
            <SelectedHero
              metric={heroMetric}
              value={heroValue}
              delta={delta}
              windowKey={windowKey}
              isFocused={selectedKey != null}
            />
            <CompositionBar latest={latest} />
          </div>

          <MetricTiles
            metrics={METRICS}
            latest={latest}
            selected={selectedKey}
            onSelect={onTileClick}
          />

          <TrendSection
            allSeries={allSeries}
            focused={selectedKey}
            windowKey={windowKey}
            onWindowChange={setWindowKey}
            counts={windowCounts}
          />
        </>
      )}
    </article>
  );
}

function SelectedHero({
  metric,
  value,
  delta,
  windowKey,
  isFocused,
}: {
  metric: MetricDef;
  value: number | null;
  delta: number | null;
  windowKey: WindowKey;
  isFocused: boolean;
}) {
  const deltaSign = delta == null || delta === 0 ? 0 : delta > 0 ? 1 : -1;
  const deltaScored = metric.invertDelta ? -deltaSign : deltaSign;
  const deltaColor =
    deltaScored > 0
      ? "var(--ok)"
      : deltaScored < 0
        ? "var(--danger)"
        : "var(--fg-soft)";
  const arrow = deltaSign > 0 ? "▲" : deltaSign < 0 ? "▼" : "◆";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div
        style={{
          fontFamily: "var(--f-mono)",
          fontSize: 10.5,
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          color: "var(--fg-mute)",
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <span>{metric.label}</span>
        {!isFocused && metric.key === "weight" && (
          <span
            style={{
              fontSize: 9,
              letterSpacing: "0.18em",
              color: "var(--fg-faint)",
            }}
          >
            · default · tap a tile to focus a line
          </span>
        )}
      </div>
      <div
        className="hp-body-weight"
        style={{
          fontFamily: "var(--f-serif)",
          fontSize: 110,
          lineHeight: 0.9,
          letterSpacing: "-0.03em",
          margin: 0,
          display: "flex",
          alignItems: "baseline",
          gap: 6,
        }}
      >
        <span className="skel">
          {value != null ? value.toFixed(metric.digits) : "—"}
        </span>
        {metric.unit && (
          <span
            style={{
              fontFamily: "var(--f-serif)",
              fontStyle: "italic",
              fontSize: 22,
              color: "var(--fg-mute)",
            }}
          >
            {metric.unit}
          </span>
        )}
      </div>
      {delta != null && (
        <div
          style={{
            fontFamily: "var(--f-mono)",
            fontSize: 11,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "var(--fg-mute)",
          }}
        >
          <span style={{ color: deltaColor, marginRight: 6 }}>
            {arrow} {Math.abs(delta).toFixed(metric.digits)}
            {metric.unit ? ` ${metric.unit}` : ""}
          </span>
          <span>over last {WINDOW_LABEL[windowKey]}</span>
        </div>
      )}
    </div>
  );
}

function CompositionBar({ latest }: { latest: BodyMeasurement }) {
  const fat = latest.fatMassKg ?? 0;
  const muscle = latest.muscleMassKg ?? 0;
  const bone = latest.boneMassKg ?? 0;
  const total = fat + muscle + bone;

  if (total <= 0) return <div />;

  const segments = [
    { key: "muscle", label: "Muscle", value: muscle, color: "var(--ok)" },
    { key: "fat", label: "Fat", value: fat, color: "var(--accent)" },
    {
      key: "bone",
      label: "Bone",
      value: bone,
      color: "color-mix(in oklab, var(--fg) 35%, transparent)",
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div
        style={{
          fontFamily: "var(--f-mono)",
          fontSize: 10.5,
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          color: "var(--fg-mute)",
        }}
      >
        Composition
      </div>
      <div
        style={{
          display: "flex",
          width: "100%",
          height: 20,
          gap: 2,
          flexShrink: 0,
        }}
      >
        {segments.map((s) => (
          <span
            key={s.key}
            title={`${s.label} · ${s.value.toFixed(1)} kg · ${((s.value / total) * 100).toFixed(1)}%`}
            style={{
              width: `${(s.value / total) * 100}%`,
              height: "100%",
              background: s.color,
              transition: "width 240ms cubic-bezier(.4,0,.2,1)",
            }}
          />
        ))}
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
          gap: 14,
        }}
      >
        {segments.map((s) => (
          <div
            key={`legend-${s.key}`}
            style={{ display: "flex", flexDirection: "column", gap: 4 }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span
                style={{
                  width: 8,
                  height: 8,
                  background: s.color,
                  display: "inline-block",
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  fontFamily: "var(--f-mono)",
                  fontSize: 10,
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  color: "var(--fg-mute)",
                }}
              >
                {s.label}
              </span>
            </div>
            <div
              style={{
                fontFamily: "var(--f-serif)",
                fontSize: 22,
                lineHeight: 1.05,
                letterSpacing: "-0.01em",
                display: "flex",
                alignItems: "baseline",
                gap: 6,
                flexWrap: "wrap",
              }}
            >
              <span>{s.value.toFixed(1)}</span>
              <span
                style={{
                  fontStyle: "italic",
                  fontSize: 12,
                  color: "var(--fg-mute)",
                }}
              >
                kg · {((s.value / total) * 100).toFixed(0)}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MetricTiles({
  metrics,
  latest,
  selected,
  onSelect,
}: {
  metrics: MetricDef[];
  latest: BodyMeasurement;
  selected: MetricKey | null;
  onSelect: (k: MetricKey) => void;
}) {
  return (
    <div
      style={{
        marginTop: 28,
        paddingTop: 22,
        borderTop: "1px solid var(--rule)",
      }}
    >
      <div
        style={{
          fontFamily: "var(--f-mono)",
          fontSize: 10.5,
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          color: "var(--fg-mute)",
          marginBottom: 12,
        }}
      >
        {selected ? "Tap again to unfocus" : "Tap a metric to focus its line"}
      </div>
      <div
        className="hp-body-tiles"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
          gap: 10,
        }}
      >
        {metrics.map((m) => {
          const v = m.accessor(latest);
          const isActive = m.key === selected;
          return (
            <button
              key={m.key}
              type="button"
              onClick={() => onSelect(m.key)}
              style={{
                appearance: "none",
                background: isActive ? "var(--card-elev)" : "transparent",
                border: `1px solid ${isActive ? m.color : "var(--rule)"}`,
                padding: "12px 14px",
                cursor: "pointer",
                textAlign: "left",
                outline: "none",
                transition:
                  "background 160ms ease, border-color 160ms ease, transform 120ms ease",
                color: "inherit",
                fontFamily: "inherit",
                display: "flex",
                flexDirection: "column",
                gap: 6,
                minWidth: 0,
              }}
              onMouseDown={(e) =>
                (e.currentTarget.style.transform = "scale(0.985)")
              }
              onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
              onMouseLeave={(e) =>
                (e.currentTarget.style.transform = "scale(1)")
              }
            >
              <span
                style={{
                  fontFamily: "var(--f-mono)",
                  fontSize: 9.5,
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  color: isActive ? m.color : "var(--fg-mute)",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <span
                  style={{
                    width: 8,
                    height: 8,
                    background: m.color,
                    flexShrink: 0,
                  }}
                />
                {m.short}
              </span>
              <span
                style={{
                  fontFamily: "var(--f-serif)",
                  fontSize: 22,
                  lineHeight: 1,
                  letterSpacing: "-0.01em",
                  display: "flex",
                  alignItems: "baseline",
                  gap: 4,
                }}
              >
                <span>{v != null ? v.toFixed(m.digits) : "—"}</span>
                {m.unit && (
                  <span
                    style={{
                      fontStyle: "italic",
                      fontSize: 11,
                      color: "var(--fg-mute)",
                    }}
                  >
                    {m.unit}
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

interface SeriesData {
  metric: MetricDef;
  points: Array<{ date: string; value: number }>;
  min: number;
  max: number;
}

function TrendSection({
  allSeries,
  focused,
  windowKey,
  onWindowChange,
  counts,
}: {
  allSeries: SeriesData[];
  focused: MetricKey | null;
  windowKey: WindowKey;
  onWindowChange: (k: WindowKey) => void;
  counts: Record<WindowKey, number>;
}) {
  // shared time axis spanning every series in this window
  const { minTime, maxTime, totalPoints } = useMemo(() => {
    let mn = Number.POSITIVE_INFINITY;
    let mx = Number.NEGATIVE_INFINITY;
    let n = 0;
    for (const s of allSeries) {
      n += s.points.length;
      for (const p of s.points) {
        const t = new Date(p.date).getTime();
        if (t < mn) mn = t;
        if (t > mx) mx = t;
      }
    }
    if (!Number.isFinite(mn)) mn = Date.now();
    if (!Number.isFinite(mx)) mx = mn;
    return { minTime: mn, maxTime: mx, totalPoints: n };
  }, [allSeries]);

  return (
    <div
      style={{
        marginTop: 28,
        paddingTop: 22,
        borderTop: "1px solid var(--rule)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 16,
          marginBottom: 4,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span
            style={{
              fontFamily: "var(--f-mono)",
              fontSize: 10.5,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: "var(--fg-mute)",
            }}
          >
            All trends
          </span>
          <WindowSelect
            value={windowKey}
            onChange={onWindowChange}
            counts={counts}
          />
        </div>
        <span
          style={{
            fontFamily: "var(--f-mono)",
            fontSize: 10.5,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "var(--fg-mute)",
          }}
        >
          {focused
            ? METRICS.find((m) => m.key === focused)?.label + " focused"
            : `${allSeries.filter((s) => s.points.length > 0).length} metrics overlaid`}
        </span>
      </div>
      {totalPoints > 1 ? (
        <MultiSeriesChart
          allSeries={allSeries}
          minTime={minTime}
          maxTime={maxTime}
          focused={focused}
        />
      ) : (
        <div
          style={{
            height: 72,
            marginTop: 14,
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
      )}
    </div>
  );
}

function MultiSeriesChart({
  allSeries,
  minTime,
  maxTime,
  focused,
}: {
  allSeries: SeriesData[];
  minTime: number;
  maxTime: number;
  focused: MetricKey | null;
}) {
  const VIEW_W = 1000;
  const VIEW_H = 200;
  const PAD = { t: 14, r: 12, b: 10, l: 12 };
  const innerW = VIEW_W - PAD.l - PAD.r;
  const innerH = VIEW_H - PAD.t - PAD.b;
  const timeSpan = Math.max(1, maxTime - minTime);

  const xFor = (timeMs: number) =>
    PAD.l + ((timeMs - minTime) / timeSpan) * innerW;
  const yFor = (v: number, min: number, max: number) =>
    PAD.t + (1 - (v - min) / (max - min || 1)) * innerH;

  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [hoverTime, setHoverTime] = useState<number | null>(null);

  const monthTicks = useMemo(() => {
    const totalDays = timeSpan / 86_400_000;
    if (totalDays < 60) return [] as Array<{ pct: number; label: string }>;
    const ticks: Array<{ pct: number; label: string }> = [];
    const cur = new Date(minTime);
    cur.setUTCDate(1);
    cur.setUTCMonth(cur.getUTCMonth() + 1);
    while (cur.getTime() <= maxTime) {
      ticks.push({
        pct: ((cur.getTime() - minTime) / timeSpan) * 100,
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
  }, [minTime, maxTime, timeSpan]);

  const handleMove = (e: React.MouseEvent<SVGRectElement>) => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const rect = wrap.getBoundingClientRect();
    if (rect.width <= 0) return;
    const ratio = (e.clientX - rect.left) / rect.width;
    setHoverTime(minTime + ratio * timeSpan);
  };

  // derive snapped value per visible series at the hovered time
  const hoveredValues = useMemo(() => {
    if (hoverTime == null)
      return [] as Array<{
        metric: MetricDef;
        value: number;
        date: string;
      }>;
    const out: Array<{ metric: MetricDef; value: number; date: string }> = [];
    for (const s of allSeries) {
      if (s.points.length === 0) continue;
      let nearest = s.points[0];
      let nearestDist = Math.abs(new Date(nearest.date).getTime() - hoverTime);
      for (let i = 1; i < s.points.length; i++) {
        const t = new Date(s.points[i].date).getTime();
        const d = Math.abs(t - hoverTime);
        if (d < nearestDist) {
          nearestDist = d;
          nearest = s.points[i];
        }
      }
      out.push({
        metric: s.metric,
        value: nearest.value,
        date: nearest.date,
      });
    }
    return out;
  }, [hoverTime, allSeries]);

  const hoverPct =
    hoverTime != null ? ((hoverTime - minTime) / timeSpan) * 100 : 0;
  const tooltipDateIso =
    focused && hoveredValues.length > 0
      ? (hoveredValues.find((h) => h.metric.key === focused)?.date ??
        hoveredValues[0]?.date)
      : (hoveredValues[0]?.date ?? null);
  const tooltipDateLabel = tooltipDateIso
    ? new Date(tooltipDateIso).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null;

  return (
    <div ref={wrapRef} style={{ position: "relative", marginTop: 16 }}>
      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        preserveAspectRatio="none"
        style={{ width: "100%", height: VIEW_H, display: "block" }}
      >
        {allSeries.map((s) => {
          if (s.points.length === 0) return null;
          let d = "";
          if (s.points.length === 1) {
            const y = yFor(s.points[0].value, s.min, s.max);
            d = `M ${PAD.l} ${y.toFixed(1)} L ${(VIEW_W - PAD.r).toFixed(1)} ${y.toFixed(1)}`;
          } else {
            for (let i = 0; i < s.points.length; i++) {
              const p = s.points[i];
              const x = xFor(new Date(p.date).getTime());
              const y = yFor(p.value, s.min, s.max);
              d +=
                i === 0
                  ? `M ${x.toFixed(1)} ${y.toFixed(1)}`
                  : ` L ${x.toFixed(1)} ${y.toFixed(1)}`;
            }
          }
          const isFocused = focused != null && s.metric.key === focused;
          const isFaded = focused != null && s.metric.key !== focused;
          const opacity = isFaded ? 0.12 : 1;
          const strokeWidth = isFocused ? 2 : 1.4;
          return (
            <path
              key={s.metric.key}
              d={d}
              fill="none"
              stroke={s.metric.color}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
              opacity={opacity}
              style={{
                transition:
                  "opacity 240ms cubic-bezier(.4,0,.2,1), stroke-width 240ms cubic-bezier(.4,0,.2,1)",
              }}
            />
          );
        })}

        <rect
          x={0}
          y={0}
          width={VIEW_W}
          height={VIEW_H}
          fill="transparent"
          style={{ cursor: "crosshair" }}
          onMouseMove={handleMove}
          onMouseLeave={() => setHoverTime(null)}
        />
      </svg>

      {/* hover guideline */}
      <div
        style={{
          position: "absolute",
          left: `${hoverPct}%`,
          top: PAD.t,
          height: innerH,
          width: 0,
          borderLeft: "1px dashed var(--fg-mute)",
          transform: "translateX(-0.5px)",
          pointerEvents: "none",
          opacity: hoverTime != null ? 1 : 0,
          transition: "left 130ms linear, opacity 100ms linear",
        }}
      />

      {/* hover dots: one per visible series at its nearest point */}
      {hoveredValues.map((h) => {
        const series = allSeries.find((s) => s.metric.key === h.metric.key);
        if (!series) return null;
        const x = xFor(new Date(h.date).getTime());
        const y = yFor(h.value, series.min, series.max);
        const isFaded = focused != null && h.metric.key !== focused;
        return (
          <div
            key={`dot-${h.metric.key}`}
            style={{
              position: "absolute",
              left: `${(x / VIEW_W) * 100}%`,
              top: y,
              width: 7,
              height: 7,
              borderRadius: "50%",
              background: h.metric.color,
              border: "1.5px solid var(--background)",
              transform: "translate(-50%, -50%)",
              pointerEvents: "none",
              opacity: hoverTime != null && !isFaded ? 1 : 0,
              transition:
                "left 130ms linear, top 130ms linear, opacity 100ms linear",
            }}
          />
        );
      })}

      {/* tooltip */}
      {hoverTime != null && hoveredValues.length > 0 && (
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
            transition: "left 130ms linear",
          }}
        >
          {tooltipDateLabel && (
            <div style={{ color: "var(--fg-mute)", marginBottom: 4 }}>
              {tooltipDateLabel}
            </div>
          )}
          {(focused
            ? hoveredValues.filter((h) => h.metric.key === focused)
            : hoveredValues
          ).map((h) => (
            <div
              key={`tt-${h.metric.key}`}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                lineHeight: 1.4,
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  background: h.metric.color,
                  flexShrink: 0,
                }}
              />
              <span style={{ color: "var(--fg-mute)" }}>{h.metric.short}</span>
              <span style={{ marginLeft: "auto" }}>
                {h.value.toFixed(h.metric.digits)}
                {h.metric.unit ? (
                  <span
                    style={{ color: "var(--fg-mute)", marginLeft: 2 }}
                  >{` ${h.metric.unit}`}</span>
                ) : null}
              </span>
            </div>
          ))}
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

function WindowSelect({
  value,
  onChange,
  counts,
}: {
  value: WindowKey;
  onChange: (v: WindowKey) => void;
  counts: Record<WindowKey, number>;
}) {
  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as WindowKey)}
        style={{
          appearance: "none",
          WebkitAppearance: "none",
          MozAppearance: "none",
          fontFamily: "var(--f-mono)",
          fontSize: 10.5,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: "var(--fg-soft)",
          background: "transparent",
          border: "1px solid var(--rule-strong)",
          padding: "4px 22px 4px 8px",
          margin: 0,
          cursor: "pointer",
          outline: "none",
          lineHeight: 1.2,
        }}
      >
        {WINDOW_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label} ({counts[o.value]})
          </option>
        ))}
      </select>
      <span
        aria-hidden
        style={{
          position: "absolute",
          right: 8,
          top: "50%",
          transform: "translateY(-55%)",
          pointerEvents: "none",
          fontSize: 9,
          color: "var(--fg-mute)",
        }}
      >
        ▾
      </span>
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
