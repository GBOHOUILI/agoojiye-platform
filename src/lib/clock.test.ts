import { describe, expect, it } from "vitest";
import { todayIso } from "./clock";
import { isOverdue } from "@/services/tasks.service";

// Benin (Africa/Porto-Novo) is UTC+1 all year round, without daylight saving.
describe("Benin calendar day", () => {
  it("23:30 UTC is already the next day in Cotonou", () => expect(todayIso(new Date("2026-11-26T23:30:00Z"))).toBe("2026-11-27"));
  it("00:30 UTC is still the same day in Cotonou", () => expect(todayIso(new Date("2026-11-27T00:30:00Z"))).toBe("2026-11-27"));
  it("22:59 UTC is still the same day in Cotonou", () => expect(todayIso(new Date("2026-11-26T22:59:00Z"))).toBe("2026-11-26"));
  it("a task due on the 26th is late from midnight in Cotonou, not from 1 a.m.", () => {
    const task = { status: "En cours", dueDate: "2026-11-26" } as never;
    expect(isOverdue(task, todayIso(new Date("2026-11-26T23:30:00Z")))).toBe(true);
    expect(isOverdue(task, todayIso(new Date("2026-11-26T22:30:00Z")))).toBe(false);
  });
});
