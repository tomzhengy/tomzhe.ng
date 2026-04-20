export function formatRelativeTime(fromMs: number, nowMs: number = Date.now()) {
  const diff = Math.max(0, nowMs - fromMs);
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins === 1) return "1m ago";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs === 1) return "1h ago";
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return days === 1 ? "1d ago" : `${days}d ago`;
}

export function formatDuration(milli: number) {
  const totalMin = Math.round(milli / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}

export function splitHoursMinutes(milli: number) {
  const totalMin = Math.round(milli / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return { h, m };
}

export function recoveryHue(score: number | null | undefined) {
  if (score == null) return "var(--fg-mute)";
  if (score >= 67) return "var(--ok)";
  if (score >= 34) return "var(--warn)";
  return "var(--danger)";
}

export function recoveryBand(score: number | null | undefined) {
  if (score == null) return "unknown";
  if (score >= 67) return "high";
  if (score >= 34) return "mid";
  return "low";
}

export function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

export function formatDateShort(iso: string) {
  const d = new Date(iso);
  return d
    .toLocaleDateString(undefined, { day: "numeric", month: "short" })
    .toUpperCase();
}

export function formatClockTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatNumber(n: number | null | undefined, digits = 0) {
  if (n == null || !Number.isFinite(n)) return "—";
  return n.toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function kjToCalories(kj: number | null | undefined) {
  if (kj == null) return null;
  return Math.round(kj * 0.239006);
}

/**
 * render an html fragment from model output that may include <em>/<b>.
 * we accept only <em> and <b> tags and strip everything else.
 */
export function sanitizeCopyHtml(html: string): string {
  return html.replace(/<(?!\/?(?:em|b)\b)[^>]*>/gi, "");
}
