"use client";

import type { Sleep } from "./types";
import { formatDuration, sanitizeCopyHtml, splitHoursMinutes } from "./format";
import Hypnogram, { HypnoSegment } from "./Hypnogram";
import { CardHead } from "./StrainCard";

interface SleepCardProps {
  sleep: Sleep | null;
  segments: HypnoSegment[];
  sleepCopyHtml: string | null;
}

export default function SleepCard({
  sleep,
  segments,
  sleepCopyHtml,
}: SleepCardProps) {
  const stage = sleep?.score?.stage_summary ?? null;
  const inBedMs = stage?.total_in_bed_time_milli ?? 0;
  const awakeMs = stage?.total_awake_time_milli ?? 0;
  const asleepMs = Math.max(0, inBedMs - awakeMs);
  const lightMs = stage?.total_light_sleep_time_milli ?? 0;
  const remMs = stage?.total_rem_sleep_time_milli ?? 0;
  const deepMs = stage?.total_slow_wave_sleep_time_milli ?? 0;
  const pct = (ms: number) =>
    inBedMs > 0 ? `${Math.round((ms / inBedMs) * 100)}%` : "—";
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

  return (
    <article
      className="health-card"
      style={{
        border: "1px solid var(--rule)",
        padding: "22px 24px 24px",
        gridColumn: "span 7",
        position: "relative",
      }}
    >
      <CardHead
        title="Sleep"
        subtitle={
          perf != null ? `Performance ${Math.round(perf)}%` : "Performance —"
        }
      />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.3fr 1fr",
          gap: 32,
          marginTop: 14,
        }}
      >
        <div>
          <div
            style={{
              fontFamily: "var(--f-serif)",
              fontSize: 96,
              lineHeight: 0.95,
              letterSpacing: "-0.03em",
              display: "flex",
              alignItems: "baseline",
              gap: 6,
              margin: "0 0 4px",
            }}
          >
            <span className="skel">{sleepH}</span>
            <span
              style={{
                fontStyle: "italic",
                fontSize: 26,
                color: "var(--fg-mute)",
              }}
            >
              h
            </span>
            <span className="skel">{String(sleepM).padStart(2, "0")}</span>
            <span
              style={{
                fontStyle: "italic",
                fontSize: 26,
                color: "var(--fg-mute)",
              }}
            >
              m
            </span>
          </div>
          <p
            style={{
              fontFamily: "var(--f-serif)",
              fontSize: 22,
              lineHeight: 1.3,
              color: "var(--fg-soft)",
              maxWidth: "28ch",
            }}
            dangerouslySetInnerHTML={{
              __html: sleepCopyHtml
                ? sanitizeCopyHtml(sleepCopyHtml)
                : fallback,
            }}
          />
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "14px 28px",
            alignContent: "center",
          }}
        >
          <Stat
            label="Performance"
            value={perf != null ? Math.round(perf) : "—"}
            unit="%"
          />
          <Stat
            label="Efficiency"
            value={eff != null ? Math.round(eff) : "—"}
            unit="%"
          />
          <Stat
            label="Respiratory"
            value={resp != null ? resp.toFixed(1) : "—"}
            unit="rpm"
          />
          <Stat label="Disturbances" value={dist ?? "—"} unit="" />
        </div>
      </div>

      <div
        style={{
          marginTop: 24,
          borderTop: "1px solid var(--rule)",
          paddingTop: 22,
        }}
      >
        <Hypnogram
          segments={segments}
          startIso={sleep?.start ?? ""}
          endIso={sleep?.end ?? ""}
        />

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 0,
            marginTop: 18,
            borderTop: "1px solid var(--rule)",
            paddingTop: 14,
          }}
        >
          <Total
            color="color-mix(in oklab, var(--foreground) 22%, var(--background))"
            label="Awake"
            value={formatDuration(awakeMs)}
            pct={pct(awakeMs)}
          />
          <Total
            color="color-mix(in oklab, var(--foreground) 45%, var(--background))"
            label="Light"
            value={formatDuration(lightMs)}
            pct={pct(lightMs)}
          />
          <Total
            color="color-mix(in oklab, var(--foreground) 68%, var(--background))"
            label="REM"
            value={formatDuration(remMs)}
            pct={pct(remMs)}
          />
          <Total
            color="var(--foreground)"
            label="Deep"
            value={formatDuration(deepMs)}
            pct={pct(deepMs)}
            last
          />
        </div>
      </div>
    </article>
  );
}

function Stat({
  label,
  value,
  unit,
}: {
  label: string;
  value: string | number;
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
        <span className="skel">{value}</span>
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
  last,
}: {
  color: string;
  label: string;
  value: string;
  pct: string;
  last?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 6,
        paddingRight: 14,
        borderRight: last ? "none" : "1px solid var(--rule)",
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
          fontSize: 22,
          lineHeight: 1.1,
          display: "flex",
          alignItems: "baseline",
          gap: 8,
        }}
      >
        <span>{value}</span>
        <span
          style={{
            fontSize: 14,
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
