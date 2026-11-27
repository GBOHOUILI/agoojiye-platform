import { describe, expect, it } from "vitest";
import { DEFAULT_USER_ID, DEPARTMENTS0, TEAMS0, USERS0 } from "./seed-org";
import { NOTIFICATIONS0, PROJECT_MEMBERS0, PROJECTS0, PROTOTYPE_LINKS0, TASKS0, VALIDATIONS0 } from "./seed-work";
import { PROTOS, TODAY } from "./seed";
import { SYSTEM_ROLES } from "@/types";

const ids = <T extends { id: string }>(xs: T[]) => new Set(xs.map(x => x.id));
const U = ids(USERS0), P = ids(PROJECTS0), D = ids(DEPARTMENTS0), T = ids(TEAMS0);

describe("seed v2 consistency", () => {
  it("covers every system role", () => SYSTEM_ROLES.forEach(r => expect(USERS0.some(u => u.systemRole === r)).toBe(true)));
  it("default user exists", () => expect(U.has(DEFAULT_USER_ID)).toBe(true));
  it("users reference existing org units and managers", () => USERS0.forEach(u => {
    expect(D.has(u.departmentId)).toBe(true);
    if (u.teamId) expect(T.has(u.teamId)).toBe(true);
    if (u.managerId) expect(U.has(u.managerId)).toBe(true);
  }));
  it("teams belong to existing departments", () => TEAMS0.forEach(t => expect(D.has(t.departmentId)).toBe(true)));
  it("project owners and members exist", () => {
    PROJECTS0.forEach(p => expect(U.has(p.ownerId)).toBe(true));
    PROJECT_MEMBERS0.forEach(m => { expect(P.has(m.projectId)).toBe(true); expect(U.has(m.userId)).toBe(true); });
  });
  it("prototype links are optional and unique", () => {
    const protos = PROTOTYPE_LINKS0.map(l => l.prototypeId);
    expect(new Set(protos).size).toBe(protos.length);
    expect(PROTOS.some(p => !protos.includes(p.id))).toBe(true);
  });
  it("tasks reference existing project and users", () => TASKS0.forEach(t => {
    expect(P.has(t.projectId)).toBe(true); expect(U.has(t.authorId)).toBe(true);
    if (t.assigneeId) expect(U.has(t.assigneeId)).toBe(true);
    if (t.validatorId) expect(U.has(t.validatorId)).toBe(true);
  }));
  it("tasks in validation have exactly one pending request", () => TASKS0.filter(t => t.status === "En validation").forEach(t =>
    expect(VALIDATIONS0.filter(v => v.subjectId === t.id && v.status === "En attente")).toHaveLength(1)));
  it("has overdue tasks for the demo", () => expect(TASKS0.filter(t => t.dueDate < TODAY && t.status !== "Terminée").length).toBeGreaterThanOrEqual(4));
  it("users take part in several projects", () => {
    const count = new Map<string, number>(); PROJECT_MEMBERS0.forEach(m => count.set(m.userId, (count.get(m.userId) ?? 0) + 1));
    expect([...count.values()].filter(n => n >= 2).length).toBeGreaterThanOrEqual(2);
  });
  it("a planned project has no started task", () => PROJECTS0.filter(p => p.status === "Planifié").forEach(p =>
    expect(TASKS0.filter(t => t.projectId === p.id && t.status !== "À faire").map(t => t.id)).toEqual([])));
  it("a task is created before its due date and updated after its creation", () => TASKS0.forEach(t => {
    expect(t.createdAt.slice(0, 10) <= t.dueDate, `${t.id} created after due date`).toBe(true);
    expect(t.createdAt <= t.updatedAt, `${t.id} updated before creation`).toBe(true);
  }));
  it("tasks are not all created on the same day", () => expect(new Set(TASKS0.map(t => t.createdAt)).size).toBeGreaterThan(10));
  it("nobody validates a task they wrote", () => TASKS0.filter(t => t.validatorId).forEach(t => expect(t.validatorId, t.id).not.toBe(t.authorId)));
  it("validators hold the validation permission", () => TASKS0.filter(t => t.validatorId).forEach(t =>
    expect(["TEAM_LEAD", "PROJECT_MANAGER", "ENGINEER", "QUALITY_MANAGER", "DIRECTOR"]).toContain(USERS0.find(u => u.id === t.validatorId)!.systemRole)));
  it("notifications target existing users", () => NOTIFICATIONS0.forEach(n => expect(U.has(n.recipientId)).toBe(true)));
});
