"use client";

import { useMemo, useRef, useState } from "react";
import type { TrendPoint } from "./types";

interface TrendChartProps {
	data: TrendPoint[];
	onPointClick?: (idx: number) => void;
}

const VIEW_W = 1000;
const VIEW_H = 260;
const PAD = { t: 20, r: 20, b: 30, l: 40 };

type MetricKey = "recovery" | "strain" | "sleep" | "hrv" | "rhr";

interface Metric {
	key: MetricKey;
	label: string;
	color: string;
	// semantic vertical range — each line gets normalized to its own min/max
	// so units (% / ms / bpm / hours) all share the same chart space.
	min: number;
	max: number;
	format: (v: number) => string;
}

const METRICS: Metric[] = [
	{
		key: "recovery",
		label: "Recovery",
		color: "var(--ok)",
		min: 0,
		max: 100,
		format: (v) => `${Math.round(v)}%`,
	},
	{
		key: "strain",
		label: "Strain",
		color: "var(--accent)",
		min: 0,
		max: 21,
		format: (v) => v.toFixed(1),
	},
	{
		key: "sleep",
		label: "Sleep",
		color: "var(--select)",
		min: 0,
		max: 10,
		format: (v) => `${v.toFixed(1)}h`,
	},
	{
		key: "hrv",
		label: "HRV",
		color: "var(--warn)",
		min: 20,
		max: 120,
		format: (v) => `${Math.round(v)}ms`,
	},
	{
		key: "rhr",
		label: "RHR",
		color: "var(--danger)",
		min: 40,
		max: 80,
		format: (v) => `${Math.round(v)}bpm`,
	},
];

const DEFAULT_VISIBLE: Record<MetricKey, boolean> = {
	recovery: true,
	strain: true,
	sleep: true,
	hrv: false,
	rhr: false,
};

