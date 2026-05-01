"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { HealthPayload, TrendPoint } from "./types";
import Masthead from "./Masthead";
import Dateline from "./Dateline";
import RecoveryHero from "./RecoveryHero";
import StrainCard from "./StrainCard";
import SleepCard from "./SleepCard";
import WorkoutsCard from "./WorkoutsCard";
import BodyCard from "./BodyCard";
import JournalFooter from "./JournalFooter";
import DrillModal from "./DrillModal";
import TrendChart from "./TrendChart";
import { CardHead } from "./StrainCard";

type UiState = "loading" | "ok" | "empty" | "error";

export default function Dashboard() {
  const [payload, setPayload] = useState<HealthPayload | null>(null);
  const [uiState, setUiState] = useState<UiState>("loading");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [drillIdx, setDrillIdx] = useState<number | null>(null);
  const [syncing, setSyncing] = useState(false);

  const loadHealth = useCallback(async (opts: { manual: boolean }) => {
    if (opts.manual) setSyncing(true);
    try {
      const r = await fetch("/api/health", { cache: "no-store" });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const json = (await r.json()) as HealthPayload;
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
      setUiState("error");
      setErrorMsg(err instanceof Error ? err.message : String(err));
    } finally {
      if (opts.manual) setSyncing(false);
    }
  }, []);

  useEffect(() => {
    void loadHealth({ manual: false });
  }, [loadHealth]);

  const nowIso = new Date().toISOString();
  const trend = useMemo<TrendPoint[]>(
    () =>
      [...(payload?.trend ?? [])].sort((a, b) => a.date.localeCompare(b.date)),
    [payload],
  );

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
      <Masthead
        syncedAt={payload?.syncedAt ?? null}
        syncing={syncing}
        onSync={() => loadHealth({ manual: true })}
      />

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

      <section
        className="hp-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(12, 1fr)",
          gap: 20,
          marginTop: 28,
        }}
      >
        <RecoveryHero
          recovery={payload?.recovery ?? null}
          trend={trend}
          subHtml={payload?.copy?.sub ?? null}
        />
        <StrainCard
          cycle={payload?.cycle ?? null}
          strainCopyHtml={payload?.copy?.strainCopy ?? null}
        />
        <SleepCard
          sleep={payload?.sleep ?? null}
          sleepCopyHtml={payload?.copy?.sleepCopy ?? null}
        />

        <BodyCard body={payload?.body ?? null} />

        <WorkoutsCard workouts={payload?.workouts ?? []} />

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
          <CardHead title="Trends" subtitleAccent="every signal over time." />
          <TrendChart data={trend} onPointClick={setDrillIdx} />
        </article>
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
