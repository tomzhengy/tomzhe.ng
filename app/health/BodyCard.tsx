"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { BodyData, BodyMeasurement } from "./types";
import { CardHead } from "./StrainCard";
import { formatClockTime, formatDateShort } from "./format";
import RollingNumber from "./RollingNumber";

interface BodyCardProps {
	body: BodyData | null;
}

type Range = "1m" | "3m" | "1y" | "all";

const RANGE_DAYS: Record<Range, number | null> = {
	"1m": 30,
	"3m": 90,
	"1y": 365,
	all: null,
};

const RANGE_LABEL: Record<Range, string> = {
	"1m": "1M",
	"3m": "3M",
	"1y": "1Y",
	all: "All",
};

type OverlayKey = "muscle" | "fat";

interface ChartSeries {
	key: "weight" | OverlayKey;
	label: string;
	color: string;
	visible: boolean;
	points: Array<{ date: Date; value: number }>;
}

export default function BodyCard({ body }: BodyCardProps) {
	const trend = useMemo(() => body?.trend ?? [], [body]);
	const [range, setRange] = useState<Range>("1y");
	const [overlays, setOverlays] = useState<Record<OverlayKey, boolean>>({
		muscle: false,
		fat: false,
	});

	// withings often splits a single weigh-in across multiple rows (one for
	// weight, one for pwv, etc.). build a composite "latest" by walking the
	// sorted trend backward and keeping the first non-null value for each field.
	const latest = useMemo<BodyMeasurement | null>(() => {
		if (trend.length === 0) return body?.latest ?? null;
		return mergeLatest(trend, body?.latest ?? null);
	}, [trend, body]);

	// shared range filter used to slice each series.
	const seriesPoints = useMemo(() => {
		const days = RANGE_DAYS[range];
		const cutoff = days != null ? Date.now() - days * 86_400_000 : 0;
		const inRange = (iso: string) =>
			days == null || new Date(iso).getTime() >= cutoff;

		const collect = (
			pick: (m: BodyMeasurement) => number | null,
		): Array<{ date: Date; value: number }> => {
			const out: Array<{ date: Date; value: number }> = [];
			for (const p of trend) {
				if (!inRange(p.measuredAt)) continue;
				const v = pick(p);
				if (v == null) continue;
				out.push({ date: new Date(p.measuredAt), value: v });
			}
			out.sort((a, b) => a.date.getTime() - b.date.getTime());
			return out;
		};

		return {
			weight: collect((m) => m.weightKg),
			muscle: collect((m) => m.muscleMassKg),
			fat: collect((m) => m.fatMassKg),
		};
	}, [trend, range]);

	const weightSeries = useMemo(
		() => seriesPoints.weight.map((p) => ({ date: p.date, w: p.value })),
		[seriesPoints],
	);

	// every series is always present in the chart so that toggling opacity
	// can animate via CSS instead of unmounting/mounting the path nodes.
	const chartSeries = useMemo<ChartSeries[]>(
		() => [
			{
				key: "weight",
				label: "Weight",
				color: "var(--fg)",
				visible: true,
				points: seriesPoints.weight,
			},
			{
				key: "muscle",
				label: "Muscle",
				color: "var(--ok)",
				visible: overlays.muscle,
				points: seriesPoints.muscle,
			},
			{
				key: "fat",
				label: "Fat",
				color: "var(--accent)",
				visible: overlays.fat,
				points: seriesPoints.fat,
			},
		],
		[seriesPoints, overlays],
	);

	// body fat delta vs prior measurement that has a body-fat reading
	const bfDelta = useMemo(() => {
		if (!latest || latest.bodyFatPct == null) return null;
		const sorted = trend.toSorted(
			(a, b) =>
				new Date(a.measuredAt).getTime() - new Date(b.measuredAt).getTime(),
		);
		for (let i = sorted.length - 2; i >= 0; i--) {
			const p = sorted[i];
			if (p.bodyFatPct != null) {
				return latest.bodyFatPct - p.bodyFatPct;
			}
		}
		return null;
	}, [latest, trend]);

	// ~30 days ago measurement, used for "vs last month" deltas
	const monthAgo = useMemo<BodyMeasurement | null>(() => {
		const cutoff = Date.now() - 30 * 86_400_000;
		const sorted = trend.toSorted(
			(a, b) =>
				new Date(a.measuredAt).getTime() - new Date(b.measuredAt).getTime(),
		);
		let best: BodyMeasurement | null = null;
		for (const p of sorted) {
			if (new Date(p.measuredAt).getTime() <= cutoff) best = p;
			else break;
		}
		return best;
	}, [trend]);

	const summary = useMemo(() => {
		if (weightSeries.length < 2) return null;
		const first = weightSeries[0];
		const last = weightSeries[weightSeries.length - 1];
		const days = Math.max(
			1,
			Math.round((last.date.getTime() - first.date.getTime()) / 86_400_000),
		);
		return { from: first.w, to: last.w, days };
	}, [weightSeries]);

	return (
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
				title="Body"
				rightSlot={<MeasuredAt iso={latest?.measuredAt ?? null} />}
			/>

			<div
				className="hp-body-top"
				style={{
					display: "grid",
					gridTemplateColumns: "1fr 1.6fr",
					gap: 40,
					paddingTop: 6,
				}}
			>
				<Portrait latest={latest} bfDelta={bfDelta} />
				<TrendPanel
					chartSeries={chartSeries}
					range={range}
					onRangeChange={setRange}
					summary={summary}
					overlays={overlays}
					onOverlayToggle={(k) =>
						setOverlays((cur) => ({ ...cur, [k]: !cur[k] }))
					}
				/>
			</div>

			<Tiles latest={latest} monthAgo={monthAgo} />
		</article>
	);
}

