import { canAssignTo, canSeeProject, canUpdateTask, hasPermission } from "@/lib/access-simulation/permissions";
import { taskSchema, type TaskInput } from "@/lib/validations/task";
import type { DomainEvent } from "@/domain/events";
import type { Ano, PrototypeLink, Task, TaskStatus } from "@/types";
import { deny, DomainError, getOrFail, loadScope, parseInput, requirePermission, type CommandResult, type ServiceContext } from "./context";

// "En validation" is only reachable through submitForValidation; "Terminée" only when no validator is set.
export const TASK_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  "À faire": ["En cours", "Bloquée"], "En cours": ["Bloquée", "Terminée"], Bloquée: ["En cours"], "En validation": [], Terminée: [],
};
export const allowedTransitions = (t: Task): TaskStatus[] => TASK_TRANSITIONS[t.status].filter(s => !(s === "Terminée" && t.validatorId));
export const isOverdue = (t: Task, today: string) => t.status !== "Terminée" && t.dueDate < today;

export async function createTask(ctx: ServiceContext, input: TaskInput): Promise<CommandResult<Task>> {
  requirePermission(ctx, "task:create");
  const data = parseInput(taskSchema, input);
  const scope = await loadScope(ctx.repos);
  await getOrFail(ctx.repos.projects.get(data.projectId), "Projet");
  if (!canSeeProject(ctx.actor, data.projectId, scope) && ctx.actor.systemRole !== "ADMIN") deny(ctx);
  const assignee = data.assigneeId ? await getOrFail(ctx.repos.users.get(data.assigneeId), "Responsable") : undefined;
  if (assignee && !assignee.active) throw new DomainError("Ce collaborateur est inactif : impossible de lui attribuer une tâche.");
  if (assignee && !canAssignTo(ctx.actor, data, assignee, scope)) deny(ctx);
  if (data.validatorId) {
    const validator = await getOrFail(ctx.repos.users.get(data.validatorId), "Validateur");
    if (!validator.active) throw new DomainError("Ce validateur est inactif.");
    if (!hasPermission(validator, "validation:decide")) throw new DomainError("Le validateur choisi n’a pas le droit de valider (rôle sans validation).");
  }
  if (data.anomalyId) await checkCorrectiveLink(ctx, data.anomalyId, data.projectId);
  const task = await ctx.repos.tasks.create({
    projectId: data.projectId, title: data.title, description: data.description, status: "À faire", priority: data.priority,
    dueDate: data.dueDate, progress: 0, authorId: ctx.actor.id,
    ...(data.assigneeId ? { assigneeId: data.assigneeId } : {}), ...(data.validatorId ? { validatorId: data.validatorId } : {}),
    ...(data.anomalyId ? { anomalyId: data.anomalyId } : {}),
  });
  const at = ctx.now(), events: DomainEvent[] = [{ type: "task.created", actorId: ctx.actor.id, at, task }];
  if (task.assigneeId) events.push({ type: "task.assigned", actorId: ctx.actor.id, at, task });
  return { value: task, events };
}

// A corrective task belongs to the project of the anomaly's prototype.
export const correctiveProjectId = (a: Ano, links: PrototypeLink[]) => links.find(l => l.prototypeId === a.proto)?.projectId;
export const correctiveTasksOf = (tasks: Task[], anomalyId: string) => tasks.filter(t => t.anomalyId === anomalyId);

async function checkCorrectiveLink(ctx: ServiceContext, anomalyId: string, projectId: string) {
  const a = (await ctx.repos.anomalies.list()).find(x => x.id === anomalyId);
  if (!a) throw new DomainError("Anomalie introuvable.");
  if (a.s === "Résolue") throw new DomainError(`L’anomalie ${anomalyId} est résolue : aucune tâche corrective ne peut plus lui être ajoutée.`);
  const expected = correctiveProjectId(a, await ctx.repos.projects.listPrototypeLinks());
  if (!expected) throw new DomainError(`Le prototype ${a.proto} n’est rattaché à aucun projet : rattachez-le avant de créer une tâche corrective.`);
  if (expected !== projectId) throw new DomainError(`Une tâche corrective de ${anomalyId} doit appartenir au projet ${expected}.`);
}

export async function assignTask(ctx: ServiceContext, taskId: string, assigneeId: string): Promise<CommandResult<Task>> {
  requirePermission(ctx, "task:assign");
  const task = await getOrFail(ctx.repos.tasks.get(taskId), "Tâche");
  const assignee = await getOrFail(ctx.repos.users.get(assigneeId), "Collaborateur");
  if (!assignee.active) throw new DomainError("Ce collaborateur est inactif : impossible de lui attribuer une tâche.");
  if (!canAssignTo(ctx.actor, task, assignee, await loadScope(ctx.repos))) deny(ctx);
  if (task.status === "Terminée") throw new DomainError("Une tâche terminée ne peut plus être réattribuée.");
  if (task.status === "En validation") throw new DomainError("Tâche en attente de validation : attendez la décision avant de la réattribuer.");
  if (task.assigneeId === assigneeId) return { value: task, events: [] };
  const updated = await ctx.repos.tasks.update(taskId, { assigneeId });
  return { value: updated, events: [{ type: "task.assigned", actorId: ctx.actor.id, at: ctx.now(), task: updated, previousAssigneeId: task.assigneeId }] };
}

export async function changeTaskStatus(ctx: ServiceContext, taskId: string, to: TaskStatus): Promise<CommandResult<Task>> {
  const task = await getOrFail(ctx.repos.tasks.get(taskId), "Tâche");
  if (!canUpdateTask(ctx.actor, task, await loadScope(ctx.repos))) deny(ctx);
  if (!allowedTransitions(task).includes(to)) throw new DomainError(`Transition impossible : ${task.status} → ${to}.`);
  const updated = await ctx.repos.tasks.update(taskId, { status: to, ...(to === "Terminée" ? { progress: 100 } : {}) });
  return { value: updated, events: [{ type: "task.status_changed", actorId: ctx.actor.id, at: ctx.now(), task: updated, from: task.status }] };
}

// Deliberately emits no event: progress nudges would flood the activity log.
export async function updateTaskProgress(ctx: ServiceContext, taskId: string, progress: number): Promise<CommandResult<Task>> {
  const task = await getOrFail(ctx.repos.tasks.get(taskId), "Tâche");
  if (!canUpdateTask(ctx.actor, task, await loadScope(ctx.repos))) deny(ctx);
  if (task.status === "Terminée" || task.status === "En validation") throw new DomainError("L’avancement de cette tâche ne peut plus être modifié.");
  const value = Math.round(Math.min(100, Math.max(0, progress)));
  return { value: await ctx.repos.tasks.update(taskId, { progress: value }), events: [] };
}
