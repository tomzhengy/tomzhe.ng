"use client";

import { useState } from "react";
import type { Recovery, TrendPoint } from "./types";
import { recoveryHue, sanitizeCopyHtml } from "./format";
import { CardHead } from "./StrainCard";
import Sparkline from "./Sparkline";
import RollingNumber from "./RollingNumber";

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
        display: "flex",
        flexDirection: "column",
        ["--recovery-hue" as string]: recoveryHue(score),
      }}
    >
      <CardHead title="Recovery" subtitle="0–100% scale" />

      <div
        className="hp-hero-top"
        style={{
          display: "grid",
          gridTemplateColumns: "auto minmax(0, 1fr)",
          gap: 24,
          alignItems: "start",
          marginTop: 14,
        }}
      >
        <div
          className="hp-hero-score"
          style={{
            fontFamily: "var(--f-serif)",
            fontSize: 144,
            lineHeight: 0.9,
            letterSpacing: "-0.03em",
            display: "flex",
            alignItems: "baseline",
            gap: 6,
            color: "var(--recovery-hue)",
            margin: 0,
          }}
        >
          <span className="skel">
            <RollingNumber value={score} digits={0} />
          </span>
          <span
            style={{
              fontFamily: "var(--f-serif)",
              fontStyle: "italic",
              fontSize: 28,
              color: "var(--fg-mute)",
            }}
          >
            %
          </span>
        </div>

        <p
          style={{
            fontFamily: "var(--f-serif)",
            fontSize: 18,
            lineHeight: 1.3,
            color: "var(--fg-soft)",
            margin: 0,
          }}
          dangerouslySetInnerHTML={{
            __html: subHtml ? sanitizeCopyHtml(subHtml) : fallbackCopy,
          }}
        />
      </div>

      {/* push the hrv/rhr strip to the bottom so the card matches the
          taller strain/sleep cards in row 1 without dead space at the top. */}
      <div style={{ flex: 1, minHeight: 14 }} />

      <div
        className="hp-recovery-stats"
        style={{
          marginTop: 24,
          paddingTop: 18,
          borderTop: "1px solid var(--rule)",
          display: "grid",
          gridTemplateColumns: "1fr",
          gap: 18,
        }}
      >
        <RecoveryStat
          label="Heart Rate Variability"
          value={hrv != null ? Math.round(hrv) : null}
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
          value={rhr != null ? Math.round(rhr) : null}
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
      </div>
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
  value: number | null;
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
    <div style={{ minWidth: 0 }}>
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
          fontSize: 32,
          lineHeight: 1,
          letterSpacing: "-0.02em",
          margin: "8px 0 2px",
          display: "flex",
          alignItems: "baseline",
          gap: 4,
        }}
      >
        <span className="skel">
          <RollingNumber value={value} digits={0} />
        </span>
        <span
          style={{
            fontFamily: "var(--f-serif)",
            fontStyle: "italic",
            fontSize: 13,
            color: "var(--fg-mute)",
          }}
        >
          {unit}
        </span>
      </div>
      <div
        style={{
          fontFamily: "var(--f-sans)",
          fontSize: 11,
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
        height={40}
      />
    </div>
  );
}
