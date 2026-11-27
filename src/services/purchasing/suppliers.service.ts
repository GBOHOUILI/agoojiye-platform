import { supplierPatchSchema, supplierSchema, type SupplierInput } from "@/lib/validations/purchasing";
import type { Supplier } from "@/types";
import { getOrFail, parseInput, requirePermission, type CommandResult, type ServiceContext } from "../context";

export async function createSupplier(ctx: ServiceContext, input: SupplierInput): Promise<CommandResult<Supplier>> {
  requirePermission(ctx, "supplier:manage");
  const data = parseInput(supplierSchema, input);
  const supplier = await ctx.repos.purchasing.suppliers.create({ ...data, status: "Actif" });
  return { value: supplier, events: [{ type: "supplier.created", actorId: ctx.actor.id, at: ctx.now(), supplier }] };
}

export async function updateSupplier(ctx: ServiceContext, id: string, patch: Partial<SupplierInput> & { status?: Supplier["status"] }): Promise<CommandResult<Supplier>> {
  requirePermission(ctx, "supplier:manage");
  const data = parseInput(supplierPatchSchema, patch);
  await getOrFail(ctx.repos.purchasing.suppliers.get(id), "Fournisseur");
  const supplier = await ctx.repos.purchasing.suppliers.update(id, data);
  return { value: supplier, events: [{ type: "supplier.updated", actorId: ctx.actor.id, at: ctx.now(), supplier }] };
}
