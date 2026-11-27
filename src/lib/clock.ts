export const nowIso = (): string => new Date().toISOString();

// Business days are counted in Benin time (Africa/Porto-Novo, UTC+1, no DST), whatever the server or browser timezone.
const BENIN_DAY = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Porto-Novo", year: "numeric", month: "2-digit", day: "2-digit" });
export const todayIso = (now: Date = new Date()): string => BENIN_DAY.format(now);
