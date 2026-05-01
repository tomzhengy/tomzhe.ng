"use client";

import { useMemo, useState } from "react";
import type { BodyData, BodyMeasurement } from "./types";
import { CardHead } from "./StrainCard";
import Sparkline from "./Sparkline";
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
  invertDelta?: boolean; // true when "down is good" (e.g. body fat %)
}

const METRICS: MetricDef[] = [
  {
    key: "weight",
    label: "Weight",
    short: "Weight",
    accessor: (m) => m.weightKg,
    unit: "kg",
    digits: 1,
  },
  {
    key: "body_fat",
    label: "Body Fat",
    short: "Body Fat",
    accessor: (m) => m.bodyFatPct,
    unit: "%",
    digits: 1,
    invertDelta: true,
  },
  {
    key: "muscle",
    label: "Muscle Mass",
    short: "Muscle",
    accessor: (m) => m.muscleMassKg,
    unit: "kg",
    digits: 1,
  },
  {
    key: "fat_mass",
    label: "Fat Mass",
    short: "Fat",
    accessor: (m) => m.fatMassKg,
    unit: "kg",
    digits: 1,
    invertDelta: true,
  },
  {
    key: "hydration",
    label: "Hydration",
    short: "Hydration",
    accessor: (m) => m.hydrationKg,
    unit: "kg",
    digits: 1,
  },
  {
    key: "bone",
    label: "Bone Mass",
    short: "Bone",
    accessor: (m) => m.boneMassKg,
    unit: "kg",
    digits: 1,
  },
  {
    key: "visceral",
    label: "Visceral Fat",
    short: "Visceral",
    accessor: (m) => m.visceralFat,
    unit: "",
    digits: 1,
    invertDelta: true,
  },
  {
    key: "bmr",
    label: "BMR",
    short: "BMR",
    accessor: (m) => m.basalMetabolicRateKcal,
    unit: "kcal",
    digits: 0,
  },
];

const WINDOW_LABEL: Record<WindowKey, string> = {
  "14": "2 weeks",
  "30": "1 month",
  "90": "3 months",
  all: "all time",
};

export default function BodyCard({ body }: BodyCardProps) {
  const latest = body?.latest ?? null;
  const trend = body?.trend ?? [];

  const [selectedKey, setSelectedKey] = useState<MetricKey>("weight");
  const [windowKey, setWindowKey] = useState<WindowKey>("30");

  const metric = METRICS.find((m) => m.key === selectedKey) ?? METRICS[0];

  const displayTrend = useMemo(() => {
    if (windowKey === "all") return trend;
    const days = Number.parseInt(windowKey, 10);
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    return trend.filter((p) => new Date(p.measuredAt).getTime() >= cutoff);
  }, [trend, windowKey]);

  const points = useMemo(
    () =>
      displayTrend
        .map((p) => {
          const v = metric.accessor(p);
          return v != null ? { value: v, date: p.measuredAt } : null;
        })
        .filter((p): p is { value: number; date: string } => p != null),
    [displayTrend, metric],
  );
  const series = points.map((p) => p.value);
  const dates = points.map((p) => p.date);

  const windowCounts = useMemo(() => {
    const now = Date.now();
    const out: Record<WindowKey, number> = {
      "14": 0,
      "30": 0,
      "90": 0,
      all: 0,
    };
    for (const p of trend) {
      const v = metric.accessor(p);
      if (v == null) continue;
      const t = new Date(p.measuredAt).getTime();
      out.all++;
      if (t >= now - 14 * 24 * 60 * 60 * 1000) out["14"]++;
      if (t >= now - 30 * 24 * 60 * 60 * 1000) out["30"]++;
      if (t >= now - 90 * 24 * 60 * 60 * 1000) out["90"]++;
    }
    return out;
  }, [trend, metric]);

  const latestValue = latest ? metric.accessor(latest) : null;
  const delta =
    series.length > 1 ? series[series.length - 1] - series[0] : null;

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
              metric={metric}
              value={latestValue}
              delta={delta}
              windowKey={windowKey}
            />
            <CompositionBar latest={latest} />
          </div>

          <MetricTiles
            metrics={METRICS}
            latest={latest}
            selected={selectedKey}
            onSelect={setSelectedKey}
          />

          <TrendSection
            metric={metric}
            series={series}
            dates={dates}
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
}: {
  metric: MetricDef;
  value: number | null;
  delta: number | null;
  windowKey: WindowKey;
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
        }}
      >
        {metric.label}
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
    {
      key: "muscle",
      label: "Muscle",
      value: muscle,
      color: "var(--ok)",
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
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
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
  selected: MetricKey;
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
        Tap a metric to chart it
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
                border: `1px solid ${isActive ? "var(--accent)" : "var(--rule)"}`,
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
                  color: isActive ? "var(--accent)" : "var(--fg-mute)",
                }}
              >
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

function TrendSection({
  metric,
  series,
  dates,
  windowKey,
  onWindowChange,
  counts,
}: {
  metric: MetricDef;
  series: number[];
  dates: string[];
  windowKey: WindowKey;
  onWindowChange: (k: WindowKey) => void;
  counts: Record<WindowKey, number>;
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
            {metric.label} trend
          </span>
          <WindowSelect
            value={windowKey}
            onChange={onWindowChange}
            counts={counts}
          />
        </div>
        {series.length > 1 && (
          <span
            style={{
              fontFamily: "var(--f-mono)",
              fontSize: 10.5,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "var(--fg-mute)",
            }}
          >
            {series[0].toFixed(metric.digits)} →{" "}
            {series[series.length - 1].toFixed(metric.digits)}
            {metric.unit ? ` ${metric.unit}` : ""}
          </span>
        )}
      </div>
      {series.length > 1 ? (
        <Sparkline
          values={series}
          dates={dates}
          unit={metric.unit}
          digits={metric.digits}
          height={72}
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