function Portrait({
	latest,
	bfDelta,
}: {
	latest: BodyMeasurement | null;
	bfDelta: number | null;
}) {
	const weight = latest?.weightKg ?? null;
	const bf = latest?.bodyFatPct ?? null;
	const muscle = latest?.muscleMassKg ?? 0;
	const fat = latest?.fatMassKg ?? 0;
	const bone = latest?.boneMassKg ?? 0;
	const total = weight ?? muscle + fat + bone;

	return (
		<div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
			<div
				className="hp-body-weight"
				style={{
					fontFamily: "var(--f-serif)",
					fontSize: 96,
					lineHeight: 0.9,
					letterSpacing: "-0.03em",
				}}
			>
				<span style={{ fontWeight: 400 }} className="skel">
					<RollingNumber value={weight} digits={1} intDigits={2} />
				</span>
				<span
					style={{
						fontStyle: "italic",
						fontSize: 32,
						color: "var(--fg-mute)",
						marginLeft: 8,
					}}
				>
					kg
				</span>
			</div>

			<div
				style={{
					display: "flex",
					alignItems: "baseline",
					fontFamily: "var(--f-serif)",
				}}
			>
				<span
					className="skel"
					style={{ fontSize: 32, color: "var(--fg)", marginRight: 8 }}
				>
					<RollingNumber value={bf} digits={1} intDigits={2} />
				</span>
				<span
					style={{
						fontStyle: "italic",
						fontSize: 16,
						color: "var(--fg-mute)",
					}}
				>
					% body fat
				</span>
				{bfDelta != null && Math.abs(bfDelta) >= 0.05 && (
					<DeltaTag value={bfDelta} digits={1} style={{ marginLeft: 14 }} />
				)}
			</div>

			<CompositionBar
				muscle={muscle}
				fat={fat}
				bone={bone}
				total={total}
				empty={latest == null || total <= 0}
			/>
		</div>
	);
}

function CompositionBar({
	muscle,
	fat,
	bone,
	total,
	empty,
}: {
	muscle: number;
	fat: number;
	bone: number;
	total: number;
	empty: boolean;
}) {
	const segments = [
		{ key: "muscle", label: "Muscle", value: muscle, color: "var(--fg)" },
		{ key: "fat", label: "Fat", value: fat, color: "var(--accent)" },
		{ key: "bone", label: "Bone", value: bone, color: "var(--fg-mute)" },
	];

	return (
		<>
			{empty ? (
				<div
					className="skel hp-skel-block"
					aria-label="Body composition"
					style={{
						height: 14,
						width: "100%",
						marginTop: 10,
						border: "1px solid var(--rule-strong)",
					}}
				/>
			) : (
				<div
					aria-label="Body composition"
					style={{
						display: "flex",
						height: 14,
						width: "100%",
						marginTop: 10,
						border: "1px solid var(--rule-strong)",
					}}
				>
					{segments.map((s) => (
						<span
							key={s.key}
							style={{
								display: "block",
								height: "100%",
								width: `${(s.value / total) * 100}%`,
								background: s.color,
							}}
						/>
					))}
				</div>
			)}
			<div
				style={{
					display: "flex",
					gap: 22,
					fontFamily: "var(--f-mono)",
					fontSize: 10.5,
					letterSpacing: "0.16em",
					textTransform: "uppercase",
					color: "var(--fg-mute)",
					flexWrap: "wrap",
				}}
			>
				{segments.map((s) => (
					<span key={s.key}>
						<i
							style={{
								display: "inline-block",
								width: 10,
								height: 10,
								marginRight: 6,
								verticalAlign: -1,
								background: empty ? "var(--rule-strong)" : s.color,
							}}
						/>
						{s.label}{" "}
						<span className="skel">
							{empty ? (
								"—"
							) : (
								<RollingNumber value={s.value} digits={1} intDigits={2} />
							)}
						</span>
					</span>
				))}
			</div>
		</>
	);
}

