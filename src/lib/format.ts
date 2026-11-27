const pad = (n: number) => String(n).padStart(2, "0");
export const formatDate = (iso: string) => iso.slice(0, 10).split("-").reverse().join("/");

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function relativeTime(iso: string, now: Date = new Date()): string {
  const s = (now.getTime() - new Date(iso).getTime()) / 1000;
  if (s < 60) return "à l'instant";
  if (s < 3600) return `il y a ${Math.floor(s / 60)} min`;
  if (s < 86400) return `il y a ${Math.floor(s / 3600)} h`;
  if (s < 172800) return "hier";
  return formatDate(iso);
}

export function groupByDay<T>(xs: T[], key: (x: T) => string): { day: string; items: T[] }[] {
  const map = new Map<string, T[]>();
  [...xs].sort((a, b) => key(b).localeCompare(key(a))).forEach(x => { const d = key(x).slice(0, 10); map.set(d, [...(map.get(d) ?? []), x]); });
  return [...map.entries()].map(([day, items]) => ({ day, items }));
}
