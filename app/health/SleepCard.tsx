"use client";

import type { Sleep } from "./types";
import { formatDuration, sanitizeCopyHtml, splitHoursMinutes } from "./format";
import { CardHead } from "./StrainCard";
import RollingNumber from "./RollingNumber";

interface SleepCardProps {
  sleep: Sleep | null;
  sleepCopyHtml: string | null;
}

const STAGE_COLORS = {
  awake: "color-mix(in oklab, var(--foreground) 22%, var(--background))",
  light: "color-mix(in oklab, var(--foreground) 45%, var(--background))",
  rem: "color-mix(in oklab, var(--foreground) 68%, var(--background))",
  deep: "var(--foreground)",
};

export default function SleepCard({ sleep, sleepCopyHtml }: SleepCardProps) {
  const stage = sleep?.score?.stage_summary ?? null;
  const awakeMs = stage?.total_awake_time_milli ?? 0;
  const lightMs = stage?.total_light_sleep_time_milli ?? 0;
  const remMs = stage?.total_rem_sleep_time_milli ?? 0;
  const deepMs = stage?.total_slow_wave_sleep_time_milli ?? 0;
  const totalMs = awakeMs + lightMs + remMs + deepMs;
  const asleepMs = lightMs + remMs + deepMs;
  const { h: sleepH, m: sleepM } = splitHoursMinutes(asleepMs);

  const perf = sleep?.score?.sleep_performance_percentage ?? null;
  const eff = sleep?.score?.sleep_efficiency_percentage ?? null;
  const resp = sleep?.score?.respiratory_rate ?? null;
  const dist = stage?.disturbance_count ?? null;

  const fallback =
    sleep == null
      ? "No sleep data yet for this cycle."
      : perf != null
        ? `Hit <em>${Math.round(perf)}%</em> of your sleep need across the night.`
        : "A steady night across three cycles.";

  const stages: Array<{
    key: "awake" | "light" | "rem" | "deep";
    label: string;
    ms: number;
    color: string;
  }> = [
    { key: "awake", label: "Awake", ms: awakeMs, color: STAGE_COLORS.awake },
    { key: "light", label: "Light", ms: lightMs, color: STAGE_COLORS.light },
    { key: "rem", label: "REM", ms: remMs, color: STAGE_COLORS.rem },
    { key: "deep", label: "Deep", ms: deepMs, color: STAGE_COLORS.deep },
  ];

  const widthPct = (ms: number) => (totalMs > 0 ? (ms / totalMs) * 100 : 0);
  const labelPct = (ms: number) =>
    totalMs > 0 ? `${Math.round((ms / totalMs) * 100)}%` : "—";

  return (
    <article
      className="health-card"
      style={{
        border: "1px solid var(--rule)",
        padding: "22px 24px 14px",
        gridColumn: "span 4",
        position: "relative",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <CardHead title="Sleep" />

      <div
        className="hp-sleep-top"
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
            lineHeight: 0.95,
            letterSpacing: "-0.03em",
            display: "flex",
            alignItems: "baseline",
            gap: 6,
            margin: 0,
          }}
        >
          <span className="skel">
            <RollingNumber value={sleepH} digits={0} />
          </span>
          <span
            style={{
              fontStyle: "italic",
              fontSize: 32,
              color: "var(--fg-mute)",
            }}
          >
            h
          </span>
          <span className="skel">
            <RollingNumber value={sleepM} digits={0} minIntDigits={2} />
          </span>
          <span
            style={{
              fontStyle: "italic",
              fontSize: 32,
              color: "var(--fg-mute)",
            }}
          >
            m
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
            __html: sleepCopyHtml ? sanitizeCopyHtml(sleepCopyHtml) : fallback,
          }}
        />
      </div>

      <div style={{ flex: 1, minHeight: 14 }} />

      <div
        className="hp-sleep-stats"
        style={{
          marginTop: 24,
          paddingTop: 30,
          borderTop: "1px solid var(--rule)",
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "18px 28px",
        }}
      >
        <Stat
          label="Performance"
          value={perf != null ? Math.round(perf) : null}
          digits={0}
          unit="%"
        />
        <Stat
          label="Efficiency"
          value={eff != null ? Math.round(eff) : null}
          digits={0}
          unit="%"
        />
        <Stat label="Respiratory" value={resp} digits={1} unit="rpm" />
        <Stat label="Disturbances" value={dist} digits={0} unit="" />
      </div>

      <div
        style={{
          marginTop: 42,
          paddingTop: 18,
          borderTop: "1px solid var(--rule)",
        }}
      >
        <div
          className="hp-sleep-bar"
          style={{
            display: "flex",
            width: "100%",
            height: 24,
            gap: 2,
          }}
        >
          {stages.map((s) => (
            <span
              key={s.key}
              title={`${s.label} · ${formatDuration(s.ms)} · ${labelPct(s.ms)}`}
              style={{
                width: `${widthPct(s.ms)}%`,
                height: "100%",
                background: s.color,
                display: "block",
              }}
            />
          ))}
        </div>

        <div
          className="hp-stage-totals"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 14,
            marginTop: 14,
          }}
        >
          {stages.map((s) => (
            <Total
              key={s.key}
              color={s.color}
              label={s.label}
              value={formatDuration(s.ms)}
              pct={labelPct(s.ms)}
            />
          ))}
        </div>
      </div>
    </article>
  );
}

function Stat({
  label,
  value,
  digits,
  unit,
}: {
  label: string;
  value: number | null;
  digits: number;
  unit: string;
}) {
  return (
    <div>
      <div
        style={{
          fontFamily: "var(--f-mono)",
          fontSize: 10,
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          color: "var(--fg-mute)",
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: "var(--f-serif)",
          fontSize: 32,
          lineHeight: 1.05,
          letterSpacing: "-0.01em",
          marginTop: 2,
        }}
      >
        <span className="skel">
          <RollingNumber value={value} digits={digits} />
        </span>
        {unit && (
          <span
            style={{
              fontStyle: "italic",
              fontSize: 14,
              color: "var(--fg-mute)",
              marginLeft: 3,
            }}
          >
            {unit}
          </span>
        )}
      </div>
    </div>
  );
}

function Total({
  color,
  label,
  value,
  pct,
}: {
  color: string;
  label: string;
  value: string;
  pct: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 6,
        minWidth: 0,
      }}
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
            display: "inline-block",
            width: 8,
            height: 8,
            background: color,
            flexShrink: 0,
          }}
        />
        <span
          style={{
            fontFamily: "var(--f-mono)",
            fontSize: 10,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            color: "var(--fg-mute)",
          }}
        >
          {label}
        </span>
      </div>
      <div
        style={{
          fontFamily: "var(--f-serif)",
          fontSize: 18,
          lineHeight: 1.1,
          display: "flex",
          alignItems: "baseline",
          gap: 6,
          flexWrap: "wrap",
        }}
      >
        <span>{value}</span>
        <span
          style={{
            fontSize: 12,
            fontStyle: "italic",
            color: "var(--fg-mute)",
          }}
        >
          {pct}
        </span>
      </div>
    </div>
  );
}