function TrendPanel({
	chartSeries,
	range,
	onRangeChange,
	summary,
	overlays,
	onOverlayToggle,
}: {
	chartSeries: ChartSeries[];
	range: Range;
	onRangeChange: (r: Range) => void;
	summary: { from: number; to: number; days: number } | null;
	overlays: Record<OverlayKey, boolean>;
	onOverlayToggle: (k: OverlayKey) => void;
}) {
	return (
		<div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
			<div
				style={{
					display: "flex",
					justifyContent: "space-between",
					alignItems: "center",
					gap: 18,
					flexWrap: "wrap",
				}}
			>
				<div
					style={{
						display: "flex",
						alignItems: "center",
						gap: 12,
						flexWrap: "wrap",
					}}
				>
					<RangeTabs value={range} onChange={onRangeChange} />
					<OverlayToggles overlays={overlays} onToggle={onOverlayToggle} />
				</div>
				<div
					style={{
						fontFamily: "var(--f-serif)",
						fontSize: 18,
						color: "var(--fg)",
					}}
				>
					<span className="skel" style={{ color: "var(--fg-mute)" }}>
						<RollingNumber
							value={summary?.from ?? null}
							digits={1}
							intDigits={2}
						/>
					</span>
					<span style={{ color: "var(--fg-mute)", margin: "0 4px" }}>→</span>
					<span className="skel">
						<RollingNumber
							value={summary?.to ?? null}
							digits={1}
							intDigits={2}
						/>{" "}
						kg
					</span>
					{summary && (
						<span
							style={{
								fontFamily: "var(--f-serif)",
								fontStyle: "italic",
								color: "var(--fg-soft)",
								marginLeft: 10,
								fontSize: 15,
							}}
						>
							over <em>{formatSpan(summary.days)}</em>.
						</span>
					)}
				</div>
			</div>
			<TrendChart chartSeries={chartSeries} />
		</div>
	);
}

function OverlayToggles({
	overlays,
	onToggle,
}: {
	overlays: Record<OverlayKey, boolean>;
	onToggle: (k: OverlayKey) => void;
}) {
	const items: Array<{ key: OverlayKey; label: string; color: string }> = [
		{ key: "muscle", label: "Muscle", color: "var(--ok)" },
		{ key: "fat", label: "Fat", color: "var(--accent)" },
	];
	return (
		<div
			style={{
				display: "inline-flex",
				gap: 6,
				fontFamily: "var(--f-mono)",
				fontSize: 10.5,
				letterSpacing: "0.16em",
				textTransform: "uppercase",
			}}
		>
			{items.map((it) => {
				const active = overlays[it.key];
				return (
					<button
						key={it.key}
						type="button"
						aria-pressed={active}
						onClick={() => onToggle(it.key)}
						style={{
							background: active
								? `color-mix(in oklab, ${it.color} 18%, transparent)`
								: "transparent",
							color: active ? it.color : "var(--fg-mute)",
							border: `1px solid ${active ? it.color : "var(--rule-strong)"}`,
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
								background: it.color,
								opacity: active ? 1 : 0.45,
							}}
						/>
						{it.label}
					</button>
				);
			})}
		</div>
	);
}

