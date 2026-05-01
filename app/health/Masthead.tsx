"use client";

import { useEffect, useState } from "react";
import { formatRelativeTime } from "./format";

interface MastheadProps {
  syncedAt: number | null;
  syncing?: boolean;
  onSync?: () => void;
}

export default function Masthead({ syncedAt, syncing, onSync }: MastheadProps) {
  const [now, setNow] = useState(() => Date.now());
  const [hover, setHover] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);

  const syncLabel = syncing
    ? "Syncing…"
    : syncedAt == null
      ? "Sync now"
      : hover
        ? "Sync now"
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
      </div>

      <button
        type="button"
        onClick={() => {
          if (!syncing && onSync) onSync();
        }}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        disabled={syncing || !onSync}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          padding: "8px 12px",
          border: `1px solid ${hover && !syncing ? "var(--fg-mute)" : "var(--rule-strong)"}`,
          fontFamily: "var(--f-mono)",
          fontSize: 11,
          letterSpacing: "0.08em",
          color: syncing ? "var(--fg-mute)" : "var(--fg-soft)",
          background: "transparent",
          cursor: syncing || !onSync ? "default" : "pointer",
          textTransform: "none",
          transition: "border-color 160ms ease, color 160ms ease",
          font: "inherit",
        }}
      >
        {syncing && (
          <span
            aria-hidden
            style={{
              display: "inline-block",
              width: 8,
              height: 8,
              borderRadius: "50%",
              border: "1.5px solid var(--fg-mute)",
              borderTopColor: "var(--fg)",
              animation: "hp-spin 0.9s linear infinite",
            }}
          />
        )}
        <span
          style={{
            fontFamily: "var(--f-mono)",
            fontSize: 11,
            letterSpacing: "0.08em",
          }}
        >
          {syncLabel}
        </span>
      </button>
    </header>
  );
}
