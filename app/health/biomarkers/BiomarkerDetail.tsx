"use client";

import { useMemo, useRef, useState } from "react";
import ReferenceBand from "./ReferenceBand";
import type { BiomarkerSeries } from "./types";

interface BiomarkerDetailProps {
	series: BiomarkerSeries;
}

const VIEW_W = 1000;
const VIEW_H = 280;
const PAD = { t: 24, r: 24, b: 36, l: 56 };

export default function BiomarkerDetail({ series }: BiomarkerDetailProps) {
	const wrapRef = useRef<HTMLDivElement | null>(null);
	const [hoverIdx, setHoverIdx] = useState<number | null>(null);

	const innerW = VIEW_W - PAD.l - PAD.r;
	const innerH = VIEW_H - PAD.t - PAD.b;

	const numericPoints = useMemo(
		() =>
			series.points.filter((p) => p.value != null && Number.isFinite(p.value)),
		[series.points],
	);

	const { yMin, yMax } = useMemo(() => {
		const values: number[] = [];
		for (const p of numericPoints) values.push(p.value as number);
		for (const p of numericPoints) {
			if (p.refLow != null) values.push(p.refLow);
			if (p.refHigh != null) values.push(p.refHigh);
		}
		if (values.length === 0) return { yMin: 0, yMax: 1 };
		const lo = Math.min(...values);
		const hi = Math.max(...values);
		const span = hi - lo || Math.max(1, Math.abs(hi) * 0.1);
		return { yMin: lo - span * 0.1, yMax: hi + span * 0.1 };
	}, [numericPoints]);

	const { tMin, tMax } = useMemo(() => {
		if (numericPoints.length === 0) {
			const now = Date.now();
			return { tMin: now - 86_400_000, tMax: now };
		}
		const times = numericPoints.map((p) => new Date(p.measuredAt).getTime());
		let lo = Math.min(...times);
		let hi = Math.max(...times);
		if (lo === hi) {
			// single point — pad by ±1 day
			lo -= 86_400_000;
			hi += 86_400_000;
		}
		return { tMin: lo, tMax: hi };
	}, [numericPoints]);

	const xFor = (iso: string) =>
		PAD.l + ((new Date(iso).getTime() - tMin) / (tMax - tMin || 1)) * innerW;
	const yFor = (v: number) =>
		PAD.t + innerH - ((v - yMin) / (yMax - yMin || 1)) * innerH;

	const pathD = useMemo(() => {
		if (numericPoints.length === 0) return "";
		if (numericPoints.length === 1) {
			const y = yFor(numericPoints[0].value as number);
			return `M ${PAD.l} ${y.toFixed(1)} L ${(VIEW_W - PAD.r).toFixed(1)} ${y.toFixed(1)}`;
		}
		return numericPoints
			.map((p, i) => {
				const x = xFor(p.measuredAt);
				const y = yFor(p.value as number);
				return `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
			})
			.join(" ");
	}, [numericPoints, tMin, tMax, yMin, yMax]); // eslint-disable-line react-hooks/exhaustive-deps

	// reference band uses the most recent draw's range (provider ranges
	// shift over time so we can't show one continuous band reliably).
	const latestRef = useMemo(() => {
		for (let i = numericPoints.length - 1; i >= 0; i--) {
			const p = numericPoints[i];
			if (p.refLow != null && p.refHigh != null) {
				return { low: p.refLow, high: p.refHigh };
			}
		}
		return null;
	}, [numericPoints]);

	const yTicks = useMemo(() => {
		if (yMax === yMin) return [yMin];
		const steps = 4;
		const out: number[] = [];
		for (let i = 0; i <= steps; i++)
			out.push(yMin + ((yMax - yMin) * i) / steps);
		return out;
	}, [yMin, yMax]);

	const xTicks = useMemo(() => {
		if (numericPoints.length === 0) return [];
		const steps = Math.min(5, numericPoints.length);
		const out: Array<{ key: string; x: number; label: string }> = [];
		const indices = new Set<number>();
		for (let i = 0; i < steps; i++) {
			indices.add(
				Math.round((i * (numericPoints.length - 1)) / Math.max(1, steps - 1)),
			);
		}
		for (const i of indices) {
			const p = numericPoints[i];
			out.push({
				key: `tick-${i}`,
				x: xFor(p.measuredAt),
				label: new Date(p.measuredAt).toLocaleDateString("en-US", {
					day: "numeric",
					month: "short",
					year: "2-digit",
				}),
			});
		}
		return out;
	}, [numericPoints, tMin, tMax]); // eslint-disable-line react-hooks/exhaustive-deps

	const hovered = hoverIdx != null ? numericPoints[hoverIdx] : null;

	function handleMove(e: React.MouseEvent<SVGRectElement>) {
		const wrap = wrapRef.current;
		if (!wrap || numericPoints.length === 0) return;
		const r = wrap.getBoundingClientRect();
		const svgX = ((e.clientX - r.left) / r.width) * VIEW_W;
		let nearestI = 0;
		let nearestD = Infinity;
		for (let i = 0; i < numericPoints.length; i++) {
			const x = xFor(numericPoints[i].measuredAt);
			const d = Math.abs(x - svgX);
			if (d < nearestD) {
				nearestD = d;
				nearestI = i;
			}
		}
		setHoverIdx(nearestI);
	}

	return (
		<div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
			<header style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
				<h2
					style={{
						fontFamily: "var(--f-serif)",
						fontWeight: 400,
						fontSize: 24,
						margin: 0,
					}}
				>
					{series.display}
				</h2>
				<span
					style={{
						fontFamily: "var(--f-mono)",
						fontSize: 11,
						color: "var(--fg-mute)",
						letterSpacing: "0.08em",
					}}
				>
					{series.unit ?? "—"} · {series.points.length} draws
				</span>
			</header>

			<div ref={wrapRef} style={{ position: "relative" }}>
				<svg
					viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
					preserveAspectRatio="none"
					style={{ width: "100%", height: VIEW_H, display: "block" }}
				>
					{yTicks.map((v, i) => {
						const y = yFor(v);
						return (
							<g key={`y-${i}`}>
								<line
									x1={PAD.l}
									x2={VIEW_W - PAD.r}
									y1={y}
									y2={y}
									stroke="var(--rule)"
									strokeWidth={1}
									strokeDasharray="2 4"
									vectorEffect="non-scaling-stroke"
								/>
								<text
									x={PAD.l - 8}
									y={y + 4}
									textAnchor="end"
									fill="var(--fg-mute)"
									fontFamily="var(--f-mono)"
									fontSize={10}
								>
									{formatTick(v)}
								</text>
							</g>
						);
					})}

					{latestRef && (
						<ReferenceBand
							x1={PAD.l}
							x2={VIEW_W - PAD.r}
							yLow={yFor(latestRef.low)}
							yHigh={yFor(latestRef.high)}
							label={`ref ${formatTick(latestRef.low)}–${formatTick(latestRef.high)}`}
						/>
					)}

					{pathD && (
						<path
							d={pathD}
							fill="none"
							stroke="var(--accent)"
							strokeWidth={1.75}
							strokeLinecap="round"
							strokeLinejoin="round"
							vectorEffect="non-scaling-stroke"
						/>
					)}

					{numericPoints.map((p, i) => {
						const cx = xFor(p.measuredAt);
						const cy = yFor(p.value as number);
						const status = rangeStatus(p.value, p.refLow, p.refHigh);
						const color =
							status === "ok"
								? "var(--ok)"
								: status === "warn"
									? "var(--warn)"
									: status === "danger"
										? "var(--danger)"
										: "var(--accent)";
						return (
							<circle
								key={`pt-${i}`}
								cx={cx}
								cy={cy}
								r={hoverIdx === i ? 5.5 : 3.5}
								fill={color}
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
						onMouseLeave={() => setHoverIdx(null)}
					/>
				</svg>

				<div
					style={{
						position: "relative",
						height: 14,
						fontFamily: "var(--f-mono)",
						fontSize: 10,
						color: "var(--fg-mute)",
						letterSpacing: "0.08em",
						marginTop: 6,
					}}
				>
					{xTicks.map((t) => (
						<span
							key={t.key}
							style={{
								position: "absolute",
								left: `${(t.x / VIEW_W) * 100}%`,
								transform: "translateX(-50%)",
								whiteSpace: "nowrap",
							}}
						>
							{t.label}
						</span>
					))}
				</div>

				{hovered && (
					<div
						style={{
							position: "absolute",
							left: `${(xFor(hovered.measuredAt) / VIEW_W) * 100}%`,
							top: 8,
							transform: "translate(-50%, 0)",
							background: "var(--card-elev)",
							border: "1px solid var(--rule-strong)",
							padding: "8px 12px",
							fontFamily: "var(--f-mono)",
							fontSize: 11,
							color: "var(--fg)",
							pointerEvents: "none",
							whiteSpace: "nowrap",
							minWidth: 160,
							zIndex: 10,
						}}
					>
						<div
							style={{
								fontFamily: "var(--f-serif)",
								fontSize: 13,
								fontStyle: "italic",
								marginBottom: 2,
								letterSpacing: 0,
							}}
						>
							{new Date(hovered.measuredAt).toLocaleDateString("en-US", {
								day: "numeric",
								month: "short",
								year: "numeric",
							})}
						</div>
						<div>
							{hovered.value != null
								? `${formatTick(hovered.value)} ${series.unit ?? ""}`
								: (hovered.valueText ?? "—")}
						</div>
						{(hovered.refLow != null || hovered.refHigh != null) && (
							<div style={{ color: "var(--fg-mute)", fontSize: 10 }}>
								ref {formatRefRange(hovered.refLow, hovered.refHigh)}
							</div>
						)}
					</div>
				)}
			</div>

			<DrawsTable series={series} />
		</div>
	);
}

function DrawsTable({ series }: { series: BiomarkerSeries }) {
	return (
		<table
			style={{
				width: "100%",
				borderCollapse: "collapse",
				fontFamily: "var(--f-mono)",
				fontSize: 12,
			}}
		>
			<thead>
				<tr style={{ borderBottom: "1px solid var(--rule-strong)" }}>
					<Th>Date</Th>
					<Th>Value</Th>
					<Th>Unit</Th>
					<Th>Reference</Th>
					<Th>Source</Th>
				</tr>
			</thead>
			<tbody>
				{series.points
					.slice()
					.reverse()
					.map((p, i) => (
						<tr
							key={`${p.measuredAt}-${i}`}
							style={{ borderBottom: "1px solid var(--rule)" }}
						>
							<Td>
								{new Date(p.measuredAt).toLocaleDateString("en-US", {
									day: "numeric",
									month: "short",
									year: "numeric",
								})}
							</Td>
							<Td>
								{p.value != null ? formatTick(p.value) : (p.valueText ?? "—")}
							</Td>
							<Td>{series.unit ?? "—"}</Td>
							<Td>{formatRefRange(p.refLow, p.refHigh)}</Td>
							<Td>{p.source}</Td>
						</tr>
					))}
			</tbody>
		</table>
	);
}

function Th({ children }: { children: React.ReactNode }) {
	return (
		<th
			style={{
				textAlign: "left",
				padding: "8px 6px",
				color: "var(--fg-mute)",
				fontWeight: 400,
				letterSpacing: "0.1em",
				textTransform: "uppercase",
				fontSize: 10,
			}}
		>
			{children}
		</th>
	);
}

function Td({ children }: { children: React.ReactNode }) {
	return (
		<td style={{ padding: "8px 6px", color: "var(--fg-soft)" }}>{children}</td>
	);
}

function rangeStatus(
	v: number | null,
	lo: number | null,
	hi: number | null,
): "ok" | "warn" | "danger" | null {
	if (v == null || (lo == null && hi == null)) return null;
	if (lo != null && v < lo) {
		if (lo > 0 && (lo - v) / Math.abs(lo) > 0.2) return "danger";
		return "warn";
	}
	if (hi != null && v > hi) {
		if (hi > 0 && (v - hi) / Math.abs(hi) > 0.2) return "danger";
		return "warn";
	}
	return "ok";
}

function formatTick(v: number): string {
	if (Math.abs(v) >= 100) return v.toFixed(0);
	if (Math.abs(v) >= 10) return v.toFixed(1);
	return v.toFixed(2);
}

function formatRefRange(lo: number | null, hi: number | null): string {
	if (lo == null && hi == null) return "—";
	if (lo == null) return `< ${formatTick(hi as number)}`;
	if (hi == null) return `> ${formatTick(lo)}`;
	return `${formatTick(lo)}–${formatTick(hi)}`;
}
