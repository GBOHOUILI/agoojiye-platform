"use client";
import { useDemoStore } from "@/hooks/demo-store";
import { formatDate, formatDateTime, relativeTime } from "@/lib/format";
// Relative/local times depend on the clock and timezone: render a neutral date until mounted (no hydration mismatch).
export function Time({ iso, mode = "relative" }: { iso: string; mode?: "relative" | "datetime" | "time" }) {
  const { ready } = useDemoStore();
  if (!ready) return <time dateTime={iso}>{formatDate(iso)}</time>;
  const full = formatDateTime(iso);
  return <time dateTime={iso} title={full}>{mode === "relative" ? relativeTime(iso) : mode === "time" ? full.slice(11) : full}</time>;
}
