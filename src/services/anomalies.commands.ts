import { todayIso } from "@/lib/clock";
import { displayName } from "@/lib/people";
import { anomalySchema, justificationSchema, noteSchema, type AnomalyInput } from "@/lib/validations/anomaly";
import { componentsOf } from "./components.service";
import { prototypeExists } from "./prototypes.service";
import { testExists } from "./tests.service";
import type { Ano, Statut } from "@/types";
import { applyStatut, buildAnomaly, nextStatut } from "./anomalies.service";
import { DomainError, parseInput, requirePermission, type CommandResult, type ServiceContext } from "./context";

// Business day of the command, in Benin time, from the injected clock.
const day = (ctx: ServiceContext) => todayIso(new Date(ctx.now()));

export async function declareAnomaly(ctx: ServiceContext, i: AnomalyInput, prebuilt?: Ano): Promise<CommandResult<Ano>> {
  requirePermission(ctx, "incident:declare");
  // The form already checks these, but the rule must hold for any caller.
  const data = parseInput(anomalySchema, i);
  if (!prototypeExists(data.proto)) throw new DomainError("Prototype introuvable.");
  if (!componentsOf(data.proto).some(c => c.ref === data.comp)) throw new DomainError(`Le composant ${data.comp} n’appartient pas au prototype ${data.proto}.`);
  if (data.respTeamId) {
    // Engineering teams own anomalies; the displayed owner always follows the chosen team.
    const team = (await ctx.repos.teams.list()).find(t => t.id === data.respTeamId && t.departmentId === "D-ENG");
    if (!team) throw new DomainError("Équipe responsable introuvable.");
    data.resp = team.name;
  }
  const existing = await ctx.repos.anomalies.list();
  // The prebuilt id comes from a possibly stale snapshot (double submit, other tab): re-number rather than overwrite.
  const built = prebuilt && !existing.some(a => a.id === prebuilt.id) ? prebuilt
    : { ...(prebuilt ?? buildAnomaly(existing, data, displayName(ctx.actor), ctx.actor.id, day(ctx))), id: buildAnomaly(existing, data).id };
  const anomaly = { ...built, resp: data.resp, ...(data.respTeamId ? { respTeamId: data.respTeamId } : {}) };
  await ctx.repos.anomalies.save(anomaly);
  return { value: anomaly, events: [{ type: "incident.reported", actorId: ctx.actor.id, at: ctx.now(), anomaly }] };
}

export async function changeAnomalyStatus(ctx: ServiceContext, id: string, s: Statut, note: string): Promise<CommandResult<Ano>> {
  requirePermission(ctx, "incident:update");
  const current = (await ctx.repos.anomalies.list()).find(a => a.id === id);
  if (!current) throw new DomainError("Anomalie introuvable.");
  if (nextStatut(current) !== s) throw new DomainError(`Transition impossible : ${current.s} → ${s}.`);
  const text = s === "Résolue" ? parseInput(justificationSchema, note) : note;
  const anomaly = applyStatut(current, s, text, displayName(ctx.actor), day(ctx));
  await ctx.repos.anomalies.save(anomaly);
  return { value: anomaly, events: [{ type: "incident.status_changed", actorId: ctx.actor.id, at: ctx.now(), anomaly, from: current.s }] };
}

export async function addNoteCommand(ctx: ServiceContext, targetId: string, text: string): Promise<CommandResult<void>> {
  requirePermission(ctx, "note:add");
  text = parseInput(noteSchema, text);
  if (!testExists(targetId) && !(await ctx.repos.anomalies.list()).some(a => a.id === targetId)) throw new DomainError("Essai ou anomalie introuvable.");
  await ctx.repos.anomalies.addNote(targetId, { d: day(ctx), t: text, by: displayName(ctx.actor) });
  return { value: undefined, events: [{ type: "note.added", actorId: ctx.actor.id, at: ctx.now(), targetId, text }] };
}
