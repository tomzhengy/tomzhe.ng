"use client";

import { useState } from "react";
import type { Recovery, TrendPoint } from "./types";
import { recoveryHue, sanitizeCopyHtml } from "./format";
import { CardHead } from "./StrainCard";
import Sparkline from "./Sparkline";

interface RecoveryHeroProps {
  recovery: Recovery | null;
  trend: TrendPoint[];
  subHtml: string | null;
}

export default function RecoveryHero({
  recovery,
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

  const fallbackCopy = recovery
    ? "HRV and recovery metrics from WHOOP."
    : "No recovery score yet — check back after your next sleep.";

  return (
    <article
      className="health-card filled"
      style={{
        background: "var(--card)",
        border: "1px solid transparent",
        padding: "22px 24px 24px",
        gridColumn: "span 4",
        position: "relative",
        ["--recovery-hue" as string]: recoveryHue(score),
      }}
    >
      <CardHead title="Recovery" subtitle="0–100% scale" />

      <div
        className="hp-hero-score"
        style={{
          fontFamily: "var(--f-serif)",
          fontSize: 110,
          lineHeight: 0.9,
          letterSpacing: "-0.03em",
          margin: "14px 0 8px",
          display: "flex",
          alignItems: "baseline",
          gap: 6,
          color: "var(--recovery-hue)",
        }}
      >
        <span className="skel">{score ?? "—"}</span>
        <span
          style={{
            fontFamily: "var(--f-serif)",
            fontStyle: "italic",
            fontSize: 22,
            color: "var(--fg-mute)",
          }}
        >
          %
        </span>
      </div>

      <p
        style={{
          fontFamily: "var(--f-serif)",
          fontSize: 20,
          lineHeight: 1.25,
          color: "var(--fg-soft)",
          maxWidth: "30ch",
          margin: 0,
        }}
        dangerouslySetInnerHTML={{
          __html: subHtml ? sanitizeCopyHtml(subHtml) : fallbackCopy,
        }}
      />

      <RecoveryStat
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
      <RecoveryStat
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
    </article>
  );
}

function RecoveryStat({
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
      style={{
        marginTop: 24,
        paddingTop: 18,
        borderTop: "1px solid var(--rule)",
      }}
    >
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
          fontSize: 36,
          lineHeight: 1,
          letterSpacing: "-0.02em",
          margin: "8px 0 2px",
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
            fontSize: 14,
            color: "var(--fg-mute)",
          }}
        >
          {unit}
        </span>
      </div>
      <div
        style={{
          fontFamily: "var(--f-sans)",
          fontSize: 11.5,
          color: "var(--fg-mute)",
        }}
      >
        {caption}
      </div>
      <Sparkline
        values={series}
        unit={unit}
        digits={seriesDigits}
        sharedHoverIdx={hoverIdx}
        onHoverChange={onHoverChange}
        height={32}
      />
    </div>
  );
}