function RangeTabs({
	value,
	onChange,
}: {
	value: Range;
	onChange: (v: Range) => void;
}) {
	const ranges: Range[] = ["1m", "3m", "1y", "all"];
	return (
		<div
			role="tablist"
			style={{
				display: "inline-flex",
				border: "1px solid var(--rule-strong)",
				fontFamily: "var(--f-mono)",
				fontSize: 10.5,
				letterSpacing: "0.16em",
				textTransform: "uppercase",
			}}
		>
			{ranges.map((r, i) => {
				const active = r === value;
				return (
					<button
						key={r}
						type="button"
						role="tab"
						aria-selected={active}
						onClick={() => onChange(r)}
						style={{
							background: active ? "var(--fg)" : "transparent",
							color: active ? "var(--bg)" : "var(--fg-mute)",
							border: "none",
							borderRight:
								i < ranges.length - 1 ? "1px solid var(--rule-strong)" : "none",
							padding: "6px 12px",
							cursor: "pointer",
							font: "inherit",
							letterSpacing: "inherit",
							textTransform: "inherit",
						}}
					>
						{RANGE_LABEL[r]}
					</button>
				);
			})}
		</div>
	);
}

function TrendChart({ chartSeries }: { chartSeries: ChartSeries[] }) {
	const W = 1000;
	const H = 200;
	const PAD = { t: 18, r: 24, b: 24, l: 36 };
	const innerW = W - PAD.l - PAD.r;
	const innerH = H - PAD.t - PAD.b;

	const wrapRef = useRef<HTMLDivElement | null>(null);
	const [hoverTime, setHoverTime] = useState<number | null>(null);

	// weight is the anchor: it sets the time domain and is always present.
	// y-axis spans every visible series so the toggled overlays share scale.
	const anchor = chartSeries[0];
	const visibleValues: number[] = [];
	for (const s of chartSeries) {
		if (!s.visible) continue;
		for (const p of s.points) visibleValues.push(p.value);
	}
	const allTimes = anchor?.points.map((p) => p.date.getTime()) ?? [];

	const targetMin =
		visibleValues.length > 0 ? Math.floor(Math.min(...visibleValues) - 1) : 0;
	const targetMax =
		visibleValues.length > 0 ? Math.ceil(Math.max(...visibleValues) + 1) : 1;
	const tMin = allTimes.length > 0 ? allTimes[0] : 0;
	const tMax = allTimes.length > 0 ? allTimes[allTimes.length - 1] : 1;
	const tSpan = Math.max(1, tMax - tMin);

	// animate the y-axis scale toward the target whenever the visible series
	// change so the lines and gridlines slide into place instead of jumping.
	const { wMin, wMax } = useAnimatedRange(targetMin, targetMax);

	const xForTime = (t: number) => PAD.l + ((t - tMin) / tSpan) * innerW;
	const yFor = (v: number) =>
		PAD.t + innerH - ((v - wMin) / (wMax - wMin || 1)) * innerH;

	const gridLevels = [0, 0.25, 0.5, 0.75, 1];
	const gridYs = gridLevels.map((g) => ({
		g,
		y: PAD.t + innerH * (1 - g),
		label: (wMin + (wMax - wMin) * g).toFixed(0),
	}));

	const buildPath = (pts: Array<{ date: Date; value: number }>) => {
		let d = "";
		for (let i = 0; i < pts.length; i++) {
			const x = xForTime(pts[i].date.getTime());
			const y = yFor(pts[i].value);
			d += i === 0 ? `M ${x} ${y}` : ` L ${x} ${y}`;
		}
		return d;
	};

	const startY =
		anchor && anchor.points.length > 0 ? yFor(anchor.points[0].value) : 0;
	const endX = anchor && anchor.points.length > 0 ? xForTime(tMax) : 0;
	const endY =
		anchor && anchor.points.length > 0
			? yFor(anchor.points[anchor.points.length - 1].value)
			: 0;

	const handleMove = (e: React.MouseEvent<SVGRectElement>) => {
		if (!anchor || anchor.points.length < 2) return;
		const wrap = wrapRef.current;
		if (!wrap) return;
		const rect = wrap.getBoundingClientRect();
		if (rect.width <= 0) return;
		const svgX = ((e.clientX - rect.left) / rect.width) * W;
		const t = tMin + ((svgX - PAD.l) / innerW) * tSpan;
		setHoverTime(Math.max(tMin, Math.min(tMax, t)));
	};

	const monthTicks = useMemo(() => {
		if (!anchor || anchor.points.length < 2)
			return [] as Array<{ pct: number; label: string }>;
		const start = anchor.points[0].date.getTime();
		const end = anchor.points[anchor.points.length - 1].date.getTime();
		const span = end - start;
		if (span <= 0) return [];
		const totalDays = span / 86_400_000;
		const ticks: Array<{ pct: number; label: string }> = [];
		const cur = new Date(start);
		cur.setUTCDate(1);
		cur.setUTCMonth(cur.getUTCMonth() + 1);
		while (cur.getTime() <= end) {
			ticks.push({
				pct: ((cur.getTime() - start) / span) * 100,
				label: cur.toLocaleDateString(undefined, {
					month: "short",
					year: totalDays > 365 ? "2-digit" : undefined,
				}),
			});
			cur.setUTCMonth(cur.getUTCMonth() + 1);
		}
		if (ticks.length <= 6) return ticks;
		const step = Math.ceil(ticks.length / 6);
		return ticks.filter((_, i) => i % step === 0);
	}, [anchor]);

	// for each visible series, pick the point closest in time to hoverTime.
	const hoveredPoints = useMemo<
		Array<{ series: ChartSeries; point: { date: Date; value: number } }>
	>(() => {
		const out: Array<{
			series: ChartSeries;
			point: { date: Date; value: number };
		}> = [];
		if (hoverTime == null) return out;
		for (const s of chartSeries) {
			if (!s.visible || s.points.length === 0) continue;
			let nearest = s.points[0];
			let nearestDist = Math.abs(nearest.date.getTime() - hoverTime);
			for (let i = 1; i < s.points.length; i++) {
				const d = Math.abs(s.points[i].date.getTime() - hoverTime);
				if (d < nearestDist) {
					nearestDist = d;
					nearest = s.points[i];
				}
			}
			out.push({ series: s, point: nearest });
		}
		return out;
	}, [chartSeries, hoverTime]);

	if (!anchor || anchor.points.length < 2) {
		return (
			<div
				className="skel hp-skel-block"
				style={{
					height: H,
					width: "100%",
					marginTop: 4,
				}}
			/>
		);
	}

	const hoverAnchor = hoveredPoints.find((h) => h.series.key === "weight");
	const hoverX = hoverAnchor ? xForTime(hoverAnchor.point.date.getTime()) : 0;
	const hoverPct = hoverAnchor ? (hoverX / W) * 100 : 0;

	return (
		<div ref={wrapRef} style={{ position: "relative" }}>
			<svg
				viewBox={`0 0 ${W} ${H}`}
				preserveAspectRatio="none"
				style={{ width: "100%", height: H, display: "block" }}
			>
				{gridYs.map((g) => (
					<g key={g.g}>
						<line
							x1={PAD.l}
							x2={W - PAD.r}
							y1={g.y}
							y2={g.y}
							stroke="var(--rule)"
							strokeWidth={1}
							strokeDasharray="2 4"
						/>
						<text
							x={PAD.l - 8}
							y={g.y + 3}
							textAnchor="end"
							fill="var(--fg-mute)"
							fontFamily="var(--f-mono)"
							fontSize={10}
						>
							{g.label}
						</text>
					</g>
				))}

				<line
					x1={PAD.l}
					x2={W - PAD.r}
					y1={startY}
					y2={startY}
					stroke="var(--fg-mute)"
					strokeWidth={1}
					strokeDasharray="1 6"
				/>

				{chartSeries.map((s) => (
					<path
						key={s.key}
						d={buildPath(s.points)}
						fill="none"
						stroke={s.color}
						strokeWidth={1.5}
						strokeLinejoin="miter"
						vectorEffect="non-scaling-stroke"
						opacity={s.visible ? 1 : 0}
						style={{ transition: "opacity 260ms ease" }}
					/>
				))}

				<rect
					x={endX - 4}
					y={endY - 4}
					width={8}
					height={8}
					fill="var(--accent)"
				/>

				{hoverAnchor && (
					<>
						<line
							x1={hoverX}
							x2={hoverX}
							y1={PAD.t}
							y2={PAD.t + innerH}
							stroke="var(--fg-mute)"
							strokeWidth={1}
							strokeDasharray="2 3"
							pointerEvents="none"
						/>
						{hoveredPoints.map((h) => (
							<rect
								key={`dot-${h.series.key}`}
								x={xForTime(h.point.date.getTime()) - 4}
								y={yFor(h.point.value) - 4}
								width={8}
								height={8}
								fill={h.series.color}
								pointerEvents="none"
							/>
						))}
					</>
				)}

				<rect
					x={PAD.l}
					y={PAD.t}
					width={innerW}
					height={innerH}
					fill="transparent"
					style={{ cursor: "crosshair" }}
					onMouseMove={handleMove}
					onMouseLeave={() => setHoverTime(null)}
				/>
			</svg>

			{hoverAnchor && (
				<div
					style={{
						position: "absolute",
						left: `${hoverPct}%`,
						top: -8,
						transform: "translate(-50%, -100%)",
						background: "var(--card-elev)",
						border: "1px solid var(--rule-strong)",
						padding: "8px 10px",
						fontFamily: "var(--f-mono)",
						fontSize: 10,
						letterSpacing: "0.06em",
						color: "var(--fg)",
						pointerEvents: "none",
						whiteSpace: "nowrap",
						zIndex: 10,
						lineHeight: 1.5,
					}}
				>
					<div style={{ color: "var(--fg-mute)", marginBottom: 4 }}>
						{hoverAnchor.point.date.toLocaleDateString(undefined, {
							day: "numeric",
							month: "short",
							year: "numeric",
						})}
					</div>
					{hoveredPoints.map((h) => (
						<div
							key={`tt-${h.series.key}`}
							style={{ display: "flex", alignItems: "center", gap: 6 }}
						>
							<span
								style={{
									display: "inline-block",
									width: 6,
									height: 6,
									background: h.series.color,
								}}
							/>
							<span style={{ color: "var(--fg-mute)" }}>{h.series.label}</span>
							<span style={{ marginLeft: "auto" }}>
								{h.point.value.toFixed(1)} kg
							</span>
						</div>
					))}
				</div>
			)}

			<div
				style={{
					position: "relative",
					height: 14,
					fontFamily: "var(--f-mono)",
					fontSize: 10,
					letterSpacing: "0.1em",
					color: "var(--fg-mute)",
					marginTop: 4,
					textTransform: "uppercase",
				}}
			>
				{monthTicks.map((t) => {
					const wrapperPct = ((PAD.l + (t.pct / 100) * innerW) / W) * 100;
					return (
						<span
							key={`${t.label}-${t.pct}`}
							style={{
								position: "absolute",
								left: `${wrapperPct}%`,
								transform: "translateX(-50%)",
								whiteSpace: "nowrap",
							}}
						>
							{t.label}
						</span>
					);
				})}
			</div>
		</div>
	);
}

