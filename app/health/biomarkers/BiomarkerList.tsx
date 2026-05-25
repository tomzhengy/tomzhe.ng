"use client";

import { useMemo, useState } from "react";
import type {
	BiomarkerCategoryEntry,
	BiomarkerSummary,
} from "./types";

interface BiomarkerListProps {
	items: BiomarkerSummary[];
	categories: BiomarkerCategoryEntry[];
	selected: Set<string>;
	onToggle: (canonical: string) => void;
}

export default function BiomarkerList({
	items,
	categories,
	selected,
	onToggle,
}: BiomarkerListProps) {
	const [search, setSearch] = useState("");
	const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

	const filtered = useMemo(() => {
		const q = search.trim().toLowerCase();
		if (!q) return items;
		return items.filter(
			(b) =>
				b.display.toLowerCase().includes(q) ||
				b.canonical.toLowerCase().includes(q),
		);
	}, [items, search]);

	const grouped = useMemo(() => {
		const m = new Map<string, BiomarkerSummary[]>();
		for (const b of filtered) {
			const k = b.category;
			const list = m.get(k);
			if (list) list.push(b);
			else m.set(k, [b]);
		}
		return m;
	}, [filtered]);

	function toggleCat(id: string) {
		setCollapsed((cur) => {
			const next = new Set(cur);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});
	}

	return (
		<aside
			style={{
				gridColumn: "span 3",
				border: "1px solid var(--rule)",
				background: "var(--card)",
				padding: 16,
				display: "flex",
				flexDirection: "column",
				gap: 12,
				maxHeight: "78vh",
				overflowY: "auto",
			}}
		>
			<input
				type="search"
				placeholder="search biomarkers…"
				value={search}
				onChange={(e) => setSearch(e.target.value)}
				style={{
					padding: "8px 10px",
					border: "1px solid var(--rule-strong)",
					background: "var(--background)",
					color: "var(--fg)",
					fontFamily: "var(--f-mono)",
					fontSize: 12,
				}}
			/>

			{categories.length === 0 && (
				<div
					style={{
						color: "var(--fg-mute)",
						fontFamily: "var(--f-mono)",
						fontSize: 11,
						letterSpacing: "0.08em",
						padding: "12px 4px",
					}}
				>
					no biomarkers yet — upload a report to begin.
				</div>
			)}

			{categories.map((cat) => {
				const rows = grouped.get(cat.id) ?? [];
				if (rows.length === 0) return null;
				const isCollapsed = collapsed.has(cat.id);
				return (
					<section
						key={cat.id}
						style={{ display: "flex", flexDirection: "column", gap: 4 }}
					>
						<button
							type="button"
							onClick={() => toggleCat(cat.id)}
							style={{
								display: "flex",
								justifyContent: "space-between",
								alignItems: "center",
								padding: "6px 4px",
								border: "none",
								borderBottom: "1px solid var(--rule)",
								background: "transparent",
								color: "var(--fg-soft)",
								fontFamily: "var(--f-mono)",
								fontSize: 10.5,
								letterSpacing: "0.12em",
								textTransform: "uppercase",
								cursor: "pointer",
							}}
							aria-expanded={!isCollapsed}
						>
							<span>{cat.label}</span>
							<span style={{ color: "var(--fg-mute)" }}>
								{isCollapsed ? "+" : "−"} {rows.length}
							</span>
						</button>

						{!isCollapsed &&
							rows.map((b) => {
								const isSel = selected.has(b.canonical);
								return (
									<label
										key={b.canonical}
										style={{
											display: "flex",
											alignItems: "center",
											gap: 8,
											padding: "6px 4px",
											cursor: "pointer",
											fontFamily: "var(--f-sans)",
											fontSize: 13,
											color: isSel ? "var(--fg)" : "var(--fg-soft)",
										}}
									>
										<input
											type="checkbox"
											checked={isSel}
											onChange={() => onToggle(b.canonical)}
											style={{ accentColor: "var(--accent)" }}
										/>
										<span style={{ flex: 1 }}>{b.display}</span>
										{b.lastValue != null && (
											<span
												style={{
													fontFamily: "var(--f-mono)",
													fontSize: 11,
													color: chipColor(b.inRange),
												}}
											>
												{formatNum(b.lastValue)}
												{b.unit ? ` ${b.unit}` : ""}
											</span>
										)}
									</label>
								);
							})}
					</section>
				);
			})}
		</aside>
	);
}

function chipColor(r: "ok" | "warn" | "danger" | null): string {
	if (r === "ok") return "var(--ok)";
	if (r === "warn") return "var(--warn)";
	if (r === "danger") return "var(--danger)";
	return "var(--fg-mute)";
}

function formatNum(v: number): string {
	if (Math.abs(v) >= 100) return v.toFixed(0);
	if (Math.abs(v) >= 10) return v.toFixed(1);
	return v.toFixed(2);
}
