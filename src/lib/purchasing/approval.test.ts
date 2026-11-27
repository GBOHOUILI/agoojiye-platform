import { describe, expect, it } from "vitest";
import { approvalPlan, missingSteps } from "./approval";
import { USERS0 } from "@/data/seed-org";
import { PROJECTS0 } from "@/data/seed-work";

const dir = { users: USERS0, projects: PROJECTS0 };
const plan = (amountHT: number, requesterId: string, projectId?: string) => approvalPlan({ amountHT, requesterId, projectId }, dir);

describe("approvalPlan", () => {
  it("below 500 000: project owner only", () => expect(plan(499_999, "U-KOF", "PRJ-02")).toEqual({ ok: true, steps: [{ step: "Responsable", validatorId: "U-NAD" }] }));
  it("without project: requester's manager", () => expect(plan(100_000, "U-KOF")).toEqual({ ok: true, steps: [{ step: "Responsable", validatorId: "U-SEG" }] }));
  it("adds Finance from 500 000 and Direction from 5 000 000 HT", () => {
    expect(plan(500_000, "U-KOF", "PRJ-02")).toEqual({ ok: true, steps: [{ step: "Responsable", validatorId: "U-NAD" }, { step: "Finance", validatorId: "U-FIN" }] });
    expect(plan(5_000_000, "U-KOF", "PRJ-02")).toEqual({ ok: true, steps: [{ step: "Responsable", validatorId: "U-NAD" }, { step: "Finance", validatorId: "U-FIN" }, { step: "Direction", validatorId: "U-DIR" }] });
  });
  it("requester never validates: project owner requesting goes to their manager", () =>
    expect(plan(100_000, "U-NAD", "PRJ-02")).toEqual({ ok: true, steps: [{ step: "Responsable", validatorId: "U-DIR" }] }));
  it("one decision per person: Responsable merged into Direction", () =>
    expect(plan(6_000_000, "U-NAD", "PRJ-02")).toEqual({ ok: true, steps: [{ step: "Finance", validatorId: "U-FIN" }, { step: "Direction", validatorId: "U-DIR" }] }));
  it("refuses when no eligible validator exists", () => {
    expect(plan(600_000, "U-FIN")).toEqual({ ok: false, error: "Aucun validateur éligible pour l’étape Finance." });
    expect(plan(100_000, "U-DIR")).toEqual({ ok: false, error: "Aucun validateur éligible pour l’étape Responsable." });
  });
  it("ignores inactive validators", () => {
    const users = USERS0.map(u => (u.id === "U-NAD" ? { ...u, active: false } : u));
    expect(approvalPlan({ amountHT: 100_000, requesterId: "U-KOF", projectId: "PRJ-02" }, { users, projects: PROJECTS0 }))
      .toEqual({ ok: false, error: "Aucun validateur éligible pour l’étape Responsable." });
  });
  it("missingSteps keeps only steps not yet approved", () =>
    expect(missingSteps([{ step: "Responsable", validatorId: "a" }, { step: "Finance", validatorId: "b" }], [{ step: "Responsable" }])).toEqual([{ step: "Finance", validatorId: "b" }]));
});