function Tiles({
	latest,
	monthAgo,
}: {
	latest: BodyMeasurement | null;
	monthAgo: BodyMeasurement | null;
}) {
	const muscleDelta = delta(
		latest?.muscleMassKg ?? null,
		monthAgo?.muscleMassKg,
	);
	const fatDelta = delta(latest?.fatMassKg ?? null, monthAgo?.fatMassKg);
	const bmrDelta = delta(
		latest?.basalMetabolicRateKcal ?? null,
		monthAgo?.basalMetabolicRateKcal,
	);
	const hydrationCap = hydrationCaption(latest);

	return (
		<div
			className="hp-body-tiles"
			style={{
				display: "grid",
				gridTemplateColumns: "repeat(5, 1fr)",
				gap: 0,
				marginTop: 36,
				paddingTop: 24,
				borderTop: "1px solid var(--rule)",
			}}
		>
			<Tile
				label="Muscle Mass"
				value={latest?.muscleMassKg ?? null}
				unit="kg"
				digits={1}
				intDigits={2}
				cap={
					muscleDelta != null ? (
						<>
							<DeltaTag value={muscleDelta} digits={1} inline /> vs last month
						</>
					) : null
				}
			/>
			<Tile
				label="Fat Mass"
				value={latest?.fatMassKg ?? null}
				unit="kg"
				digits={1}
				intDigits={2}
				cap={
					fatDelta != null ? (
						<>
							<DeltaTag value={fatDelta} digits={1} inline invert /> vs last
							month
						</>
					) : null
				}
			/>
			<Tile
				label="Visceral Fat"
				value={latest?.visceralFat ?? null}
				digits={1}
				intDigits={1}
				cap={
					<>
						In the <em style={{ color: "var(--fg)" }}>healthy</em> 1–9 range.
					</>
				}
			/>
			<Tile
				label="BMR"
				value={latest?.basalMetabolicRateKcal ?? null}
				unit="kcal"
				digits={0}
				intDigits={4}
				cap={
					bmrDelta != null ? (
						<>
							<DeltaTag value={bmrDelta} digits={0} inline /> vs last month
						</>
					) : (
						<>Resting daily burn.</>
					)
				}
			/>
			<Tile
				label="Hydration"
				value={latest?.hydrationKg ?? null}
				unit="kg"
				digits={1}
				intDigits={2}
				cap={hydrationCap}
			/>
		</div>
	);
}

