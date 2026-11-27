import { canSeeProject, hasPermission } from "@/lib/access-simulation/permissions";
import type { Project, ProjectMember, Task, User, ValidationRequest } from "@/types";
import { projectProgress } from "./projects.service";
import { isOverdue } from "./tasks.service";

type Data = { users: User[]; projects: Project[]; projectMembers: ProjectMember[]; tasks: Task[]; validations: ValidationRequest[] };
const DAY = 86_400_000;

export const myTasks = (s: Pick<Data, "tasks">, userId: string) => s.tasks.filter(t => t.assigneeId === userId);
export const overdueTasks = (tasks: Task[], today: string) => tasks.filter(t => isOverdue(t, today));
export const visibleProjects = (s: Data, user: User) => s.projects.filter(p => canSeeProject(user, p.id, s));

// Task validations may be overridden; purchase approvals never are (strict segregation of duties).
export const pendingValidationsFor = (s: Pick<Data, "validations">, user: User) =>
  s.validations.filter(v => v.status === "En attente" && (v.validatorId === user.id || (v.subjectType === "task" && hasPermission(user, "validation:override"))));

export const teamWorkload = (s: Pick<Data, "users" | "tasks">, teamId: string, today = "") =>
  s.users.filter(u => u.teamId === teamId).map(user => {
    const open = s.tasks.filter(t => t.assigneeId === user.id && t.status !== "Terminée");
    return { user, open: open.length, overdue: today ? open.filter(t => t.dueDate < today).length : 0 };
  });

// At risk: deadline within 14 days with < 70 % done, or at least two overdue tasks.
export function projectsAtRisk(s: Pick<Data, "projects" | "tasks">, today: string): Project[] {
  return s.projects.filter(p => {
    if (p.status === "Terminé") return false;
    const soon = (Date.parse(p.dueDate) - Date.parse(today)) / DAY < 14 && projectProgress(s.tasks, p.id) < 70;
    return soon || overdueTasks(s.tasks.filter(t => t.projectId === p.id), today).length >= 2;
  });
}
