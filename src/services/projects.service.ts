import { PROTOS } from "@/data/seed";
import { canManageProject, hasPermission } from "@/lib/access-simulation/permissions";
import { projectSchema, type ProjectInput } from "@/lib/validations/project";
import type { Project, ProjectRole, PrototypeLink, Task } from "@/types";
import { deny, DomainError, getOrFail, loadScope, parseInput, requirePermission, type CommandResult, type ServiceContext } from "./context";

export const projectProgress = (tasks: Pick<Task, "projectId" | "status">[], projectId: string): number => {
  const own = tasks.filter(t => t.projectId === projectId);
  return own.length ? Math.round((own.filter(t => t.status === "Terminée").length / own.length) * 100) : 0;
};

/** Project a prototype is attached to, with that project's progress computed from its tasks. */
export function linkedProjectProgress(prototypeId: string, links: PrototypeLink[], projects: Project[], tasks: Pick<Task, "projectId" | "status">[]) {
  const project = projects.find(p => p.id === links.find(l => l.prototypeId === prototypeId)?.projectId);
  return project ? { project, progress: projectProgress(tasks, project.id) } : undefined;
}

export async function createProject(ctx: ServiceContext, input: ProjectInput): Promise<CommandResult<Project>> {
  requirePermission(ctx, "project:create");
  const data = parseInput(projectSchema, input);
  if (data.ownerId !== ctx.actor.id && ctx.actor.systemRole !== "ADMIN") deny(ctx);
  const owner = await getOrFail(ctx.repos.users.get(data.ownerId), "Chef de projet");
  if (!hasPermission(owner, "project:manage")) throw new DomainError("Le chef de projet choisi n’a pas le rôle permettant de gérer un projet.");
  const project = await ctx.repos.projects.create({
    name: data.name, description: data.description, status: "Planifié", priority: data.priority, ownerId: owner.id,
    startDate: data.startDate, dueDate: data.dueDate, ...(data.departmentId ? { departmentId: data.departmentId } : {}),
  });
  const memberIds = [...new Set(data.memberIds)].filter(id => id !== owner.id);
  await ctx.repos.projects.addMember({ projectId: project.id, userId: owner.id, projectRole: "Chef de projet" });
  for (const userId of memberIds) await ctx.repos.projects.addMember({ projectId: project.id, userId, projectRole: "Contributeur" });
  // The owner is notified through memberIds only when someone else created the project for them.
  return { value: project, events: [{ type: "project.created", actorId: ctx.actor.id, at: ctx.now(), project, memberIds: owner.id === ctx.actor.id ? memberIds : [owner.id, ...memberIds] }] };
}

export async function addProjectMember(ctx: ServiceContext, projectId: string, userId: string, role: ProjectRole = "Contributeur"): Promise<CommandResult<void>> {
  const project = await getOrFail(ctx.repos.projects.get(projectId), "Projet");
  if (!canManageProject(ctx.actor, projectId, await loadScope(ctx.repos))) deny(ctx);
  const member = await getOrFail(ctx.repos.users.get(userId), "Collaborateur");
  if (!member.active) throw new DomainError("Ce collaborateur est inactif.");
  if ((await ctx.repos.projects.listMembers()).some(m => m.projectId === projectId && m.userId === userId)) throw new DomainError("Ce collaborateur participe déjà au projet.");
  await ctx.repos.projects.addMember({ projectId, userId, projectRole: role });
  return { value: undefined, events: [{ type: "project.member_added", actorId: ctx.actor.id, at: ctx.now(), project, userId }] };
}

export async function linkPrototype(ctx: ServiceContext, prototypeId: string, projectId: string): Promise<CommandResult<void>> {
  requirePermission(ctx, "prototype:link");
  if (!PROTOS.some(p => p.id === prototypeId)) throw new DomainError("Prototype introuvable.");
  const project = await getOrFail(ctx.repos.projects.get(projectId), "Projet");
  const scope = await loadScope(ctx.repos);
  if (!canManageProject(ctx.actor, projectId, scope)) deny(ctx);
  const current = (await ctx.repos.projects.listPrototypeLinks()).find(l => l.prototypeId === prototypeId);
  if (current?.projectId === projectId) return { value: undefined, events: [] };
  const source = current ? await ctx.repos.projects.get(current.projectId) : undefined;
  if (source && !canManageProject(ctx.actor, source.id, scope)) deny(ctx);
  await ctx.repos.projects.linkPrototype({ prototypeId, projectId });
  const at = ctx.now();
  return { value: undefined, events: [
    ...(source ? [{ type: "project.prototype_unlinked" as const, actorId: ctx.actor.id, at, project: source, prototypeId }] : []),
    { type: "project.prototype_linked", actorId: ctx.actor.id, at, project, prototypeId }] };
}

export async function unlinkPrototype(ctx: ServiceContext, prototypeId: string): Promise<CommandResult<void>> {
  requirePermission(ctx, "prototype:link");
  const link = (await ctx.repos.projects.listPrototypeLinks()).find(l => l.prototypeId === prototypeId);
  if (!link) throw new DomainError("Ce prototype n’est rattaché à aucun projet.");
  const project = await getOrFail(ctx.repos.projects.get(link.projectId), "Projet");
  if (!canManageProject(ctx.actor, project.id, await loadScope(ctx.repos))) deny(ctx);
  await ctx.repos.projects.unlinkPrototype(prototypeId);
  return { value: undefined, events: [{ type: "project.prototype_unlinked", actorId: ctx.actor.id, at: ctx.now(), project, prototypeId }] };
}
