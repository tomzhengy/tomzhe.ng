"use client";

interface SparklineProps {
  values: number[];
  color?: string;
  width?: number;
  height?: number;
  dotColor?: string;
}

export default function Sparkline({
  values,
  color = "var(--fg-soft)",
  width = 200,
  height = 34,
  dotColor = "var(--accent)",
}: SparklineProps) {
  if (!values.length) {
    return (
      <svg
        className="spark"
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        style={{ width: "100%", height, display: "block", marginTop: 14 }}
      />
    );
  }

  const pad = 4;
  const clean = values.map((v) => (Number.isFinite(v) ? v : 0));
  const min = Math.min(...clean);
  const max = Math.max(...clean);
  const span = max - min || 1;
  const step = values.length > 1 ? (width - pad * 2) / (values.length - 1) : 0;

  const d = clean
    .map((v, i) => {
      const x = pad + i * step;
      const y = pad + (1 - (v - min) / span) * (height - pad * 2);
      return `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");

  const lastX = pad + (clean.length - 1) * step;
  const lastY =
    pad + (1 - (clean[clean.length - 1] - min) / span) * (height - pad * 2);

  return (
    <svg
      className="spark"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      style={{ width: "100%", height, display: "block", marginTop: 14 }}
    >
      <path d={d} fill="none" stroke={color} strokeWidth={1.25} />
      <rect x={lastX - 3} y={lastY - 3} width={6} height={6} fill={dotColor} />
    </svg>
  );
}
