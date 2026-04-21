"use client";

import type { Recovery, TrendPoint } from "./types";
import { formatDateShort, recoveryHue, sanitizeCopyHtml } from "./format";
import Sparkline from "./Sparkline";

interface RecoveryHeroProps {
  recovery: Recovery | null;
  nowIso: string;
  trend: TrendPoint[];
  headlineHtml: string | null;
  subHtml: string | null;
}

export default function RecoveryHero({
  recovery,
  nowIso,
  trend,
  headlineHtml,
  subHtml,
}: RecoveryHeroProps) {
  const score = recovery?.score?.recovery_score ?? null;
  const hrv = recovery?.score?.hrv_rmssd_milli ?? null;
  const rhr = recovery?.score?.resting_heart_rate ?? null;
  const spo2 = recovery?.score?.spo2_percentage ?? null;
  const skinTemp = recovery?.score?.skin_temp_celsius ?? null;

  const hrvSeries = trend.map((t) => t.hrv ?? 0).filter((_, _i, a) => a.length);
  const rhrSeries = trend.map((t) => t.rhr ?? 0);
  const spo2Series = trend.map(() => spo2 ?? 0); // WHOOP returns per-day inside recovery loop; placeholder when absent
  const tempSeries = trend.map(() => skinTemp ?? 0);

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

  const fallbackHeadline = recovery
    ? score != null && score >= 67
      ? "Your body is <em>primed</em> to push."
      : score != null && score >= 34
        ? "A <em>moderate</em> day — hold steady."
        : "Today is for <em>recovery</em>. Go gentle."
    : "Awaiting your <em>next cycle</em>.";

  const fallbackSub = recovery
    ? "HRV and recovery metrics are pulled from WHOOP."
    : "No recovery score yet — check back after your next sleep.";

  return (
    <section
      style={{
        display: "grid",
        gridTemplateColumns: "1.1fr 1fr",
        gap: 36,
        alignItems: "stretch",
        padding: "34px 36px",
        border: "1px solid var(--rule)",
        position: "relative",
        overflow: "hidden",
        ["--recovery-hue" as string]: recoveryHue(score),
      }}
      className="health-hero"
    >
      <div style={{ position: "relative", zIndex: 1 }}>
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
          style={{
            fontFamily: "var(--f-serif)",
            fontSize: 180,
            lineHeight: 0.85,
            letterSpacing: "-0.035em",
            margin: "8px 0 10px",
            display: "flex",
            alignItems: "baseline",
            gap: 4,
            color: "var(--recovery-hue)",
          }}
        >
          <span className="skel">{score ?? "—"}</span>
          <span
            style={{
              fontSize: 40,
              color: "var(--fg-mute)",
              fontStyle: "italic",
              marginLeft: 4,
            }}
          >
            %
          </span>
        </div>
        <h3
          style={{
            fontFamily: "var(--f-serif)",
            fontSize: 32,
            lineHeight: 1.1,
            letterSpacing: "-0.01em",
            margin: "0 0 14px",
            maxWidth: "28ch",
          }}
          dangerouslySetInnerHTML={{
            __html: headlineHtml
              ? sanitizeCopyHtml(headlineHtml)
              : fallbackHeadline,
          }}
        />
        <p
          style={{
            fontFamily: "var(--f-sans)",
            fontSize: 13.5,
            color: "var(--fg-soft)",
            maxWidth: "40ch",
            lineHeight: 1.55,
          }}
          dangerouslySetInnerHTML={{
            __html: subHtml ? sanitizeCopyHtml(subHtml) : fallbackSub,
          }}
        />
      </div>

      <div
        style={{
          position: "relative",
          zIndex: 1,
          display: "grid",
          gridTemplateColumns: "1.1fr 0.9fr",
          gap: 0,
          alignContent: "start",
          height: "100%",
        }}
      >
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
          position="tl"
        />
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
          position="tr"
        />
        <SubMetric
          label="Blood Oxygen"
          value={spo2 != null ? spo2.toFixed(1) : "—"}
          unit="%"
          delta={null}
          caption="Typical 95–99% range"
          series={spo2Series}
          seriesDigits={1}
          position="bl"
        />
        <SubMetric
          label="Skin Temperature"
          value={skinTemp != null ? skinTemp.toFixed(1) : "—"}
          unit="°C"
          delta={null}
          caption="Relative to baseline"
          series={tempSeries}
          seriesDigits={1}
          position="br"
        />
      </div>
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
  position,
}: {
  label: string;
  value: string;
  unit: string;
  delta: number | null;
  invertDelta?: boolean;
  caption: string;
  series: number[];
  seriesDigits?: number;
  position: "tl" | "tr" | "bl" | "br";
}) {
  const top = position === "tl" || position === "tr";
  const left = position === "tl" || position === "bl";

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
        padding: "14px 20px",
        position: "relative",
        borderRight: left ? "1px solid var(--rule)" : "none",
        borderBottom: top ? "1px solid var(--rule)" : "none",
        paddingTop: top ? 4 : 14,
        paddingBottom: !top ? 4 : 14,
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
          fontSize: 52,
          lineHeight: 1,
          letterSpacing: "-0.02em",
          margin: "14px 0 2px",
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
      <Sparkline values={series} unit={unit} digits={seriesDigits} />
    </div>
  );
}
