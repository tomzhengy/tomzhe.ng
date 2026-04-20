"use client";

import { useEffect } from "react";
import type { TrendPoint } from "./types";

interface DrillModalProps {
  point: TrendPoint | null;
  onClose: () => void;
}

export default function DrillModal({ point, onClose }: DrillModalProps) {
  useEffect(() => {
    if (!point) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handler);
      document.body.style.overflow = prev;
    };
  }, [point, onClose]);

  if (!point) return null;

  const d = new Date(point.date);
  const dateLabel = d.toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const sleepH = point.sleep != null ? Math.floor(point.sleep) : null;
  const sleepM =
    point.sleep != null
      ? String(
          Math.round((point.sleep - Math.floor(point.sleep)) * 60),
        ).padStart(2, "0")
      : null;

  const narrative =
    point.recovery == null
      ? "No recovery score logged for this day."
      : point.recovery > 75
        ? "A well-recovered day, powered by solid sleep."
        : point.recovery > 50
          ? "A moderate day — HRV holding steady."
          : "A low-recovery day. Take it easy.";

  return (
    <>
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "var(--overlay)",
          backdropFilter: "blur(3px)",
          WebkitBackdropFilter: "blur(3px)",
          zIndex: 40,
          opacity: 1,
          transition: "opacity .25s",
        }}
        onClick={onClose}
      />
      <aside
        role="dialog"
        aria-modal
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "min(700px, 92vw)",
          background: "var(--background)",
          border: "1px solid var(--rule-strong)",
          padding: "36px 40px 34px",
          zIndex: 41,
        }}
      >
        <button
          onClick={onClose}
          aria-label="Close"
          style={{
            position: "absolute",
            top: 16,
            right: 16,
            width: 34,
            height: 34,
            display: "inline-grid",
            placeItems: "center",
            border: "1px solid var(--rule-strong)",
            background: "transparent",
            color: "var(--fg)",
            cursor: "pointer",
          }}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.6}
            width={14}
            height={14}
          >
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
        <div
          style={{
            fontFamily: "var(--f-mono)",
            fontSize: 10.5,
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            color: "var(--fg-mute)",
          }}
        >
          {dateLabel}
        </div>
        <h2
          style={{
            fontFamily: "var(--f-serif)",
            fontWeight: 400,
            fontSize: 56,
            lineHeight: 0.95,
            letterSpacing: "-0.02em",
            margin: "6px 0 22px",
          }}
        >
          <em style={{ fontStyle: "italic", color: "var(--accent)" }}>
            Recovery
          </em>{" "}
          <span>{point.recovery != null ? `${point.recovery}%` : "—"}</span>
        </h2>
        <p
          style={{
            fontFamily: "var(--f-serif)",
            fontStyle: "italic",
            color: "var(--fg-soft)",
            margin: "-6px 0 20px",
            fontSize: 18,
          }}
        >
          {narrative}
        </p>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: "18px 22px",
            borderTop: "1px solid var(--rule)",
            paddingTop: 22,
          }}
        >
          <DrillStat
            label="HRV"
            value={point.hrv != null ? `${point.hrv}` : "—"}
            unit="ms"
          />
          <DrillStat
            label="RHR"
            value={point.rhr != null ? `${point.rhr}` : "—"}
            unit="bpm"
          />
          <DrillStat
            label="Recovery"
            value={point.recovery != null ? `${point.recovery}` : "—"}
            unit="%"
          />
          <DrillStat
            label="Sleep"
            value={
              sleepH != null && sleepM != null ? `${sleepH}:${sleepM}` : "—"
            }
            unit="hrs"
          />
          <DrillStat
            label="Strain"
            value={point.strain != null ? point.strain.toFixed(1) : "—"}
            unit=""
          />
        </div>
      </aside>
    </>
  );
}

function DrillStat({
  label,
  value,
  unit,
}: {
  label: string;
  value: string;
  unit: string;
}) {
  return (
    <div>
      <div
        style={{
          fontFamily: "var(--f-mono)",
          fontSize: 10,
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          color: "var(--fg-mute)",
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: "var(--f-serif)",
          fontSize: 30,
          lineHeight: 1.05,
          letterSpacing: "-0.01em",
          marginTop: 2,
        }}
      >
        {value}
        {unit && (
          <span
            style={{
              fontStyle: "italic",
              fontSize: 14,
              color: "var(--fg-mute)",
              marginLeft: 3,
            }}
          >
            {unit}
          </span>
        )}
      </div>
    </div>
  );
}
