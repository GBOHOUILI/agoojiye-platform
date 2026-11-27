export type Density = "compacte" | "confortable";
export interface UiPrefs { density: Density; autoOpen: boolean; openGroups?: string[] }
export const DEFAULT_PREFS: UiPrefs = { density: "compacte", autoOpen: true };
export const UI_PREFS_KEY = "agj-demo-ui";

const matches = (path: string, href: string, exact?: boolean) => path === href || (!exact && path.startsWith(href + "/"));

/** Title of the group holding the current page (longest matching link wins). */
export function activeGroup(path: string, groups: { title: string; items: { href: string; exact?: boolean }[] }[]): string | undefined {
  let best: { title: string; len: number } | undefined;
  for (const g of groups) for (const i of g.items) if (matches(path, i.href, i.exact) && (!best || i.href.length > best.len)) best = { title: g.title, len: i.href.length };
  return best?.title;
}

/** Per-browser display preferences; any unreadable value falls back to the defaults. */
export function parsePrefs(raw: string | null): UiPrefs {
  try {
    const p = raw ? JSON.parse(raw) : null;
    if (!p || (p.density !== "compacte" && p.density !== "confortable") || typeof p.autoOpen !== "boolean") return { ...DEFAULT_PREFS };
    // Earlier format stored a single `openGroup`; it becomes a one-item list.
    const groups = Array.isArray(p.openGroups) ? p.openGroups.filter((g: unknown): g is string => typeof g === "string") : typeof p.openGroup === "string" && p.openGroup ? [p.openGroup] : undefined;
    return { density: p.density, autoOpen: p.autoOpen, ...(groups ? { openGroups: groups } : {}) };
  } catch { return { ...DEFAULT_PREFS }; }
}

/** Groups stay open until the user closes them: opening one never closes the others. */
export const toggleGroup = (open: string[], title: string) => (open.includes(title) ? open.filter(g => g !== title) : [...open, title]);
export const openWith = (open: string[], title: string) => (open.includes(title) ? open : [...open, title]);
