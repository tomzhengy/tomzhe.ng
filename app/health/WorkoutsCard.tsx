"use client";

import type { Workout } from "./types";
import { CardHead } from "./StrainCard";

interface WorkoutsCardProps {
  workouts: Workout[];
}

export default function WorkoutsCard({ workouts }: WorkoutsCardProps) {
  return (
    <article
      className="health-card"
      style={{
        border: "1px solid var(--rule)",
        padding: "22px 24px 24px",
        gridColumn: "span 12",
        position: "relative",
      }}
    >
      <CardHead
        title="Workouts"
        subtitle="Heart-rate zones · z1→z5"
        subtitleAccent={`${workouts.length} session${workouts.length === 1 ? "" : "s"} this week.`}
      />

      {workouts.length === 0 && (
        <div
          style={{
            padding: "32px 0 8px",
            fontFamily: "var(--f-mono)",
            fontSize: 11,
            letterSpacing: "0.14em",
            color: "var(--fg-mute)",
          }}
        >
          No recent workouts logged.
        </div>
      )}

      {workouts.slice(0, 5).map((w, i) => (
        <Row key={String(w.id)} workout={w} first={i === 0} />
      ))}
    </article>
  );
}

function Row({ workout, first }: { workout: Workout; first: boolean }) {
  const start = new Date(workout.start);
  const end = new Date(workout.end);
  const durationMin = Math.round((end.getTime() - start.getTime()) / 60_000);
  const timeRange = `${start.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" })} · ${start.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", hour12: false })} – ${end.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", hour12: false })} · ${durationMin} min`;

  const score = workout.score;
  const zones = score?.zone_durations;
  const totalZone = zones
    ? Object.values(zones).reduce((s, v) => s + (v ?? 0), 0)
    : 0;
  const pct = (ms: number | undefined) =>
    totalZone > 0 ? ((ms ?? 0) / totalZone) * 100 : 0;

  const distanceKm = score?.distance_meter ? score.distance_meter / 1000 : null;
  const kcal = score ? Math.round(score.kilojoule * 0.239006) : null;

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr 1fr auto",
        gap: 24,
        padding: "18px 0",
        borderTop: first ? "none" : "1px solid var(--rule)",
        paddingTop: first ? 6 : 18,
        alignItems: "center",
      }}
    >
      <div
        style={{
          fontFamily: "var(--f-serif)",
          fontSize: 26,
          letterSpacing: "-0.01em",
        }}
      >
        <em style={{ fontStyle: "italic", color: "var(--accent)" }}>
          {workout.sport_name || "Activity"}
        </em>
        <span
          style={{
            display: "block",
            fontFamily: "var(--f-mono)",
            fontSize: 10.5,
            letterSpacing: "0.18em",
            color: "var(--fg-mute)",
            textTransform: "uppercase",
            marginTop: 3,
          }}
        >
          {timeRange}
        </span>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 14,
          fontFamily: "var(--f-mono)",
          fontSize: 11,
          color: "var(--fg-mute)",
          letterSpacing: "0.08em",
        }}
      >
        <WStat
          value={distanceKm != null ? distanceKm.toFixed(1) : "—"}
          label="km distance"
        />
        <WStat value={kcal != null ? String(kcal) : "—"} label="kcal burned" />
        <WStat
          value={
            score?.average_heart_rate
              ? String(Math.round(score.average_heart_rate))
              : "—"
          }
          label="bpm avg"
        />
      </div>
      <div>
        <div style={{ display: "flex", gap: 2, width: 220, height: 26 }}>
          <ZoneSeg
            pct={pct(zones?.zone_zero_milli)}
            bg="color-mix(in oklab, var(--fg) 12%, transparent)"
          />
          <ZoneSeg
            pct={pct(zones?.zone_one_milli)}
            bg="color-mix(in oklab, var(--select) 50%, transparent)"
          />
          <ZoneSeg
            pct={pct(zones?.zone_two_milli)}
            bg="color-mix(in oklab, var(--select) 80%, transparent)"
          />
          <ZoneSeg
            pct={pct(zones?.zone_three_milli)}
            bg="color-mix(in oklab, var(--warn) 85%, transparent)"
          />
          <ZoneSeg
            pct={pct(zones?.zone_four_milli)}
            bg="color-mix(in oklab, var(--accent) 85%, transparent)"
          />
          <ZoneSeg pct={pct(zones?.zone_five_milli)} bg="var(--danger)" />
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontFamily: "var(--f-mono)",
            fontSize: 9.5,
            color: "var(--fg-mute)",
            letterSpacing: "0.1em",
            marginTop: 5,
            width: 220,
          }}
        >
          <span>Z1</span>
          <span>Z2</span>
          <span>Z3</span>
          <span>Z4</span>
          <span>Z5</span>
        </div>
      </div>
      <div
        style={{
          fontFamily: "var(--f-serif)",
          fontSize: 40,
          letterSpacing: "-0.02em",
          textAlign: "right",
          minWidth: 60,
        }}
      >
        {score ? score.strain.toFixed(1) : "—"}
      </div>
    </div>
  );
}

function WStat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <b
        style={{
          display: "block",
          fontFamily: "var(--f-serif)",
          fontSize: 22,
          fontWeight: 400,
          color: "var(--fg)",
          letterSpacing: "-0.01em",
          marginBottom: 2,
        }}
      >
        {value}
      </b>
      {label}
    </div>
  );
}

function ZoneSeg({ pct, bg }: { pct: number; bg: string }) {
  return (
    <span
      style={{
        display: "block",
        height: "100%",
        width: `${pct}%`,
        background: bg,
      }}
    />
  );
}
