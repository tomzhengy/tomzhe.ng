"use client";

import { useEffect, useState } from "react";
import { formatRelativeTime } from "./format";

interface MastheadProps {
  syncedAt: number | null;
}

export default function Masthead({ syncedAt }: MastheadProps) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);

  const syncLabel =
    syncedAt == null
      ? "Not synced"
      : `Synced · ${formatRelativeTime(syncedAt, now)}`;

  return (
    <header
      className="hp-masthead"
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
            letterSpacing: "-0.01em",
            margin: 0,
            color: "var(--foreground)",
          }}
        >
          Health
        </h1>
        <span
          style={{
            fontFamily: "var(--f-mono)",
            fontSize: 11,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "var(--fg-mute)",
            marginLeft: 8,
          }}
        >
          Personal Health · Vol. 04
        </span>
      </div>

      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          padding: "8px 12px",
          border: "1px solid var(--rule-strong)",
          fontFamily: "var(--f-mono)",
          fontSize: 11,
          letterSpacing: "0.08em",
          color: "var(--fg-soft)",
          background: "transparent",
        }}
      >
        {syncLabel}
      </span>
    </header>
  );
}
