import { describe, expect, it } from "vitest";
import { formatDateTime, groupByDay, relativeTime } from "./format";
const now = new Date("2026-11-26T12:00:00.000Z");
describe("format", () => {
  it("relative times", () => {
    expect(relativeTime("2026-11-26T11:59:40.000Z", now)).toBe("à l'instant");
    expect(relativeTime("2026-11-26T11:55:00.000Z", now)).toBe("il y a 5 min");
    expect(relativeTime("2026-11-26T09:00:00.000Z", now)).toBe("il y a 3 h");
    expect(relativeTime("2026-11-25T09:00:00.000Z", now)).toBe("hier");
    expect(relativeTime("2026-11-20T09:00:00.000Z", now)).toBe("20/11/2026");
  });
  it("formats date-time in UTC-stable way", () => expect(formatDateTime("2026-11-26T10:05:00.000Z")).toMatch(/^26\/11\/2026 \d{2}:05$/));
  it("groups by day, most recent first", () =>
    expect(groupByDay([{ at: "2026-11-25T01:00:00Z" }, { at: "2026-11-26T01:00:00Z" }, { at: "2026-11-25T05:00:00Z" }], x => x.at).map(g => [g.day, g.items.length])).toEqual([["2026-11-26", 1], ["2026-11-25", 2]]));
});
