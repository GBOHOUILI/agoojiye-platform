import { describe, expect, it } from "vitest";
import { canAssignTo, canDecideValidation, canManageProject, canUpdateTask, hasPermission, ROLE_PERMISSIONS } from "./permissions";
import { routePermission } from "./routes";
import { SYSTEM_ROLES, type Task, type User } from "@/types";

const u = (id: string, systemRole: User["systemRole"], teamId?: string): User =>
  ({ id, firstName: id, lastName: "", email: "", systemRole, jobTitle: "", departmentId: "D1", teamId, active: true });
const d = { users: [], projects: [{ id: "P1", ownerId: "pm" } as never], projectMembers: [{ projectId: "P1", userId: "tl", projectRole: "Contributeur" as const }] };
const task = { id: "T1", projectId: "P1", assigneeId: "tech" } as Task;

describe("access simulation", () => {
  it("defines permissions for every role", () => SYSTEM_ROLES.forEach(r => expect(ROLE_PERMISSIONS[r].length).toBeGreaterThan(0)));
  it("technician cannot create tasks", () => expect(hasPermission(u("t", "TECHNICIAN"), "task:create")).toBe(false));
  it("PM manages only own projects", () => {
    expect(canManageProject(u("pm", "PROJECT_MANAGER"), "P1", d)).toBe(true);
    expect(canManageProject(u("pm2", "PROJECT_MANAGER"), "P1", d)).toBe(false);
  });
  it("team lead assigns only within own team", () => {
    expect(canAssignTo(u("tl", "TEAM_LEAD", "E"), task, u("x", "TECHNICIAN", "E"), d)).toBe(true);
    expect(canAssignTo(u("tl", "TEAM_LEAD", "E"), task, u("y", "TECHNICIAN", "P"), d)).toBe(false);
  });
  it("assignee updates own task, others cannot", () => {
    expect(canUpdateTask(u("tech", "TECHNICIAN"), task, d)).toBe(true);
    expect(canUpdateTask(u("other", "TECHNICIAN"), task, d)).toBe(false);
  });
  it("only designated validator or override decides", () => {
    const v = { validatorId: "q" } as never;
    expect(canDecideValidation(u("q", "QUALITY_MANAGER"), v)).toBe(true);
    expect(canDecideValidation(u("e", "ENGINEER"), v)).toBe(false);
    expect(canDecideValidation(u("dir", "DIRECTOR"), v)).toBe(true);
  });
  it("maps routes by longest prefix", () => {
    expect(routePermission("/anomalies/ANO-001")).toBe("engineering:read");
    expect(routePermission("/admin")).toBe("admin:access");
    expect(routePermission("/espace")).toBeUndefined();
  });
});
