"use client";

import type { Cycle } from "./types";
import { kjToCalories, sanitizeCopyHtml } from "./format";
import RollingNumber from "./RollingNumber";

interface StrainCardProps {
  cycle: Cycle | null;
  strainCopyHtml: string | null;
}

export default function StrainCard({ cycle, strainCopyHtml }: StrainCardProps) {
  const strain = cycle?.score?.strain ?? null;
  const kj = cycle?.score?.kilojoule ?? null;
  const avgHr = cycle?.score?.average_heart_rate ?? null;
  const maxHr = cycle?.score?.max_heart_rate ?? null;
  const cals = kjToCalories(kj);

  const strainPct = strain != null ? Math.min(100, (strain / 21) * 100) : 0;

  const fallback =
    strain == null
      ? "No strain logged yet. Move a little and check back."
      : strain < 8
        ? "A <em>light</em> day. Plenty of headroom if you want it."
        : strain < 14
          ? "A <em>moderate</em> day in the optimal range."
          : "A <em>strong</em> day. Watch your recovery tonight.";

  return (
    <article
      className="health-card filled"
      style={{
        background: "var(--card)",
        border: "1px solid transparent",
        padding: "22px 24px 14px",
        gridColumn: "span 4",
        position: "relative",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <CardHead title="Strain" subtitle="0–21 scale" />
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "auto minmax(0, 1fr)",
          gap: 24,
          alignItems: "start",
          marginTop: 14,
        }}
      >
        <div
          className="hp-hero-score"
          style={{
            fontFamily: "var(--f-serif)",
            fontSize: 144,
            lineHeight: 0.9,
            letterSpacing: "-0.03em",
            display: "flex",
            alignItems: "baseline",
            gap: 6,
            margin: 0,
          }}
        >
          <span className="skel">
            <RollingNumber value={strain} digits={1} />
          </span>
        </div>
        <p
          style={{
            fontFamily: "var(--f-serif)",
            fontSize: 18,
            lineHeight: 1.3,
            color: "var(--fg-soft)",
            margin: 0,
          }}
          dangerouslySetInnerHTML={{
            __html: strainCopyHtml
              ? sanitizeCopyHtml(strainCopyHtml)
              : fallback,
          }}
        />
      </div>

      <div style={{ flex: 1, minHeight: 14 }} />

      <div
        style={{
          marginTop: 24,
          height: 6,
          background: "var(--rule-strong)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: "0 auto 0 0",
            width: `${strainPct}%`,
            background: "var(--accent)",
            transition: "width 1.2s cubic-bezier(.2,.8,.2,1)",
          }}
        />
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontFamily: "var(--f-mono)",
          fontSize: 10,
          color: "var(--fg-mute)",
          letterSpacing: "0.14em",
          marginTop: 8,
        }}
      >
        <span>0</span>
        <span>7</span>
        <span>14</span>
        <span>18</span>
        <span>21</span>
      </div>

      <div
        style={{
          marginTop: 28,
          paddingTop: 22,
          borderTop: "1px solid var(--rule)",
        }}
      >
        <div
          style={{
            fontFamily: "var(--f-serif)",
            fontSize: 46,
            lineHeight: 1,
            letterSpacing: "-0.02em",
          }}
        >
          <span className="skel">
            <RollingNumber
              value={avgHr != null ? Math.round(avgHr) : null}
              digits={0}
            />
          </span>
          <span
            style={{
              fontFamily: "var(--f-serif)",
              fontStyle: "italic",
              fontSize: 16,
              color: "var(--fg-mute)",
              marginLeft: 4,
            }}
          >
            bpm
          </span>
        </div>
        <div
          style={{
            fontFamily: "var(--f-mono)",
            fontSize: 10,
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            color: "var(--fg-mute)",
            marginTop: 4,
          }}
        >
          Avg today · max{" "}
          <RollingNumber
            value={maxHr != null ? Math.round(maxHr) : null}
            digits={0}
          />
        </div>
      </div>

      <div
        className="hp-strain-energy"
        style={{
          marginTop: 28,
          paddingTop: 22,
          borderTop: "1px solid var(--rule)",
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 28,
          alignItems: "center",
        }}
      >
        <div>
          <div
            style={{
              fontFamily: "var(--f-mono)",
              fontSize: 10.5,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: "var(--fg-mute)",
            }}
          >
            Kilojoules
          </div>
          <div
            style={{
              fontFamily: "var(--f-serif)",
              fontSize: 36,
              letterSpacing: "-0.01em",
              marginTop: 4,
            }}
          >
            <span className="skel">
              <RollingNumber value={kj} digits={0} grouping />
            </span>
            <span
              style={{
                fontStyle: "italic",
                fontSize: 14,
                color: "var(--fg-mute)",
                marginLeft: 4,
              }}
            >
              kJ
            </span>
          </div>
        </div>
        <div>
          <div
            style={{
              fontFamily: "var(--f-mono)",
              fontSize: 10.5,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: "var(--fg-mute)",
            }}
          >
            Calories
          </div>
          <div
            style={{
              fontFamily: "var(--f-serif)",
              fontSize: 36,
              letterSpacing: "-0.01em",
              marginTop: 4,
            }}
          >
            <span className="skel">
              <RollingNumber value={cals} digits={0} grouping />
            </span>
            <span
              style={{
                fontStyle: "italic",
                fontSize: 14,
                color: "var(--fg-mute)",
                marginLeft: 4,
              }}
            >
              cal
            </span>
          </div>
        </div>
      </div>
    </article>
  );
}

export function CardHead({
  title,
  subtitle,
  subtitleAccent,
  rightSlot,
}: {
  title: string;
  subtitle?: string;
  subtitleAccent?: string;
  rightSlot?: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "baseline",
        marginBottom: 10,
      }}
    >
      <h3
        style={{
          fontFamily: "var(--f-serif)",
          fontSize: 28,
          letterSpacing: "-0.01em",
          margin: 0,
        }}
      >
        <em style={{ fontStyle: "italic", color: "var(--accent)" }}>{title}</em>
        {subtitleAccent && (
          <span
            style={{
              fontFamily: "var(--f-serif)",
              fontStyle: "italic",
              color: "var(--fg-soft)",
              fontSize: 18,
            }}
          >
            {" "}
            — {subtitleAccent}
          </span>
        )}
      </h3>
      {rightSlot
        ? rightSlot
        : subtitle && (
            <span
              style={{
                fontFamily: "var(--f-mono)",
                fontSize: 10.5,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: "var(--fg-mute)",
              }}
            >
              {subtitle}
            </span>
          )}
    </div>
  );
}
