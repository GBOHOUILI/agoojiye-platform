// The fictitious data set is written as if "today" were SEED_ANCHOR; it is shifted to the real day when loaded.
export const SEED_ANCHOR = "2026-11-26";
const DAY = 86_400_000;
const utcDay = (iso: string) => Date.UTC(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1, Number(iso.slice(8, 10)));

/** Whole days between the anchor and `today` (both "YYYY-MM-DD"), computed in UTC so no timezone can skew it. */
export const dayOffset = (today: string, anchor = SEED_ANCHOR) => Math.round((utcDay(today) - utcDay(anchor)) / DAY);

export const shiftDate = (isoDate: string, days: number) => new Date(utcDay(isoDate) + days * DAY).toISOString().slice(0, 10);
export const shiftDateTime = (isoDateTime: string, days: number) => new Date(Date.parse(isoDateTime) + days * DAY).toISOString();
