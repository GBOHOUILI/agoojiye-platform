import { DomainError, type ServiceContext } from "./context";
export async function markRead(ctx: ServiceContext, id: string) {
  const n = (await ctx.repos.notifications.list()).find(x => x.id === id);
  if (!n) throw new DomainError("Notification introuvable.");
  if (n.recipientId !== ctx.actor.id) throw new DomainError("Cette notification ne vous est pas destinée.");
  await ctx.repos.notifications.markRead(id, ctx.now());
}
export const markAllRead = (ctx: ServiceContext) => ctx.repos.notifications.markAllRead(ctx.actor.id, ctx.now());