function Tile({
	label,
	value,
	unit,
	digits,
	intDigits,
	cap,
}: {
	label: string;
	value: number | null;
	unit?: string;
	digits: number;
	intDigits?: number;
	cap: React.ReactNode;
}) {
	return (
		<div
			className="hp-body-tile"
			style={{
				padding: "0 22px",
				borderRight: "1px solid var(--rule)",
			}}
		>
			<div
				style={{
					fontFamily: "var(--f-mono)",
					fontSize: 10.5,
					letterSpacing: "0.18em",
					textTransform: "uppercase",
					color: "var(--fg-mute)",
					marginBottom: 8,
				}}
			>
				{label}
			</div>
			<div
				style={{
					fontFamily: "var(--f-serif)",
					fontSize: 38,
					lineHeight: 1,
					letterSpacing: "-0.01em",
					color: "var(--fg)",
				}}
			>
				<span className="skel">
					<RollingNumber
						value={value}
						digits={digits}
						grouping
						intDigits={intDigits}
					/>
				</span>
				{unit && (
					<span
						style={{
							fontStyle: "italic",
							fontSize: 16,
							color: "var(--fg-mute)",
							marginLeft: 6,
						}}
					>
						{unit}
					</span>
				)}
			</div>
			{cap && (
				<div
					style={{
						fontFamily: "var(--f-serif)",
						fontStyle: "italic",
						fontSize: 14,
						color: "var(--fg-mute)",
						marginTop: 10,
					}}
				>
					{cap}
				</div>
			)}
		</div>
	);
}

