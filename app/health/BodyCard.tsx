"use client";

import type { BodyData, BodyMeasurement } from "./types";
import { CardHead } from "./StrainCard";
import Sparkline from "./Sparkline";
import { formatClockTime, formatDateShort } from "./format";

interface BodyCardProps {
  body: BodyData | null;
}

export default function BodyCard({ body }: BodyCardProps) {
  const latest = body?.latest ?? null;
  const trend = body?.trend ?? [];
  const weightSeries = trend
    .map((p) => p.weightKg)
    .filter((v): v is number => v != null);

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
              gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
              gap: 32,
              marginTop: 14,
              alignItems: "center",
            }}
          >
            <BodyHero latest={latest} />
            <SubMetrics latest={latest} />
          </div>

          <CardioMetrics latest={latest} />

          {weightSeries.length > 1 && (
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
                  alignItems: "baseline",
                  marginBottom: 4,
                }}
              >
                <span
                  style={{
                    fontFamily: "var(--f-mono)",
                    fontSize: 10.5,
                    letterSpacing: "0.22em",
                    textTransform: "uppercase",
                    color: "var(--fg-mute)",
                  }}
                >
                  Weight trend
                </span>
                <span
                  style={{
                    fontFamily: "var(--f-mono)",
                    fontSize: 10.5,
                    letterSpacing: "0.18em",
                    textTransform: "uppercase",
                    color: "var(--fg-mute)",
                  }}
                >
                  {weightSeries[0].toFixed(1)} →{" "}
                  {weightSeries[weightSeries.length - 1].toFixed(1)} kg
                </span>
              </div>
              <Sparkline
                values={weightSeries}
                unit="kg"
                digits={1}
                height={64}
              />
            </div>
          )}
        </>
      )}
    </article>
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

function BodyHero({ latest }: { latest: BodyMeasurement }) {
  return (
    <div>
      <div
        className="hp-body-weight"
        style={{
          fontFamily: "var(--f-serif)",
          fontSize: 110,
          lineHeight: 0.9,
          letterSpacing: "-0.03em",
          margin: "0 0 12px",
          display: "flex",
          alignItems: "baseline",
          gap: 6,
        }}
      >
        <span className="skel">
          {latest.weightKg != null ? latest.weightKg.toFixed(1) : "—"}
        </span>
        <span
          style={{
            fontFamily: "var(--f-serif)",
            fontStyle: "italic",
            fontSize: 22,
            color: "var(--fg-mute)",
          }}
        >
          kg
        </span>
      </div>
      {latest.bodyFatPct != null && (
        <div
          style={{
            fontFamily: "var(--f-serif)",
            fontSize: 32,
            lineHeight: 1.05,
            letterSpacing: "-0.01em",
            color: "var(--fg-soft)",
          }}
        >
          {latest.bodyFatPct.toFixed(1)}
          <span
            style={{
              fontFamily: "var(--f-serif)",
              fontStyle: "italic",
              fontSize: 14,
              color: "var(--fg-mute)",
              marginLeft: 4,
            }}
          >
            % body fat
          </span>
        </div>
      )}
    </div>
  );
}

function SubMetrics({ latest }: { latest: BodyMeasurement }) {
  return (
    <div
      className="hp-body-metrics"
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 28,
      }}
    >
      <Stat label="Fat Mass" value={latest.fatMassKg} unit="kg" />
      <Stat label="Muscle Mass" value={latest.muscleMassKg} unit="kg" />
      <Stat label="Hydration" value={latest.hydrationKg} unit="kg" />
      <Stat label="Bone Mass" value={latest.boneMassKg} unit="kg" />
    </div>
  );
}

function Stat({
  label,
  value,
  unit,
  digits = 1,
}: {
  label: string;
  value: number | null;
  unit: string;
  digits?: number;
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
          {value != null ? value.toFixed(digits) : "—"}
        </span>
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
      </div>
    </div>
  );
}

function CardioMetrics({ latest }: { latest: BodyMeasurement }) {
  const hasMain =
    latest.heartRateBpm != null ||
    latest.basalMetabolicRateKcal != null ||
    latest.visceralFat != null ||
    latest.vascularAgeYears != null;
  const tertiary: Array<[string, string]> = [];
  if (latest.pulseWaveVelocityMs != null) {
    tertiary.push(["PWV", `${latest.pulseWaveVelocityMs.toFixed(1)} m/s`]);
  }
  if (latest.intracellularWaterKg != null) {
    tertiary.push(["ICW", `${latest.intracellularWaterKg.toFixed(1)} kg`]);
  }
  if (latest.extracellularWaterKg != null) {
    tertiary.push(["ECW", `${latest.extracellularWaterKg.toFixed(1)} kg`]);
  }
  if (latest.heightM != null) {
    tertiary.push(["Height", `${latest.heightM.toFixed(2)} m`]);
  }

  if (!hasMain && tertiary.length === 0) return null;

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
          marginBottom: 14,
        }}
      >
        Cardio &amp; metabolic
      </div>
      {hasMain && (
        <div
          className="hp-body-cardio"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
            gap: 28,
          }}
        >
          <Stat
            label="Heart Rate"
            value={latest.heartRateBpm}
            unit="bpm"
            digits={0}
          />
          <Stat
            label="BMR"
            value={latest.basalMetabolicRateKcal}
            unit="kcal"
            digits={0}
          />
          <Stat
            label="Visceral Fat"
            value={latest.visceralFat}
            unit=""
            digits={1}
          />
          <Stat
            label="Vascular Age"
            value={latest.vascularAgeYears}
            unit="yrs"
            digits={0}
          />
        </div>
      )}
      {tertiary.length > 0 && (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "0 22px",
            rowGap: 6,
            marginTop: hasMain ? 16 : 0,
            fontFamily: "var(--f-mono)",
            fontSize: 10.5,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "var(--fg-mute)",
          }}
        >
          {tertiary.map(([label, value]) => (
            <span key={label}>
              {label}: <span style={{ color: "var(--fg-soft)" }}>{value}</span>
            </span>
          ))}
        </div>
      )}
    </div>
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
