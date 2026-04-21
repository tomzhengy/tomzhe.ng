"use client";

import { useEffect, useMemo, useState } from "react";
import type { HealthPayload, TrendPoint } from "./types";
import Masthead from "./Masthead";
import Dateline from "./Dateline";
import RecoveryHero from "./RecoveryHero";
import StrainCard from "./StrainCard";
import SleepCard from "./SleepCard";
import WorkoutsCard from "./WorkoutsCard";
import JournalFooter from "./JournalFooter";
import DrillModal from "./DrillModal";
import TrendChart from "./TrendChart";
import { CardHead } from "./StrainCard";
import type { HypnoSegment, Stage } from "./Hypnogram";

type UiState = "loading" | "ok" | "empty" | "error";

export default function Dashboard() {
  const [payload, setPayload] = useState<HealthPayload | null>(null);
  const [uiState, setUiState] = useState<UiState>("loading");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [drillIdx, setDrillIdx] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch("/api/health", { cache: "no-store" });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const json = (await r.json()) as HealthPayload;
        if (cancelled) return;
        setPayload(json);
        if (json.state === "error") {
          setUiState("error");
          setErrorMsg(json.message ?? "Unknown error");
        } else if (!json.cycle && !json.recovery && !json.sleep) {
          setUiState("empty");
        } else {
          setUiState("ok");
        }
      } catch (err) {
        if (cancelled) return;
        setUiState("error");
        setErrorMsg(err instanceof Error ? err.message : String(err));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const hypnoSegments = useMemo<HypnoSegment[]>(() => {
    const sleep = payload?.sleep;
    if (!sleep?.score) return [];
    return approximateHypnogram(
      new Date(sleep.start).getTime(),
      new Date(sleep.end).getTime(),
      sleep.score.stage_summary,
    );
  }, [payload]);

  const nowIso = new Date().toISOString();
  const trend: TrendPoint[] = payload?.trend ?? [];

  return (
    <div
      className="health-page"
      data-state={uiState}
      style={{
        fontFamily: "var(--f-sans)",
        fontSize: 14,
        lineHeight: 1.5,
      }}
    >
      <Masthead syncedAt={payload?.syncedAt ?? null} />

      <Dateline cycleStartIso={payload?.cycle?.start ?? null} nowIso={nowIso} />

      {uiState === "loading" && (
        <Banner text="Loading your cycle · waiting on WHOOP · please hold" />
      )}
      {uiState === "empty" && (
        <Banner text="No cycles recorded for this range. Wear your strap and check back in the morning." />
      )}
      {uiState === "error" && (
        <Banner text={`Couldn't reach WHOOP. ${errorMsg ?? ""}`} />
      )}

      <RecoveryHero
        recovery={payload?.recovery ?? null}
        nowIso={nowIso}
        trend={trend}
        headlineHtml={payload?.copy?.headline ?? null}
        subHtml={payload?.copy?.sub ?? null}
      />

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(12, 1fr)",
          gap: 20,
          marginTop: 28,
        }}
      >
        <StrainCard
          cycle={payload?.cycle ?? null}
          strainCopyHtml={payload?.copy?.strainCopy ?? null}
        />
        <SleepCard
          sleep={payload?.sleep ?? null}
          segments={hypnoSegments}
          sleepCopyHtml={payload?.copy?.sleepCopy ?? null}
        />

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
            title="Trends"
            subtitle="Click any day for details · hover for values"
            subtitleAccent="recovery, strain & sleep over time."
          />
          <TrendChart data={trend} onPointClick={setDrillIdx} />
        </article>

        <WorkoutsCard workouts={payload?.workouts ?? []} />
      </section>

      <JournalFooter
        weekly={payload?.copy?.journal.weekly ?? null}
        watch={payload?.copy?.journal.watch ?? null}
        checkIn={payload?.copy?.journal.checkIn ?? null}
      />

      <DrillModal
        point={drillIdx != null ? (trend[drillIdx] ?? null) : null}
        onClose={() => setDrillIdx(null)}
      />
    </div>
  );
}

function Banner({ text }: { text: string }) {
  return (
    <div
      style={{
        margin: "20px 0 0",
        padding: "12px 16px",
        border: "1px dashed var(--rule-strong)",
        fontFamily: "var(--f-mono)",
        fontSize: 11,
        color: "var(--fg-mute)",
        letterSpacing: "0.1em",
      }}
    >
      {text}
    </div>
  );
}

/**
 * WHOOP v2's sleep summary gives us stage totals but not a minute-by-minute
 * segment list. We approximate a hypnogram by distributing the totals into
 * cyclical segments across the sleep window. Not ideal, but matches the
 * visual rhythm of the design until we wire into a higher-detail source.
 */
function approximateHypnogram(
  startMs: number,
  endMs: number,
  stages: {
    total_awake_time_milli: number;
    total_light_sleep_time_milli: number;
    total_slow_wave_sleep_time_milli: number;
    total_rem_sleep_time_milli: number;
  },
): HypnoSegment[] {
  const total =
    stages.total_awake_time_milli +
    stages.total_light_sleep_time_milli +
    stages.total_slow_wave_sleep_time_milli +
    stages.total_rem_sleep_time_milli;
  if (total <= 0 || endMs <= startMs) return [];
  const windowMs = endMs - startMs;
  // break into 4 cycles; each cycle cycles through awake-light-deep-light-rem-light
  const cycles = 4;
  const cycleMs = windowMs / cycles;
  const shares = {
    awake: stages.total_awake_time_milli / total,
    light: stages.total_light_sleep_time_milli / total,
    deep: stages.total_slow_wave_sleep_time_milli / total,
    rem: stages.total_rem_sleep_time_milli / total,
  };
  const patternPerCycle: Array<{ stage: Stage; weight: number }> = [
    { stage: "awake", weight: shares.awake / cycles },
    { stage: "light", weight: (shares.light * 0.35) / 1 },
    { stage: "deep", weight: shares.deep / cycles },
    { stage: "light", weight: (shares.light * 0.35) / 1 },
    { stage: "rem", weight: shares.rem / cycles },
    { stage: "light", weight: (shares.light * 0.3) / 1 },
  ];
  const segs: HypnoSegment[] = [];
  let t = startMs;
  for (let c = 0; c < cycles; c++) {
    const base = startMs + c * cycleMs;
    const weightSum = patternPerCycle.reduce((s, p) => s + p.weight, 0) || 1;
    for (const step of patternPerCycle) {
      const dur = (step.weight / weightSum) * cycleMs;
      if (dur <= 0) continue;
      const s0 = Math.max(t, base);
      const s1 = Math.min(endMs, s0 + dur);
      if (s1 > s0) segs.push({ stage: step.stage, startMs: s0, endMs: s1 });
      t = s1;
    }
  }
  return segs;
}