function DeltaTag({
	value,
	digits,
	inline,
	invert,
	style,
}: {
	value: number;
	digits: number;
	inline?: boolean;
	invert?: boolean;
	style?: React.CSSProperties;
}) {
	const sign = value === 0 ? 0 : value > 0 ? 1 : -1;
	const scored = invert ? -sign : sign;
	const color =
		scored > 0 ? "var(--ok)" : scored < 0 ? "var(--danger)" : "var(--fg-mute)";
	const arrow = sign > 0 ? "▲" : sign < 0 ? "▼" : "◆";
	return (
		<span
			style={{
				color,
				fontFamily: inline ? "var(--f-mono)" : undefined,
				fontSize: inline ? 11 : 14,
				letterSpacing: inline ? "0.06em" : undefined,
				...style,
			}}
		>
			{arrow} <RollingNumber value={Math.abs(value)} digits={digits} />
		</span>
	);
}

function MeasuredAt({ iso }: { iso: string | null }) {
	return (
		<span
			style={{
				fontFamily: "var(--f-mono)",
				fontSize: 10.5,
				letterSpacing: "0.18em",
				textTransform: "uppercase",
				color: "var(--fg-mute)",
			}}
		>
			Measured ·{" "}
			<span className="skel">
				{iso ? `${formatDateShort(iso)} · ${formatClockTime(iso)}` : "—"}
			</span>
		</span>
	);
}

function delta(a: number | null, b: number | null | undefined): number | null {
	if (a == null || b == null || !Number.isFinite(b)) return null;
	return a - b;
}

const COMPOSITE_FIELDS: Array<keyof BodyMeasurement> = [
	"weightKg",
	"bodyFatPct",
	"fatMassKg",
	"fatFreeMassKg",
	"muscleMassKg",
	"hydrationKg",
	"boneMassKg",
	"heightM",
	"heartRateBpm",
	"pulseWaveVelocityMs",
	"vascularAgeYears",
	"extracellularWaterKg",
	"intracellularWaterKg",
	"visceralFat",
	"basalMetabolicRateKcal",
];

