"use client";

import { useState } from "react";
import type { Recovery, TrendPoint } from "./types";
import { formatDateShort, recoveryHue, sanitizeCopyHtml } from "./format";
import Sparkline from "./Sparkline";

interface RecoveryHeroProps {
  recovery: Recovery | null;
  nowIso: string;
  trend: TrendPoint[];
  subHtml: string | null;
}

export default function RecoveryHero({
  recovery,
  nowIso,
  trend,
  subHtml,
}: RecoveryHeroProps) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const score = recovery?.score?.recovery_score ?? null;
  const hrv = recovery?.score?.hrv_rmssd_milli ?? null;
  const rhr = recovery?.score?.resting_heart_rate ?? null;

  const hrvSeries = trend.map((t) => t.hrv ?? 0).filter((_, _i, a) => a.length);
  const rhrSeries = trend.map((t) => t.rhr ?? 0);

  const avgHrv =
    hrvSeries.length > 0
      ? hrvSeries.reduce((s, v) => s + v, 0) / hrvSeries.length
      : 0;
  const avgRhr =
    rhrSeries.length > 0
      ? rhrSeries.reduce((s, v) => s + v, 0) / rhrSeries.length
      : 0;

  const hrvDelta = hrv != null && avgHrv > 0 ? hrv - avgHrv : 0;
  const rhrDelta = rhr != null && avgRhr > 0 ? rhr - avgRhr : 0;

  const fallbackSub = recovery
    ? "HRV and recovery metrics from WHOOP."
    : "No recovery score yet — check back after your next sleep.";

  return (
    <section
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(0, 1.1fr) minmax(0, 1fr) minmax(0, 1fr)",
        gap: 0,
        alignItems: "stretch",
        padding: 0,
        border: "1px solid var(--rule)",
        position: "relative",
        overflow: "hidden",
        ["--recovery-hue" as string]: recoveryHue(score),
      }}
      className="health-hero"
    >
      {/* recovery cell */}
      <div
        className="hp-hero-recovery"
        style={{
          position: "relative",
          zIndex: 1,
          padding: "22px 26px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          minHeight: 0,
        }}
      >
        <div>
          <div
            style={{
              fontFamily: "var(--f-mono)",
              fontSize: 10.5,
              letterSpacing: "0.24em",
              textTransform: "uppercase",
              color: "var(--fg-mute)",
            }}
          >
            Recovery · {formatDateShort(nowIso)}
          </div>
          <div
            className="hp-hero-score"
            style={{
              fontFamily: "var(--f-serif)",
              fontSize: 120,
              lineHeight: 0.9,
              letterSpacing: "-0.035em",
              margin: "10px 0 0",
              display: "flex",
              alignItems: "baseline",
              gap: 4,
              color: "var(--recovery-hue)",
            }}
          >
            <span className="skel">{score ?? "—"}</span>
            <span
              style={{
                fontSize: 28,
                color: "var(--fg-mute)",
                fontStyle: "italic",
                marginLeft: 4,
              }}
            >
              %
            </span>
          </div>
        </div>
        <p
          style={{
            fontFamily: "var(--f-serif)",
            fontStyle: "italic",
            fontSize: 16,
            lineHeight: 1.35,
            color: "var(--fg-soft)",
            maxWidth: "32ch",
            margin: "12px 0 0",
          }}
          dangerouslySetInnerHTML={{
            __html: subHtml ? sanitizeCopyHtml(subHtml) : fallbackSub,
          }}
        />
      </div>

      {/* hrv cell */}
      <SubMetric
        label="Heart Rate Variability"
        value={hrv != null ? `${Math.round(hrv)}` : "—"}
        unit="ms"
        delta={hrv != null ? hrvDelta : null}
        caption={
          avgHrv > 0 ? `7-day avg ${Math.round(avgHrv)}` : "Baseline pending"
        }
        series={hrvSeries}
        seriesDigits={0}
        hoverIdx={hoverIdx}
        onHoverChange={setHoverIdx}
      />

      {/* rhr cell */}
      <SubMetric
        label="Resting Heart Rate"
        value={rhr != null ? `${Math.round(rhr)}` : "—"}
        unit="bpm"
        delta={rhr != null ? rhrDelta : null}
        invertDelta
        caption={
          avgRhr > 0 ? `7-day avg ${Math.round(avgRhr)}` : "Baseline pending"
        }
        series={rhrSeries}
        seriesDigits={0}
        hoverIdx={hoverIdx}
        onHoverChange={setHoverIdx}
      />
    </section>
  );
}

function SubMetric({
  label,
  value,
  unit,
  delta,
  invertDelta = false,
  caption,
  series,
  seriesDigits = 0,
  hoverIdx,
  onHoverChange,
}: {
  label: string;
  value: string;
  unit: string;
  delta: number | null;
  invertDelta?: boolean;
  caption: string;
  series: number[];
  seriesDigits?: number;
  hoverIdx: number | null;
  onHoverChange: (idx: number | null) => void;
}) {
  let deltaTxt = "◆ 0";
  let deltaColor: string = "var(--fg-soft)";
  if (delta != null) {
    const sign = invertDelta ? -Math.sign(delta) : Math.sign(delta);
    const abs = Math.abs(delta);
    if (abs < 0.5) {
      deltaTxt = `◆ ${abs.toFixed(0)}`;
    } else if (sign > 0) {
      deltaTxt = `▲ ${abs.toFixed(0)}`;
      deltaColor = "var(--ok)";
    } else if (sign < 0) {
      deltaTxt = `▼ ${abs.toFixed(0)}`;
      deltaColor = "var(--danger)";
    }
  }

  return (
    <div
      className="hp-hero-cell"
      style={{
        padding: "22px 26px",
        position: "relative",
        borderLeft: "1px solid var(--rule)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        minWidth: 0,
      }}
    >
      <div>
        <div
          style={{
            fontFamily: "var(--f-mono)",
            fontSize: 10,
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            color: "var(--fg-mute)",
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <span>{label}</span>
          <span style={{ color: deltaColor, letterSpacing: "0.06em" }}>
            {deltaTxt}
          </span>
        </div>
        <div
          style={{
            fontFamily: "var(--f-serif)",
            fontSize: 52,
            lineHeight: 1,
            letterSpacing: "-0.02em",
            margin: "10px 0 2px",
            display: "flex",
            alignItems: "baseline",
            gap: 4,
          }}
        >
          <span className="skel">{value}</span>
          <span
            style={{
              fontFamily: "var(--f-serif)",
              fontStyle: "italic",
              fontSize: 18,
              color: "var(--fg-mute)",
            }}
          >
            {unit}
          </span>
        </div>
        <div
          style={{
            fontFamily: "var(--f-sans)",
            fontSize: 12,
            color: "var(--fg-mute)",
          }}
        >
          {caption}
        </div>
      </div>
      <Sparkline
        values={series}
        unit={unit}
        digits={seriesDigits}
        sharedHoverIdx={hoverIdx}
        onHoverChange={onHoverChange}
        height={36}
      />
    </div>
  );
}
