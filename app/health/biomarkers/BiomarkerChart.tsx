"use client";

import { useMemo, useRef, useState } from "react";
import type { BiomarkerSeries } from "./types";

interface BiomarkerChartProps {
	series: BiomarkerSeries[];
}

const VIEW_W = 1000;
const VIEW_H = 300;
const PAD = { t: 20, r: 24, b: 36, l: 24 };

// rotate through these for arbitrary series. plenty of contrast with each
// other and against the chart background.
const COLORS = [
	"var(--accent)",
	"var(--ok)",
	"var(--warn)",
	"var(--select)",
	"var(--danger)",
	"var(--fg-soft)",
];

export default function BiomarkerChart({ series }: BiomarkerChartProps) {
	const wrapRef = useRef<HTMLDivElement | null>(null);
	const [hoverT, setHoverT] = useState<number | null>(null);

	const innerW = VIEW_W - PAD.l - PAD.r;
	const innerH = VIEW_H - PAD.t - PAD.b;

	// each series gets its own min/max so units don't clash. they all share
	// the same inner-height space — TrendChart.tsx uses the same trick.
	const normalized = useMemo(() => {
		return series.map((s, si) => {
			const numeric = s.points.filter(
				(p) => p.value != null && Number.isFinite(p.value),
			);
			let lo = Infinity;
			let hi = -Infinity;
			for (const p of numeric) {
				const v = p.value as number;
				if (v < lo) lo = v;
				if (v > hi) hi = v;
			}
			if (!Number.isFinite(lo)) lo = 0;
			if (!Number.isFinite(hi)) hi = 1;
			const span = hi - lo || Math.max(1, Math.abs(hi) * 0.1);
			const yMin = lo - span * 0.1;
			const yMax = hi + span * 0.1;
			return {
				series: s,
				color: COLORS[si % COLORS.length],
				numeric,
				yMin,
				yMax,
			};
		});
	}, [series]);

	// shared x axis: min/max time across all series
	const { tMin, tMax } = useMemo(() => {
		let lo = Infinity;
		let hi = -Infinity;
		for (const n of normalized) {
			for (const p of n.numeric) {
				const t = new Date(p.measuredAt).getTime();
				if (t < lo) lo = t;
				if (t > hi) hi = t;
			}
		}
		if (!Number.isFinite(lo)) {
			const now = Date.now();
			return { tMin: now - 86_400_000, tMax: now };
		}
		if (lo === hi) {
			lo -= 86_400_000;
			hi += 86_400_000;
		}
		return { tMin: lo, tMax: hi };
	}, [normalized]);

	const xFor = (iso: string) =>
		PAD.l + ((new Date(iso).getTime() - tMin) / (tMax - tMin || 1)) * innerW;
	const yForNorm = (v: number, lo: number, hi: number) =>
		PAD.t + innerH - ((v - lo) / (hi - lo || 1)) * innerH;

	const paths = useMemo(() => {
		return normalized.map((n) => {
			if (n.numeric.length === 0) return { color: n.color, d: "" };
			if (n.numeric.length === 1) {
				const y = yForNorm(n.numeric[0].value as number, n.yMin, n.yMax);
				return {
					color: n.color,
					d: `M ${PAD.l} ${y.toFixed(1)} L ${(VIEW_W - PAD.r).toFixed(1)} ${y.toFixed(1)}`,
				};
			}
			let d = "";
			n.numeric.forEach((p, i) => {
				const x = xFor(p.measuredAt);
				const y = yForNorm(p.value as number, n.yMin, n.yMax);
				d +=
					i === 0
						? `M ${x.toFixed(1)} ${y.toFixed(1)}`
						: ` L ${x.toFixed(1)} ${y.toFixed(1)}`;
			});
			return { color: n.color, d };
		});
	}, [normalized, tMin, tMax]); // eslint-disable-line react-hooks/exhaustive-deps

	function handleMove(e: React.MouseEvent<SVGRectElement>) {
		const wrap = wrapRef.current;
		if (!wrap) return;
		const r = wrap.getBoundingClientRect();
		const svgX = ((e.clientX - r.left) / r.width) * VIEW_W;
		const t = tMin + ((svgX - PAD.l) / innerW) * (tMax - tMin);
		setHoverT(t);
	}

	const xTicks = useMemo(() => {
		const steps = 5;
		const out: Array<{ x: number; label: string }> = [];
		for (let i = 0; i < steps; i++) {
			const t = tMin + ((tMax - tMin) * i) / (steps - 1);
			out.push({
				x: PAD.l + (innerW * i) / (steps - 1),
				label: new Date(t).toLocaleDateString("en-US", {
					day: "numeric",
					month: "short",
					year: "2-digit",
				}),
			});
		}
		return out;
	}, [tMin, tMax, innerW]);

	// hover snap: find each series' nearest point in time
	const hoverPoints = useMemo(() => {
		if (hoverT == null) return [];
		return normalized.map((n) => {
			if (n.numeric.length === 0) return null;
			let nearest = n.numeric[0];
			let nearestD = Infinity;
			for (const p of n.numeric) {
				const d = Math.abs(new Date(p.measuredAt).getTime() - hoverT);
				if (d < nearestD) {
					nearestD = d;
					nearest = p;
				}
			}
			return { n, p: nearest };
		});
	}, [hoverT, normalized]);

	return (
		<div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
			<div
				style={{
					display: "flex",
					gap: 10,
					flexWrap: "wrap",
					fontFamily: "var(--f-mono)",
					fontSize: 11,
					letterSpacing: "0.08em",
				}}
			>
				{normalized.map((n) => (
					<span
						key={n.series.canonical}
						style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
					>
						<span
							style={{
								display: "inline-block",
								width: 10,
								height: 2,
								background: n.color,
							}}
						/>
						<span style={{ color: "var(--fg-soft)" }}>
							{n.series.display}
							{n.series.unit ? ` · ${n.series.unit}` : ""}
						</span>
					</span>
				))}
			</div>

			<div ref={wrapRef} style={{ position: "relative" }}>
				<svg
					viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
					preserveAspectRatio="none"
					style={{ width: "100%", height: VIEW_H, display: "block" }}
				>
					{[0, 0.25, 0.5, 0.75, 1].map((g) => {
						const y = PAD.t + innerH * (1 - g);
						return (
							<line
								key={`g-${g}`}
								x1={PAD.l}
								x2={VIEW_W - PAD.r}
								y1={y}
								y2={y}
								stroke="var(--rule)"
								strokeWidth={1}
								strokeDasharray="2 4"
								vectorEffect="non-scaling-stroke"
							/>
						);
					})}

					{paths.map((p, i) => (
						<path
							key={`path-${i}`}
							d={p.d}
							fill="none"
							stroke={p.color}
							strokeWidth={1.75}
							strokeLinecap="round"
							strokeLinejoin="round"
							vectorEffect="non-scaling-stroke"
						/>
					))}

					{hoverPoints.map((hp, i) => {
						if (!hp) return null;
						const cx = xFor(hp.p.measuredAt);
						const cy = yForNorm(hp.p.value as number, hp.n.yMin, hp.n.yMax);
						return (
							<circle
								key={`hp-${i}`}
								cx={cx}
								cy={cy}
								r={4.5}
								fill={hp.n.color}
								stroke="var(--background)"
								strokeWidth={1.5}
							/>
						);
					})}

					<rect
						x={PAD.l}
						y={PAD.t}
						width={innerW}
						height={innerH}
						fill="transparent"
						onMouseMove={handleMove}
						onMouseLeave={() => setHoverT(null)}
					/>
				</svg>

				<div
					style={{
						display: "flex",
						justifyContent: "space-between",
						fontFamily: "var(--f-mono)",
						fontSize: 10,
						color: "var(--fg-mute)",
						letterSpacing: "0.08em",
						marginTop: 6,
						paddingLeft: `${(PAD.l / VIEW_W) * 100}%`,
						paddingRight: `${(PAD.r / VIEW_W) * 100}%`,
					}}
				>
					{xTicks.map((t) => (
						<span key={t.label}>{t.label}</span>
					))}
				</div>

				{hoverT != null && hoverPoints.length > 0 && (
					<div
						style={{
							position: "absolute",
							right: 16,
							top: 8,
							background: "var(--card-elev)",
							border: "1px solid var(--rule-strong)",
							padding: "10px 12px",
							fontFamily: "var(--f-mono)",
							fontSize: 11,
							color: "var(--fg)",
							pointerEvents: "none",
							whiteSpace: "nowrap",
							minWidth: 200,
							zIndex: 10,
						}}
					>
						{hoverPoints
							.filter((hp): hp is NonNullable<typeof hp> => hp != null)
							.map((hp) => (
								<div
									key={hp.n.series.canonical}
									style={{
										display: "flex",
										justifyContent: "space-between",
										gap: 14,
									}}
								>
									<span
										style={{
											display: "inline-flex",
											alignItems: "center",
											gap: 6,
										}}
									>
										<span
											style={{
												display: "inline-block",
												width: 8,
												height: 2,
												background: hp.n.color,
											}}
										/>
										<span style={{ color: "var(--fg-mute)" }}>
											{hp.n.series.display}
										</span>
									</span>
									<span>
										{formatNum(hp.p.value as number)}
										{hp.n.series.unit ? ` ${hp.n.series.unit}` : ""}
									</span>
								</div>
							))}
					</div>
				)}
			</div>
		</div>
	);
}

function formatNum(v: number): string {
	if (Math.abs(v) >= 100) return v.toFixed(0);
	if (Math.abs(v) >= 10) return v.toFixed(1);
	return v.toFixed(2);
}
