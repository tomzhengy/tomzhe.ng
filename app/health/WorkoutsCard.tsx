"use client";

import { useRef, useState } from "react";
import type { Workout } from "./types";
import { CardHead } from "./StrainCard";

const ZONES: Array<{
  key:
    | "zone_zero_milli"
    | "zone_one_milli"
    | "zone_two_milli"
    | "zone_three_milli"
    | "zone_four_milli"
    | "zone_five_milli";
  label: string;
  range: string;
  bg: string;
}> = [
  {
    key: "zone_zero_milli",
    label: "Zone 0",
    range: "0–50% max HR",
    bg: "color-mix(in oklab, var(--fg) 12%, transparent)",
  },
  {
    key: "zone_one_milli",
    label: "Zone 1",
    range: "50–60% max HR",
    bg: "color-mix(in oklab, var(--select) 50%, transparent)",
  },
  {
    key: "zone_two_milli",
    label: "Zone 2",
    range: "60–70% max HR",
    bg: "color-mix(in oklab, var(--select) 80%, transparent)",
  },
  {
    key: "zone_three_milli",
    label: "Zone 3",
    range: "70–80% max HR",
    bg: "color-mix(in oklab, var(--warn) 85%, transparent)",
  },
  {
    key: "zone_four_milli",
    label: "Zone 4",
    range: "80–90% max HR",
    bg: "color-mix(in oklab, var(--accent) 85%, transparent)",
  },
  {
    key: "zone_five_milli",
    label: "Zone 5",
    range: "90–100% max HR",
    bg: "var(--danger)",
  },
];

function formatZoneDuration(ms: number) {
  if (ms <= 0) return "0s";
  const totalSec = Math.round(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return s > 0 ? `${m}m ${s}s` : `${m}m`;
  return `${s}s`;
}

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
        subtitleAccent={`last ${Math.min(workouts.length, 5)} session${Math.min(workouts.length, 5) === 1 ? "" : "s"}.`}
        rightSlot={<ZoneLegend />}
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
      className="hp-workout-row"
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
      <ZoneBar zones={zones} pct={pct} />
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

function ZoneBar({
  zones,
  pct,
}: {
  zones: Workout["score"] extends infer S
    ? S extends { zone_durations: infer Z }
      ? Z
      : undefined
    : undefined;
  pct: (ms: number | undefined) => number;
}) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [hover, setHover] = useState<{
    idx: number;
    x: number;
    y: number;
  } | null>(null);

  const hoveredZone = hover != null ? ZONES[hover.idx] : null;
  const hoveredMs =
    hoveredZone && zones
      ? ((zones as unknown as Record<string, number>)[hoveredZone.key] ?? 0)
      : 0;

  return (
    <div style={{ position: "relative", justifySelf: "start" }} ref={wrapRef}>
      <div style={{ display: "flex", gap: 2, width: 220, height: 26 }}>
        {ZONES.map((z, i) => {
          const ms = zones
            ? ((zones as unknown as Record<string, number>)[z.key] ?? 0)
            : 0;
          return (
            <span
              key={z.key}
              style={{
                display: "block",
                height: "100%",
                width: `${pct(ms)}%`,
                background: z.bg,
                cursor: "crosshair",
              }}
              onMouseEnter={(e) => {
                const r = wrapRef.current?.getBoundingClientRect();
                if (!r) return;
                setHover({
                  idx: i,
                  x: e.clientX - r.left,
                  y: e.clientY - r.top,
                });
              }}
              onMouseMove={(e) => {
                const r = wrapRef.current?.getBoundingClientRect();
                if (!r) return;
                setHover({
                  idx: i,
                  x: e.clientX - r.left,
                  y: e.clientY - r.top,
                });
              }}
              onMouseLeave={() => setHover(null)}
            />
          );
        })}
      </div>
      {hover && hoveredZone && (
        <div
          style={{
            position: "absolute",
            left: hover.x,
            top: -8,
            transform: "translate(-50%, -100%)",
            background: "var(--card-elev)",
            border: "1px solid var(--rule-strong)",
            padding: "8px 10px",
            fontFamily: "var(--f-mono)",
            fontSize: 10.5,
            letterSpacing: "0.06em",
            color: "var(--fg)",
            pointerEvents: "none",
            whiteSpace: "nowrap",
            zIndex: 10,
            lineHeight: 1.5,
          }}
        >
          <div
            style={{
              fontFamily: "var(--f-serif)",
              fontStyle: "italic",
              fontSize: 13,
              letterSpacing: 0,
              marginBottom: 2,
            }}
          >
            {hoveredZone.label}
          </div>
          <div style={{ color: "var(--fg-mute)" }}>{hoveredZone.range}</div>
          <div>{formatZoneDuration(hoveredMs)}</div>
        </div>
      )}
    </div>
  );
}

function ZoneLegend() {
  const items = ZONES.filter((z) => z.key !== "zone_zero_milli");
  return (
    <div
      style={{
        display: "flex",
        gap: 12,
        fontFamily: "var(--f-mono)",
        fontSize: 10,
        letterSpacing: "0.14em",
        textTransform: "uppercase",
        color: "var(--fg-mute)",
      }}
    >
      {items.map((z, i) => (
        <span
          key={z.key}
          style={{ display: "inline-flex", alignItems: "center", gap: 5 }}
        >
          <span
            style={{
              display: "inline-block",
              width: 10,
              height: 10,
              background: z.bg,
            }}
          />
          Z{i + 1}
        </span>
      ))}
    </div>
  );
}
