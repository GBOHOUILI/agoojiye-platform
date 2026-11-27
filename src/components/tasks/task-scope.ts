import { canAssignTo, canManageProject, canSeeProject, hasPermission } from "@/lib/access-simulation/permissions";
import type { Project, ProjectMember, Task, User } from "@/types";

type S = { users: User[]; projects: Project[]; projectMembers: ProjectMember[]; tasks: Task[] };
export type TaskScope = "mine" | "team" | "projects" | "all";

export function scopesFor(me: User): { id: TaskScope; label: string }[] {
  const out: { id: TaskScope; label: string }[] = [{ id: "mine", label: "Assignées à moi" }];
  if (me.systemRole === "TEAM_LEAD" && me.teamId) out.push({ id: "team", label: "Mon équipe" });
  out.push({ id: "projects", label: "Mes projets" });
  if (hasPermission(me, "project:read_all") || me.systemRole === "ADMIN") out.push({ id: "all", label: "Toutes" });
  return out;
}
export const defaultScope = (me: User): TaskScope =>
  hasPermission(me, "project:read_all") || me.systemRole === "ADMIN" ? "all" : me.systemRole === "PROJECT_MANAGER" ? "projects" : me.systemRole === "TEAM_LEAD" ? "team" : "mine";

const isMember = (s: S, me: User, projectId: string) => s.projects.some(p => p.id === projectId && p.ownerId === me.id) || s.projectMembers.some(m => m.projectId === projectId && m.userId === me.id);

export function tasksInScope(s: S, me: User, scope: TaskScope): Task[] {
  switch (scope) {
    case "mine": return s.tasks.filter(t => t.assigneeId === me.id);
    case "team": { const team = new Set(s.users.filter(u => u.teamId && u.teamId === me.teamId).map(u => u.id)); return s.tasks.filter(t => t.assigneeId && team.has(t.assigneeId)); }
    case "projects": return s.tasks.filter(t => isMember(s, me, t.projectId));
    case "all": return s.tasks.filter(t => canSeeProject(me, t.projectId, s) || me.systemRole === "ADMIN");
  }
}

/** Projects where the profile may create a task. */
export const creatableProjects = (s: S, me: User) =>
  s.projects.filter(p => p.status !== "Terminé" && (canManageProject(me, p.id, s) || (me.systemRole !== "PROJECT_MANAGER" && isMember(s, me, p.id))));

/** Assignee candidates: project members (or own team for a team lead) the profile may assign to. */
export const assigneeCandidates = (s: S, me: User, projectId: string) =>
  s.users.filter(u => u.active && canAssignTo(me, { projectId }, u, s) && (isMember(s, u, projectId) || (!!me.teamId && u.teamId === me.teamId)));

export const validatorCandidates = (s: S) => s.users.filter(u => u.active && hasPermission(u, "validation:decide") && u.systemRole !== "ADMIN");
