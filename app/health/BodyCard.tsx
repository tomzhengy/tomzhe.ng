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
}: {
  label: string;
  value: number | null;
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
        <span className="skel">{value != null ? value.toFixed(1) : "—"}</span>
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
