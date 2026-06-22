"use client";

interface DatelineProps {
	cycleStartIso: string | null;
	cycleActive: boolean;
	nowIso: string;
}

export default function Dateline({
	cycleStartIso,
	cycleActive,
	nowIso,
}: DatelineProps) {
	const now = new Date(nowIso);
	const weekday = now.toLocaleDateString(undefined, { weekday: "long" });
	const datePart = now.toLocaleDateString(undefined, {
		day: "numeric",
		month: "long",
	});

	// only an open cycle (start present, no end) counts as "in progress". a
	// closed latest cycle still has a start, so gating on the start alone would
	// keep a live timer running for a finished cycle.
	const hasCycle = cycleActive && cycleStartIso != null;
	let cycleDetail: string | null = null;
	if (hasCycle && cycleStartIso) {
		const start = new Date(cycleStartIso);
		const elapsed = Math.max(0, now.getTime() - start.getTime());
		const h = Math.floor(elapsed / 3_600_000);
		const m = Math.floor((elapsed % 3_600_000) / 60_000);
		const startLabel = start.toLocaleTimeString(undefined, {
			hour: "2-digit",
			minute: "2-digit",
			hour12: false,
		});
		cycleDetail = `Started ${startLabel} · ${String(h).padStart(2, "0")}h ${String(m).padStart(2, "0")}m`;
	}

	return (
		<section
			className="hp-dateline"
			style={{
				display: "grid",
				gridTemplateColumns: "1fr auto",
				alignItems: "end",
				gap: 24,
				padding: "28px 0 36px",
			}}
		>
			<h2
				style={{
					fontFamily: "var(--f-serif)",
					fontSize: 74,
					lineHeight: 0.95,
					letterSpacing: "-0.02em",
					margin: 0,
				}}
			>
				{weekday},{" "}
				<em style={{ fontStyle: "italic", color: "var(--accent)" }}>
					{datePart}
				</em>
			</h2>
			<div
				style={{
					fontFamily: "var(--f-mono)",
					fontSize: 11,
					letterSpacing: "0.14em",
					textTransform: "uppercase",
					color: "var(--fg-mute)",
					textAlign: "right",
				}}
			>
				{hasCycle ? "Cycle in progress" : "No active cycle"}
				{cycleDetail && (
					<b
						style={{
							display: "block",
							fontWeight: 400,
							color: "var(--fg-soft)",
							fontSize: 14,
							letterSpacing: "0.08em",
							marginTop: 2,
						}}
					>
						{cycleDetail}
					</b>
				)}
			</div>
		</section>
	);
}
