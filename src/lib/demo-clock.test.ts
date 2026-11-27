import { describe, expect, it } from "vitest";
import { dayOffset, SEED_ANCHOR, shiftDate, shiftDateTime } from "./demo-clock";

describe("demo clock", () => {
  it("anchors the fictitious data on 2026-11-26", () => expect(SEED_ANCHOR).toBe("2026-11-26"));
  it("counts whole days from the anchor", () => {
    expect(dayOffset("2026-11-26")).toBe(0);
    expect(dayOffset("2026-12-05")).toBe(9);
    expect(dayOffset("2026-11-20")).toBe(-6);
  });
  it("shifts calendar dates exactly across month, year and leap days", () => {
    expect(shiftDate("2026-11-26", 9)).toBe("2026-12-05");
    expect(shiftDate("2027-02-27", 2)).toBe("2027-03-01");
    expect(shiftDate("2028-02-28", 1)).toBe("2028-02-29");
    expect(shiftDate("2026-12-31", 1)).toBe("2027-01-01");
    expect(shiftDate("2026-11-26", -30)).toBe("2026-10-27");
  });
  it("keeps the time of day when shifting timestamps", () => {
    expect(shiftDateTime("2026-11-26T10:30:00.000Z", 36)).toBe("2027-01-01T10:30:00.000Z");
    expect(shiftDateTime("2026-11-26T23:59:59.000Z", 0)).toBe("2026-11-26T23:59:59.000Z");
  });
});
