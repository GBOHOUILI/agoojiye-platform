import { requirePermission, type CommandResult, type ServiceContext } from "./context";
export async function resetDemo(ctx: ServiceContext): Promise<CommandResult<void>> {
  requirePermission(ctx, "admin:access");
  await ctx.repos.demo.reset();
  return { value: undefined, events: [{ type: "demo.reset", actorId: ctx.actor.id, at: ctx.now() }] };
}
