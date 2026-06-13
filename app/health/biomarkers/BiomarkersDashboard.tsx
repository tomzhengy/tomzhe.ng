"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import LoginForm from "./LoginForm";
import BiomarkerList from "./BiomarkerList";
import BiomarkerChart from "./BiomarkerChart";
import BiomarkerDetail from "./BiomarkerDetail";
import UploadPanel from "./UploadPanel";
import type { BiomarkerListResponse, BiomarkerSeriesResponse } from "./types";

type AuthState = "checking" | "needed" | "authed";

export default function BiomarkersDashboard() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const [auth, setAuth] = useState<AuthState>("checking");
	const [list, setList] = useState<BiomarkerListResponse | null>(null);
	const [series, setSeries] = useState<BiomarkerSeriesResponse | null>(null);
	const [uploadOpen, setUploadOpen] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const selected = useMemo(() => {
		const raw = searchParams.get("b") ?? "";
		const arr = raw
			.split(",")
			.map((s) => s.trim())
			.filter(Boolean);
		return new Set(arr);
	}, [searchParams]);

	useEffect(() => {
		let cancelled = false;
		(async () => {
			try {
				const r = await fetch("/api/auth/check", { cache: "no-store" });
				if (cancelled) return;
				const json = (await r.json()) as { authed: boolean };
				setAuth(json.authed ? "authed" : "needed");
			} catch {
				if (!cancelled) setAuth("needed");
			}
		})();
		return () => {
			cancelled = true;
		};
	}, []);

	const loadList = useCallback(async () => {
		try {
			const r = await fetch("/api/biomarkers/list", { cache: "no-store" });
			if (r.status === 401) {
				setAuth("needed");
				return;
			}
			if (!r.ok) throw new Error(`http ${r.status}`);
			const json = (await r.json()) as BiomarkerListResponse;
			setList(json);
			setError(null);
		} catch (err) {
			setError(err instanceof Error ? err.message : "load failed");
		}
	}, []);

	useEffect(() => {
		if (auth === "authed") void loadList();
	}, [auth, loadList]);

	useEffect(() => {
		if (auth !== "authed") return;
		if (selected.size === 0) {
			setSeries(null);
			return;
		}
		const names = Array.from(selected).join(",");
		let cancelled = false;
		(async () => {
			try {
				const r = await fetch(
					`/api/biomarkers/series?names=${encodeURIComponent(names)}`,
					{ cache: "no-store" },
				);
				if (cancelled) return;
				if (r.status === 401) {
					setAuth("needed");
					return;
				}
				if (!r.ok) throw new Error(`http ${r.status}`);
				const json = (await r.json()) as BiomarkerSeriesResponse;
				setSeries(json);
			} catch (err) {
				if (!cancelled)
					setError(err instanceof Error ? err.message : "series load failed");
			}
		})();
		return () => {
			cancelled = true;
		};
	}, [auth, selected]);

	function setSelected(next: Set<string>) {
		const params = new URLSearchParams(searchParams.toString());
		if (next.size === 0) params.delete("b");
		else params.set("b", Array.from(next).join(","));
		const qs = params.toString();
		router.replace(qs ? `?${qs}` : "?", { scroll: false });
	}

	function toggle(canonical: string) {
		const next = new Set(selected);
		if (next.has(canonical)) next.delete(canonical);
		else next.add(canonical);
		setSelected(next);
	}

	async function logout() {
		try {
			await fetch("/api/auth/logout", { method: "POST" });
		} catch {}
		setAuth("needed");
		setList(null);
		setSeries(null);
	}

	if (auth === "checking") {
		return (
			<div
				style={{
					padding: "10vh 0",
					textAlign: "center",
					color: "var(--fg-mute)",
					fontFamily: "var(--f-mono)",
					fontSize: 11,
					letterSpacing: "0.1em",
				}}
			>
				checking session…
			</div>
		);
	}

	if (auth === "needed") {
		return <LoginForm onSuccess={() => setAuth("authed")} />;
	}

	const visibleSeries = series?.series ?? [];
	// only keep series that are still selected — the series fetch lags the
	// selection, so visibleSeries can briefly hold a just-deselected biomarker.
	const selectedSeries = visibleSeries.filter((s) => selected.has(s.canonical));
	const selectedCount = selected.size;
	const detailSeries = selectedSeries[0] ?? null;
	const lastUpload = list?.uploads.find((u) => u.status === "parsed");

	return (
		<div style={{ fontFamily: "var(--f-sans)", fontSize: 14, lineHeight: 1.5 }}>
			<header
				style={{
					display: "grid",
					gridTemplateColumns: "1fr auto",
					gap: 24,
					alignItems: "center",
					paddingBottom: 22,
					borderBottom: "1px solid var(--rule-strong)",
				}}
			>
				<div style={{ display: "flex", alignItems: "baseline", gap: 14 }}>
					<h1
						style={{
							fontFamily: "var(--f-serif)",
							fontWeight: 400,
							fontSize: 40,
							margin: 0,
						}}
					>
						Biomarkers
					</h1>
					{lastUpload && (
						<span
							style={{
								fontFamily: "var(--f-mono)",
								fontSize: 11,
								color: "var(--fg-mute)",
								letterSpacing: "0.08em",
							}}
						>
							last draw ·{" "}
							{new Date(lastUpload.uploadedAt).toLocaleDateString("en-US", {
								day: "numeric",
								month: "short",
								year: "numeric",
							})}
						</span>
					)}
				</div>

				<div style={{ display: "flex", gap: 8 }}>
					<button
						type="button"
						onClick={() => setUploadOpen((v) => !v)}
						style={chipBtn(uploadOpen)}
					>
						{uploadOpen ? "close upload" : "upload report"}
					</button>
					<button type="button" onClick={logout} style={chipBtn(false)}>
						sign out
					</button>
				</div>
			</header>

			{uploadOpen && (
				<UploadPanel
					onUploaded={async () => {
						await loadList();
					}}
				/>
			)}

			{error && (
				<div
					style={{
						margin: "20px 0",
						padding: "10px 14px",
						border: "1px dashed var(--danger)",
						color: "var(--danger)",
						fontFamily: "var(--f-mono)",
						fontSize: 11,
					}}
				>
					{error}
				</div>
			)}

			<section
				style={{
					display: "grid",
					gridTemplateColumns: "repeat(12, 1fr)",
					gap: 20,
					marginTop: 24,
				}}
			>
				<BiomarkerList
					items={list?.biomarkers ?? []}
					categories={list?.categories ?? []}
					selected={selected}
					onToggle={toggle}
				/>

				<div
					style={{
						gridColumn: "span 9",
						border: "1px solid var(--rule)",
						background: "var(--card)",
						padding: 24,
						minHeight: 420,
					}}
				>
					{selectedCount === 0 && (
						<EmptyState
							biomarkerCount={list?.biomarkers.length ?? 0}
							uploads={list?.uploads ?? []}
						/>
					)}
					{selectedCount === 1 && detailSeries && (
						<BiomarkerDetail series={detailSeries} />
					)}
					{selectedCount >= 2 && selectedSeries.length > 0 && (
						<BiomarkerChart series={selectedSeries} />
					)}
				</div>
			</section>
		</div>
	);
}

