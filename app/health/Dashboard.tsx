"use client";

import { useCallback, useEffect, useMemo, useReducer, useState } from "react";
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

interface DataState {
	payload: HealthPayload | null;
	ui: UiState;
	errorMsg: string | null;
}

type DataAction =
	| { type: "loaded"; payload: HealthPayload; ui: UiState }
	| { type: "error-loaded"; payload: HealthPayload; message: string }
	| { type: "error"; message: string };

function dataReducer(state: DataState, action: DataAction): DataState {
	switch (action.type) {
		case "loaded":
			return { payload: action.payload, ui: action.ui, errorMsg: null };
		case "error-loaded":
			return { payload: action.payload, ui: "error", errorMsg: action.message };
		case "error":
			return { ...state, ui: "error", errorMsg: action.message };
	}
}

export default function Dashboard() {
	const [data, dispatch] = useReducer(dataReducer, {
		payload: null,
		ui: "loading",
		errorMsg: null,
	});
	const [drillIdx, setDrillIdx] = useState<number | null>(null);
	const [syncing, setSyncing] = useState(false);

	const loadHealth = useCallback(async (opts: { manual: boolean }) => {
		if (opts.manual) setSyncing(true);
		try {
			// page load reads the cached payload from supabase (fast, populated
			// by the cron). manual sync POSTs to /sync which does the live
			// whoop/withings fetch + writes the cache + returns fresh data.
			const r = opts.manual
				? await fetch("/api/health/sync", {
						method: "POST",
						cache: "no-store",
					})
				: await fetch("/api/health", { cache: "no-store" });
			if (!r.ok) throw new Error(`HTTP ${r.status}`);
			const json = (await r.json()) as HealthPayload;
			if (json.state === "error") {
				dispatch({
					type: "error-loaded",
					payload: json,
					message: json.message ?? "Unknown error",
				});
			} else if (!json.cycle && !json.recovery && !json.sleep) {
				dispatch({ type: "loaded", payload: json, ui: "empty" });
			} else {
				dispatch({ type: "loaded", payload: json, ui: "ok" });
			}
		} catch (err) {
			dispatch({
				type: "error",
				message: err instanceof Error ? err.message : String(err),
			});
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
			[...(data.payload?.trend ?? [])].sort((a, b) =>
				a.date.localeCompare(b.date),
			),
		[data.payload],
	);

	return (
		<div
			className="health-page"
			data-state={data.ui}
			style={{
				fontFamily: "var(--f-sans)",
				fontSize: 14,
				lineHeight: 1.5,
			}}
		>
			<Masthead
				syncedAt={data.payload?.syncedAt ?? null}
				syncing={syncing}
				onSync={() => loadHealth({ manual: true })}
			/>

			<Dateline
				cycleStartIso={data.payload?.cycle?.start ?? null}
				nowIso={nowIso}
			/>

			{data.ui === "loading" && (
				<Banner text="Loading your cycle · waiting on WHOOP · please hold" />
			)}
			{data.ui === "empty" && (
				<Banner text="No cycles recorded for this range. Wear your strap and check back in the morning." />
			)}
			{data.ui === "error" && (
				<Banner text={`Couldn't reach WHOOP. ${data.errorMsg ?? ""}`} />
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
					recovery={data.payload?.recovery ?? null}
					trend={trend}
					subHtml={data.payload?.copy?.sub ?? null}
				/>
				<StrainCard
					cycle={data.payload?.cycle ?? null}
					strainCopyHtml={data.payload?.copy?.strainCopy ?? null}
				/>
				<SleepCard
					sleep={data.payload?.sleep ?? null}
					sleepCopyHtml={data.payload?.copy?.sleepCopy ?? null}
				/>

				<BodyCard body={data.payload?.body ?? null} />

				<WorkoutsCard workouts={data.payload?.workouts ?? []} />

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
				weekly={data.payload?.copy?.journal.weekly ?? null}
				watch={data.payload?.copy?.journal.watch ?? null}
				checkIn={data.payload?.copy?.journal.checkIn ?? null}
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
