import { describe, expect, it } from "vitest";
import { USERS0 } from "@/data/seed-org";
import { LocalDatabase } from "@/repositories/local/database";
import { createLocalRepositories } from "@/repositories/local";
import { addNoteCommand, changeAnomalyStatus, declareAnomaly } from "./anomalies.commands";
import { analyticsStats, dashboardStats } from "./analytics.service";
import { getPrototype } from "./prototypes.service";
import { getTest } from "./tests.service";

// A demo held on 10 January 2027: every engineering date must follow the real day, not 26/11/2026.
const now = () => "2027-01-10T09:00:00.000Z";
const setup = () => { const repos = createLocalRepositories(new LocalDatabase(null, now), now); return { repos, ctx: (id: string) => ({ repos, actor: USERS0.find(u => u.id === id)!, now }) }; };

describe("one clock for engineering", () => {
  it("a declared anomaly and its timeline are dated today", async () => {
    const s = setup();
    const r = await declareAnomaly(s.ctx("U-AWA"), { titre: "Bruit de roulement", proto: "AG-01", comp: "MOT-001", g: "Faible", resp: "Équipe essais" });
    expect(r.value.date).toBe("2027-01-10");
    expect(r.value.tl[0].d).toBe("2027-01-10");
  });
  it("a status change and an observation are dated today", async () => {
    const s = setup();
    const a = await changeAnomalyStatus(s.ctx("U-AWA"), "ANO-001", "Action corrective", "");
    expect(a.value.tl.at(-1)?.d).toBe("2027-01-10");
    await addNoteCommand(s.ctx("U-AWA"), "TES-001", "Observation du jour");
    expect((await s.repos.anomalies.listNotes())["TES-001"].at(-1)?.d).toBe("2027-01-10");
  });
  it("seeded anomalies, prototypes and tests are shifted to the demo day", async () => {
    const s = setup();
    expect((await s.repos.anomalies.list()).find(a => a.id === "ANO-001")?.date).toBe("2026-12-29");
    const offset = await s.repos.demo.seedOffsetDays();
    expect(offset).toBe(45);
    expect(getPrototype("AG-01", offset)?.date).toBe("2026-09-26"); // 2026-08-12 + 45 days
    expect(getTest("TES-003", offset)?.date).toBe("2026-12-30");
  });
  it("the 30-day window of the engineering dashboard is relative to today", () => {
    const anos = [{ id: "A", proto: "AG-01", s: "Déclarée", g: "Faible", date: "2027-01-01", tl: [] }] as never;
    expect(dashboardStats(anos, "30", "", 45, "2027-01-10").kpis.find(k => k[0] === "Essais réalisés")?.[1]).toBeGreaterThan(0);
  });
  it("the monthly analysis covers the last three months, not fixed 2026 months", () =>
    expect(analyticsStats([], "", "", 45, "2027-01-10").mois.map(m => m.m)).toEqual(["11/2026", "12/2026", "01/2027"]));
});