function chipBtn(active: boolean): React.CSSProperties {
	return {
		padding: "8px 12px",
		border: `1px solid ${active ? "var(--fg-mute)" : "var(--rule-strong)"}`,
		background: active ? "var(--card-elev)" : "transparent",
		color: "var(--fg-soft)",
		fontFamily: "var(--f-mono)",
		fontSize: 11,
		letterSpacing: "0.08em",
		cursor: "pointer",
		font: "inherit",
	};
}

function EmptyState({
	biomarkerCount,
	uploads,
}: {
	biomarkerCount: number;
	uploads: {
		id: string;
		filename: string;
		uploadedAt: string;
		status: string;
		parsedCount: number;
		source: string;
	}[];
}) {
	return (
		<div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
			<div
				style={{
					textAlign: "center",
					padding: "60px 20px",
					color: "var(--fg-mute)",
					fontFamily: "var(--f-mono)",
					fontSize: 11,
					letterSpacing: "0.1em",
					border: "1px dashed var(--rule)",
				}}
			>
				{biomarkerCount === 0
					? "no biomarkers yet — upload a report to begin."
					: "pick a biomarker from the left rail."}
			</div>

			{uploads.length > 0 && (
				<div>
					<h3
						style={{
							fontFamily: "var(--f-mono)",
							fontSize: 11,
							letterSpacing: "0.12em",
							textTransform: "uppercase",
							color: "var(--fg-soft)",
							margin: "0 0 10px",
						}}
					>
						Recent uploads
					</h3>
					<ul
						style={{
							listStyle: "none",
							padding: 0,
							margin: 0,
							display: "flex",
							flexDirection: "column",
							gap: 6,
						}}
					>
						{uploads.slice(0, 8).map((u) => (
							<li
								key={u.id}
								style={{
									display: "flex",
									justifyContent: "space-between",
									gap: 14,
									fontFamily: "var(--f-mono)",
									fontSize: 11,
									padding: "6px 8px",
									borderBottom: "1px solid var(--rule)",
								}}
							>
								<span style={{ color: "var(--fg)" }}>{u.filename}</span>
								<span style={{ color: "var(--fg-mute)" }}>
									{u.source} · {u.status} · {u.parsedCount} results
								</span>
							</li>
						))}
					</ul>
				</div>
			)}
		</div>
	);
}
