import { hasPermission } from "@/lib/access-simulation/permissions";
import { userUpdateSchema, type UserUpdateInput } from "@/lib/validations/user";
import type { User } from "@/types";
import { deny, DomainError, getOrFail, parseInput, requirePermission, type CommandResult, type ServiceContext } from "./context";
export { displayName } from "@/lib/people";

export const directReports = (users: User[], managerId: string) => users.filter(u => u.managerId === managerId);

function createsCycle(users: User[], userId: string, managerId: string): boolean {
  const byId = new Map(users.map(u => [u.id, u]));
  for (let cur: string | undefined = managerId, guard = 0; cur && guard <= users.length; cur = byId.get(cur)?.managerId, guard++) {
    if (cur === userId) return true;
  }
  return false;
}

export async function updateUser(ctx: ServiceContext, userId: string, patch: UserUpdateInput): Promise<CommandResult<User>> {
  requirePermission(ctx, "org:manage");
  const data = parseInput(userUpdateSchema, patch);
  const user = await getOrFail(ctx.repos.users.get(userId), "Collaborateur");
  const changes: string[] = [];
  const next: Partial<User> = {};
  if (data.systemRole && data.systemRole !== user.systemRole) {
    if (!hasPermission(ctx.actor, "admin:access")) deny(ctx);
    const admins = (await ctx.repos.users.list()).filter(u => u.active && u.systemRole === "ADMIN");
    if (user.systemRole === "ADMIN" && admins.length <= 1) throw new DomainError("Impossible : c’est le dernier administrateur de la plateforme.");
    next.systemRole = data.systemRole; changes.push("rôle système");
  }
  if (data.jobTitle !== undefined && data.jobTitle !== user.jobTitle) { next.jobTitle = data.jobTitle; changes.push("fonction"); }
  if (data.teamId !== undefined && (data.teamId ?? undefined) !== user.teamId) { next.teamId = data.teamId ?? undefined; changes.push("équipe"); }
  if (data.managerId !== undefined && (data.managerId ?? undefined) !== user.managerId) {
    if (data.managerId === userId) throw new DomainError("Un collaborateur ne peut pas être son propre responsable.");
    if (data.managerId && createsCycle(await ctx.repos.users.list(), userId, data.managerId)) throw new DomainError("Ce rattachement créerait une boucle hiérarchique.");
    next.managerId = data.managerId ?? undefined; changes.push("responsable");
  }
  if (!changes.length) return { value: user, events: [] };
  const updated = await ctx.repos.users.update(userId, next);
  return { value: updated, events: [{ type: "user.updated", actorId: ctx.actor.id, at: ctx.now(), user: updated, changes }] };
}