export default function TrendChart({ data, onPointClick }: TrendChartProps) {
	const wrapRef = useRef<HTMLDivElement | null>(null);
	const [hover, setHover] = useState<{
		idx: number;
		clientX: number;
	} | null>(null);
	const [visible, setVisible] =
		useState<Record<MetricKey, boolean>>(DEFAULT_VISIBLE);

	const innerW = VIEW_W - PAD.l - PAD.r;
	const innerH = VIEW_H - PAD.t - PAD.b;
	const n = data.length;
	const stepX = n > 1 ? innerW / (n - 1) : 0;

	const xFor = (i: number) => PAD.l + i * stepX;
	const yForNorm = (v: number, min: number, max: number) =>
		PAD.t + innerH - ((v - min) / (max - min)) * innerH;

	const paths = useMemo(() => {
		return METRICS.map((m) => {
			const points: Array<{ x: number; y: number }> = [];
			data.forEach((dp, i) => {
				const raw = (dp as unknown as Record<string, number | string | null>)[
					m.key
				];
				if (raw == null || typeof raw !== "number" || !Number.isFinite(raw))
					return;
				points.push({ x: xFor(i), y: yForNorm(raw, m.min, m.max) });
			});
			let d = "";
			if (points.length === 1) {
				d = `M ${PAD.l} ${points[0].y.toFixed(1)} L ${(VIEW_W - PAD.r).toFixed(1)} ${points[0].y.toFixed(1)}`;
			} else {
				points.forEach((p, i) => {
					d +=
						i === 0
							? `M ${p.x.toFixed(1)} ${p.y.toFixed(1)}`
							: ` L ${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
				});
			}
			return { metric: m, d };
		});
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [data]);

	const gridYs = [0, 0.25, 0.5, 0.75, 1].map((g) => PAD.t + innerH * (1 - g));

	const axisTicks = useMemo(() => {
		if (n === 0) return [];
		const positions = [0, 0.25, 0.5, 0.75, 1].map((p) =>
			Math.min(n - 1, Math.max(0, Math.round(p * (n - 1)))),
		);
		return positions.map((i) => {
			const d = new Date(data[i].date);
			return d.toLocaleDateString(undefined, {
				day: "numeric",
				month: "short",
			});
		});
	}, [data, n]);

	const handleMove = (e: React.MouseEvent<SVGRectElement>) => {
		const wrap = wrapRef.current;
		if (!wrap || n === 0) return;
		const r = wrap.getBoundingClientRect();
		const svgX = ((e.clientX - r.left) / r.width) * VIEW_W;
		let idx = Math.round((svgX - PAD.l) / (stepX || 1));
		idx = Math.max(0, Math.min(n - 1, idx));
		setHover({ idx, clientX: e.clientX - r.left });
	};

	const active = hover ? data[hover.idx] : null;
	const activePx = hover != null ? xFor(hover.idx) : 0;
	const activeLeftPct = `${(activePx / VIEW_W) * 100}%`;
	const HOVER_EASE = "linear";
	const HOVER_DUR = "140ms";
	const slideTransition = `left ${HOVER_DUR} ${HOVER_EASE}, top ${HOVER_DUR} ${HOVER_EASE}`;

	const onToggle = (k: MetricKey) =>
		setVisible((cur) => ({ ...cur, [k]: !cur[k] }));

	return (
		<div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
			<MetricToggles visible={visible} onToggle={onToggle} />

			<div ref={wrapRef} style={{ position: "relative" }}>
				<svg
					viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
					preserveAspectRatio="none"
					style={{ width: "100%", height: VIEW_H, display: "block" }}
				>
					{gridYs.map((y, i) => (
						<line
							key={`g-${i}`}
							x1={PAD.l}
							x2={VIEW_W - PAD.r}
							y1={y}
							y2={y}
							stroke="var(--rule)"
							strokeWidth={1}
							strokeDasharray="2 4"
							vectorEffect="non-scaling-stroke"
						/>
					))}

					{paths.map((p) => {
						const isVisible = visible[p.metric.key];
						return (
							<path
								key={p.metric.key}
								d={p.d}
								fill="none"
								stroke={p.metric.color}
								strokeWidth={1.75}
								strokeLinecap="round"
								strokeLinejoin="round"
								vectorEffect="non-scaling-stroke"
								opacity={isVisible ? 1 : 0}
								style={{ transition: "opacity 260ms ease" }}
							/>
						);
					})}

					<rect
						x={PAD.l}
						y={PAD.t}
						width={innerW}
						height={innerH}
						fill="transparent"
						style={{ cursor: onPointClick ? "pointer" : "default" }}
						onMouseMove={handleMove}
						onMouseLeave={() => setHover(null)}
						onClick={() => {
							if (hover && onPointClick) onPointClick(hover.idx);
						}}
					/>
				</svg>

				<div
					style={{
						position: "absolute",
						left: activeLeftPct,
						top: PAD.t,
						height: innerH,
						width: 0,
						borderLeft: "1px dashed var(--fg-mute)",
						transform: "translateX(-0.5px)",
						pointerEvents: "none",
						opacity: hover ? 1 : 0,
						transition: `${slideTransition}, opacity 100ms linear`,
					}}
				/>

				<div
					style={{
						position: "absolute",
						inset: 0,
						height: VIEW_H,
						pointerEvents: "none",
					}}
				>
					{METRICS.map((m) => {
						const isVisible = visible[m.key];
						const raw =
							active != null
								? (active as unknown as Record<string, number | string | null>)[
										m.key
									]
								: null;
						const has = active != null && typeof raw === "number";
						const top = has
							? yForNorm(raw as number, m.min, m.max)
							: VIEW_H / 2;
						return (
							<div
								key={`dot-${m.key}`}
								style={{
									position: "absolute",
									left: activeLeftPct,
									top,
									width: 9,
									height: 9,
									borderRadius: "50%",
									background: m.color,
									border: "2px solid var(--background)",
									transform: "translate(-50%, -50%)",
									opacity: has && isVisible ? 1 : 0,
									transition: `${slideTransition}, opacity 200ms ease`,
								}}
							/>
						);
					})}
				</div>

				<div
					style={{
						display: "flex",
						justifyContent: "space-between",
						fontFamily: "var(--f-mono)",
						fontSize: 10,
						color: "var(--fg-mute)",
						letterSpacing: "0.08em",
						marginTop: 6,
					}}
				>
					{axisTicks.map((t, i) => (
						<span key={i}>{t}</span>
					))}
				</div>

				{hover && active && (
					<div
						style={{
							position: "absolute",
							left: activeLeftPct,
							top: 8,
							background: "var(--card-elev)",
							border: "1px solid var(--rule-strong)",
							padding: "10px 12px",
							fontFamily: "var(--f-mono)",
							fontSize: 11,
							color: "var(--fg)",
							pointerEvents: "none",
							whiteSpace: "nowrap",
							zIndex: 10,
							transform: "translate(-50%, 0)",
							minWidth: 160,
							transition: slideTransition,
						}}
					>
						<div
							style={{
								fontFamily: "var(--f-serif)",
								fontSize: 14,
								fontStyle: "italic",
								marginBottom: 4,
								borderBottom: "1px solid var(--rule)",
								paddingBottom: 4,
								letterSpacing: 0,
							}}
						>
							{new Date(active.date).toLocaleDateString(undefined, {
								weekday: "short",
								day: "numeric",
								month: "short",
							})}
						</div>
						{METRICS.filter((m) => visible[m.key]).map((m) => {
							const raw = (
								active as unknown as Record<string, number | string | null>
							)[m.key];
							const value =
								typeof raw === "number" && Number.isFinite(raw)
									? m.format(raw)
									: "—";
							return (
								<Row
									key={m.key}
									label={m.label}
									value={value}
									color={m.color}
								/>
							);
						})}
					</div>
				)}
			</div>
		</div>
	);
}

function MetricToggles({
	visible,
	onToggle,
}: {
	visible: Record<MetricKey, boolean>;
	onToggle: (k: MetricKey) => void;
}) {
	return (
		<div
			style={{
				display: "flex",
				gap: 6,
				flexWrap: "wrap",
				fontFamily: "var(--f-mono)",
				fontSize: 10.5,
				letterSpacing: "0.16em",
				textTransform: "uppercase",
			}}
		>
			{METRICS.map((m) => {
				const active = visible[m.key];
				return (
					<button
						key={m.key}
						type="button"
						aria-pressed={active}
						onClick={() => onToggle(m.key)}
						style={{
							background: active
								? `color-mix(in oklab, ${m.color} 18%, transparent)`
								: "transparent",
							color: active ? m.color : "var(--fg-mute)",
							border: `1px solid ${active ? m.color : "var(--rule-strong)"}`,
							padding: "6px 10px",
							cursor: "pointer",
							font: "inherit",
							letterSpacing: "inherit",
							textTransform: "inherit",
							display: "inline-flex",
							alignItems: "center",
							gap: 6,
						}}
					>
						<span
							style={{
								display: "inline-block",
								width: 8,
								height: 8,
								background: m.color,
								opacity: active ? 1 : 0.45,
							}}
						/>
						{m.label}
					</button>
				);
			})}
		</div>
	);
}

function Row({
	label,
	value,
	color,
}: {
	label: string;
	value: string;
	color: string;
}) {
	return (
		<div
			style={{
				display: "flex",
				justifyContent: "space-between",
				alignItems: "center",
				gap: 18,
			}}
		>
			<span style={{ display: "flex", alignItems: "center", gap: 6 }}>
				<span
					style={{
						display: "inline-block",
						width: 6,
						height: 6,
						background: color,
					}}
				/>
				<span style={{ color: "var(--fg-mute)" }}>{label}</span>
			</span>
			<span>{value}</span>
		</div>
	);
}
