"use client";

import { sanitizeCopyHtml } from "./format";

interface JournalFooterProps {
  weekly: string | null;
  watch: string | null;
  checkIn: string | null;
}

export default function JournalFooter({
  weekly,
  watch,
  checkIn,
}: JournalFooterProps) {
  return (
    <footer
      style={{
        marginTop: 54,
        paddingTop: 22,
        borderTop: "1px solid var(--rule-strong)",
        display: "grid",
        gridTemplateColumns: "1fr 1fr 1fr",
        gap: 40,
      }}
    >
      <Item
        label="This week, you're"
        html={weekly ?? "carrying your <b>usual</b> rhythm — nothing to flag."}
      />
      <Item
        label="One thing to watch"
        html={watch ?? "Nothing standing out today."}
      />
      <Item
        label="Next check-in"
        html={checkIn ?? "Tomorrow, after your cycle closes."}
      />
    </footer>
  );
}

function Item({ label, html }: { label: string; html: string }) {
  return (
    <div>
      <div
        style={{
          fontFamily: "var(--f-mono)",
          fontSize: 10.5,
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          color: "var(--fg-mute)",
          marginBottom: 6,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: "var(--f-serif)",
          fontStyle: "italic",
          fontSize: 20,
          lineHeight: 1.35,
        }}
        dangerouslySetInnerHTML={{ __html: sanitizeCopyHtml(html) }}
      />
    </div>
  );
}
