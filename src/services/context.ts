import type { ZodType, ZodTypeDef } from "zod";
import type { DomainEvent } from "@/domain/events";
import { hasPermission, type Permission, type ScopeData } from "@/lib/access-simulation/permissions";
import { ROLE_LABELS } from "@/lib/access-simulation/roles";
import type { Repositories } from "@/repositories/types";
import type { User } from "@/types";

export interface ServiceContext { repos: Repositories; actor: User; now: () => string }
export interface CommandResult<T> { value: T; events: DomainEvent[] }
/** Business error with a French message meant to be shown as-is to the user. */
export class DomainError extends Error {}

export const deny = (ctx: ServiceContext): never => { throw new DomainError(`Action non autorisée pour le profil ${ROLE_LABELS[ctx.actor.systemRole]} (simulation).`); };
export const requirePermission = (ctx: ServiceContext, p: Permission) => { if (!hasPermission(ctx.actor, p)) deny(ctx); };

export function parseInput<O, I>(schema: ZodType<O, ZodTypeDef, I>, input: I): O {
  const r = schema.safeParse(input);
  if (!r.success) throw new DomainError(r.error.issues[0]?.message ?? "Saisie invalide.");
  return r.data;
}

export async function loadScope(repos: Repositories): Promise<ScopeData> {
  const [projects, projectMembers, users] = await Promise.all([repos.projects.list(), repos.projects.listMembers(), repos.users.list()]);
  return { projects, projectMembers, users };
}

export async function getOrFail<T>(p: Promise<T | undefined>, what: string): Promise<T> {
  const x = await p;
  if (!x) throw new DomainError(`${what} introuvable.`);
  return x;
}
