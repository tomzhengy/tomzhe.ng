/**
 * translucent svg rect drawn behind the line in BiomarkerDetail to show the
 * reference range. assumes the caller has converted ref_low/ref_high into
 * svg y-coordinates already.
 */

interface ReferenceBandProps {
	x1: number;
	x2: number;
	yLow: number;
	yHigh: number;
	color?: string;
	label?: string;
}

export default function ReferenceBand({
	x1,
	x2,
	yLow,
	yHigh,
	color = "var(--ok)",
	label,
}: ReferenceBandProps) {
	// svg y grows downward, so the high reference value sits at a smaller y.
	const top = Math.min(yLow, yHigh);
	const bottom = Math.max(yLow, yHigh);
	const height = Math.max(0, bottom - top);
	return (
		<g pointerEvents="none">
			<rect
				x={x1}
				y={top}
				width={x2 - x1}
				height={height}
				fill={color}
				opacity={0.12}
			/>
			<line
				x1={x1}
				x2={x2}
				y1={top}
				y2={top}
				stroke={color}
				strokeWidth={1}
				strokeDasharray="3 3"
				opacity={0.5}
				vectorEffect="non-scaling-stroke"
			/>
			<line
				x1={x1}
				x2={x2}
				y1={bottom}
				y2={bottom}
				stroke={color}
				strokeWidth={1}
				strokeDasharray="3 3"
				opacity={0.5}
				vectorEffect="non-scaling-stroke"
			/>
			{label && (
				<text
					x={x2 - 6}
					y={top - 4}
					textAnchor="end"
					fill={color}
					opacity={0.7}
					fontFamily="var(--f-mono)"
					fontSize={9}
					letterSpacing="0.08em"
				>
					{label}
				</text>
			)}
		</g>
	);
}