// Withings sometimes splits a single weigh-in across rows. Walk the
// time-sorted trend backward and keep the first non-null value for each
// field so the card has a populated "latest" snapshot.
function mergeLatest(
	trend: BodyMeasurement[],
	fallback: BodyMeasurement | null,
): BodyMeasurement | null {
	if (trend.length === 0) return fallback;
	const sorted = trend.toSorted(
		(a, b) =>
			new Date(b.measuredAt).getTime() - new Date(a.measuredAt).getTime(),
	);
	const out: BodyMeasurement = {
		measuredAt: sorted[0].measuredAt,
		weightKg: null,
		bodyFatPct: null,
		fatMassKg: null,
		fatFreeMassKg: null,
		muscleMassKg: null,
		hydrationKg: null,
		boneMassKg: null,
		heightM: null,
		heartRateBpm: null,
		pulseWaveVelocityMs: null,
		vascularAgeYears: null,
		extracellularWaterKg: null,
		intracellularWaterKg: null,
		visceralFat: null,
		basalMetabolicRateKcal: null,
	};
	let measuredAtForWeight: string | null = null;
	for (const m of sorted) {
		for (const f of COMPOSITE_FIELDS) {
			if (out[f] == null && m[f] != null) {
				(out[f] as number | null) = m[f] as number | null;
				if (f === "weightKg") measuredAtForWeight = m.measuredAt;
			}
		}
	}
	// anchor the displayed timestamp to the most recent weigh-in if available,
	// otherwise the most recent row.
	if (measuredAtForWeight) out.measuredAt = measuredAtForWeight;
	return out;
}

function hydrationCaption(m: BodyMeasurement | null): React.ReactNode {
	const icw = m?.intracellularWaterKg ?? null;
	const ecw = m?.extracellularWaterKg ?? null;
	if (icw == null && ecw == null) return "Total body water.";
	const parts: React.ReactNode[] = [];
	if (icw != null) {
		parts.push(
			<span key="icw">
				ICW{" "}
				<b style={{ fontStyle: "normal", color: "var(--fg)" }}>
					<RollingNumber value={icw} digits={1} />
				</b>
			</span>,
		);
	}
	if (ecw != null) {
		parts.push(
			<span key="ecw">
				ECW{" "}
				<b style={{ fontStyle: "normal", color: "var(--fg)" }}>
					<RollingNumber value={ecw} digits={1} />
				</b>
			</span>,
		);
	}
	const result: React.ReactNode[] = [];
	let sepCount = 0;
	for (const part of parts) {
		if (result.length > 0) {
			sepCount++;
			result.push(<span key={`hydration-sep-${sepCount}`}> · </span>);
		}
		result.push(part);
	}
	return result;
}

function formatTileNumber(value: number, digits: number): string {
	return value.toLocaleString(undefined, {
		minimumFractionDigits: digits,
		maximumFractionDigits: digits,
	});
}

function formatSpan(days: number): string {
	if (days < 14) return `${days} days`;
	if (days < 60) {
		const w = Math.round(days / 7);
		return `${w} week${w === 1 ? "" : "s"}`;
	}
	if (days < 365) {
		const m = Math.round(days / 30);
		return `${m} month${m === 1 ? "" : "s"}`;
	}
	if (days < 730) {
		const m = Math.round(days / 30);
		return `${m} months`;
	}
	const y = (days / 365).toFixed(1);
	return `${y} years`;
}

// drives a requestAnimationFrame loop that smoothly interpolates the
// y-axis min/max toward a new target whenever it changes. lets the line
// paths and gridlines re-render each frame so they slide into place.
function useAnimatedRange(targetMin: number, targetMax: number) {
	const [range, setRange] = useState({ wMin: targetMin, wMax: targetMax });
	const fromRef = useRef({ wMin: targetMin, wMax: targetMax });
	const startRef = useRef<number | null>(null);
	const rafRef = useRef<number | null>(null);
	const targetRef = useRef({ wMin: targetMin, wMax: targetMax });

	useEffect(() => {
		const prevTarget = targetRef.current;
		if (prevTarget.wMin === targetMin && prevTarget.wMax === targetMax) return;
		targetRef.current = { wMin: targetMin, wMax: targetMax };
		fromRef.current = { ...range };
		startRef.current = null;

		const DURATION = 320;
		const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

		const tick = (now: number) => {
			if (startRef.current == null) startRef.current = now;
			const elapsed = now - startRef.current;
			const t = Math.min(1, elapsed / DURATION);
			const eased = easeOutCubic(t);
			const from = fromRef.current;
			setRange({
				wMin: from.wMin + (targetMin - from.wMin) * eased,
				wMax: from.wMax + (targetMax - from.wMax) * eased,
			});
			if (t < 1) rafRef.current = requestAnimationFrame(tick);
		};
		rafRef.current = requestAnimationFrame(tick);

		return () => {
			if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
		};
		// intentionally omit `range` so each new target restarts from the live value
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [targetMin, targetMax]);

	return range;
}
