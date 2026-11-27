import { describe, expect, it } from "vitest";
import { myTasks, overdueTasks, pendingValidationsFor, projectsAtRisk, teamWorkload, visibleProjects } from "./space.service";
import { seedDocument } from "@/repositories/local/database";
import { SEED_ANCHOR } from "@/lib/demo-clock";
import { USERS0 } from "@/data/seed-org";

const s = seedDocument(SEED_ANCHOR); // deterministic: the seed is anchored on 2026-11-26
const u = (role: string) => USERS0.find(x => x.systemRole === role)!;

describe("space selectors", () => {
  it("overdue excludes done tasks", () => {
    const o = overdueTasks(s.tasks, "2026-11-26");
    expect(o.length).toBeGreaterThan(0);
    expect(o.every(t => t.status !== "Terminée" && t.dueDate < "2026-11-26")).toBe(true);
  });
  it("technician sees only member projects", () => {
    const tech = u("TECHNICIAN"); const member = new Set(s.projectMembers.filter(m => m.userId === tech.id).map(m => m.projectId));
    const v = visibleProjects(s, tech);
    expect(v.length).toBeLessThan(s.projects.length);
    expect(v.every(p => member.has(p.id) || p.ownerId === tech.id)).toBe(true);
  });
  it("director sees all projects and all pending validations", () => {
    expect(visibleProjects(s, u("DIRECTOR"))).toHaveLength(s.projects.length);
    expect(pendingValidationsFor(s, u("DIRECTOR"))).toHaveLength(s.validations.filter(v => v.status === "En attente" && v.subjectType === "task").length);
  });
  it("purchase approvals are never overridden: only the designated validator sees them", () => {
    expect(pendingValidationsFor(s, u("DIRECTOR")).some(v => v.subjectType === "purchase_request")).toBe(false);
    expect(pendingValidationsFor(s, u("FINANCE")).map(v => v.subjectId).sort()).toEqual(["DA-2026-002", "DA-2026-006"]);
  });
  it("validator sees only own pending validations", () =>
    expect(pendingValidationsFor(s, USERS0.find(x => x.id === "U-QUA")!).every(v => v.validatorId === "U-QUA" && v.status === "En attente")).toBe(true));
  it("team workload lists each team member", () => {
    const lead = u("TEAM_LEAD");
    expect(teamWorkload(s, lead.teamId!).length).toBe(s.users.filter(x => x.teamId === lead.teamId).length);
  });
  it("my tasks are the ones I am responsible for", () => expect(myTasks(s, "U-KOF").every(t => t.assigneeId === "U-KOF")).toBe(true));
  it("projects at risk include the urgent near-deadline project", () => expect(projectsAtRisk(s, "2026-11-26").map(p => p.id)).toContain("PRJ-02"));
});
