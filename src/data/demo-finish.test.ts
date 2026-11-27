import { describe, expect, it } from "vitest";
import { ANOS0 } from "./seed";
import { PROJECTS0, PROTOTYPE_LINKS0, TASKS0 } from "./seed-work";
import { linkedProjectProgress, projectProgress } from "@/services/projects.service";

describe("demo finish", () => {
  // A1: corrective actions are only real corrective tasks; the generated placeholder actions are gone.
  it("D1: seeded anomalies carry no generated corrective action", () =>
    expect(ANOS0.filter(a => a.act.length).map(a => a.id)).toEqual([]));
  // B1: the fixed technical progress stays, and the computed progress of the linked project is shown next to it.
  it("D3: a linked prototype exposes its project and the project's computed progress", () => {
    const r = linkedProjectProgress("AG-02", PROTOTYPE_LINKS0, PROJECTS0, TASKS0);
    expect(r?.project.id).toBe("PRJ-02");
    expect(r?.progress).toBe(projectProgress(TASKS0, "PRJ-02"));
  });
  it("D3: an unlinked prototype has no project progress", () =>
    expect(linkedProjectProgress("AG-03", PROTOTYPE_LINKS0, PROJECTS0, TASKS0)).toBeUndefined());
});
