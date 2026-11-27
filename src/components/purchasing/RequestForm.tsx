"use client";
import { Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useDemoStore } from "@/hooks/demo-store";
import { approvalPlan } from "@/lib/purchasing/approval";
import { requestDraftSchema, type RequestDraftInput } from "@/lib/validations/purchasing";
import { nameOf } from "@/lib/people";
import { visibleProjects } from "@/services/space.service";
import { URGENCIES, type PurchaseRequest, type Urgency } from "@/types";
import { Money } from "./Money";

type Line = { designation: string; itemRef: string; quantity: string; unit: string; estimatedUnitPriceHT: string };
const emptyLine = (): Line => ({ designation: "", itemRef: "", quantity: "1", unit: "pièce", estimatedUnitPriceHT: "" });
const toInt = (v: string) => (v.trim() === "" ? NaN : Number(v.replace(/\s/g, "")));

export function RequestForm({ request, onDone }: { request?: PurchaseRequest; onDone: (id: string) => void }) {
  const s = useDemoStore(); const me = s.currentUser;
  const [f, setF] = useState({ title: request?.title ?? "", justification: request?.justification ?? "", urgency: (request?.urgency ?? "Normale") as Urgency, neededBy: request?.neededBy ?? "", projectId: request?.projectId ?? "", taskId: request?.taskId ?? "" });
  const [lines, setLines] = useState<Line[]>(request ? request.lines.map(l => ({ designation: l.designation, itemRef: l.itemRef ?? "", quantity: String(l.quantity), unit: l.unit, estimatedUnitPriceHT: String(l.estimatedUnitPriceHT) })) : [emptyLine()]);
  const [errors, setErrors] = useState<string[]>([]), [busy, setBusy] = useState(false);
  const projects = visibleProjects(s, me), tasks = s.tasks.filter(t => t.projectId === f.projectId && t.status !== "Terminée");
  const total = lines.reduce((sum, l) => sum + (toInt(l.quantity) || 0) * (toInt(l.estimatedUnitPriceHT) || 0), 0);
  const plan = useMemo(() => approvalPlan({ amountHT: total, requesterId: me.id, projectId: f.projectId || undefined }, s), [total, me.id, f.projectId, s]);
  const input = (): RequestDraftInput => ({ ...f, projectId: f.projectId || undefined, taskId: f.taskId || undefined,
    lines: lines.map(l => ({ designation: l.designation, itemRef: l.itemRef || undefined, quantity: toInt(l.quantity), unit: l.unit, estimatedUnitPriceHT: toInt(l.estimatedUnitPriceHT) })) });
  const setLine = (i: number, patch: Partial<Line>) => setLines(ls => ls.map((l, k) => (k === i ? { ...l, ...patch } : l)));

  const save = async (submit: boolean) => {
    const d = input(), r = requestDraftSchema.safeParse(d);
    if (!r.success) { setErrors([...new Set(r.error.issues.map(i => i.message))]); return; }
    setErrors([]); setBusy(true);
    let id: string | null = request?.id ?? null;
    if (request) { if (!(await s.updatePurchaseDraft(request.id, d))) id = null; } else id = await s.createPurchaseRequest(d);
    if (id && submit) await s.submitPurchaseRequest(id);
    setBusy(false); if (id) onDone(id);
  };

  return (<form onSubmit={e => { e.preventDefault(); void save(true); }} className="space-y-4" noValidate>
    <div><label className="field-label" htmlFor="rf-title">Objet *</label><input id="rf-title" value={f.title} onChange={e => setF({ ...f, title: e.target.value })} /></div>
    <div><label className="field-label" htmlFor="rf-just">Justification *</label><textarea id="rf-just" rows={3} value={f.justification} onChange={e => setF({ ...f, justification: e.target.value })} placeholder="Pourquoi cet achat, pour quel besoin ?" /></div>
    <div className="grid gap-3 sm:grid-cols-2">
      <div><label className="field-label" htmlFor="rf-urg">Urgence</label><select id="rf-urg" value={f.urgency} onChange={e => setF({ ...f, urgency: e.target.value as Urgency })}>{URGENCIES.map(u => <option key={u}>{u}</option>)}</select></div>
      <div><label className="field-label" htmlFor="rf-need">Date de besoin *</label><input id="rf-need" type="date" value={f.neededBy} onChange={e => setF({ ...f, neededBy: e.target.value })} /></div>
      <div><label className="field-label" htmlFor="rf-proj">Projet</label><select id="rf-proj" value={f.projectId} onChange={e => setF({ ...f, projectId: e.target.value, taskId: "" })}><option value="">Hors projet</option>{projects.map(p => <option key={p.id} value={p.id}>{p.code} {p.name}</option>)}</select></div>
      <div><label className="field-label" htmlFor="rf-task">Tâche liée</label><select id="rf-task" disabled={!f.projectId} value={f.taskId} onChange={e => setF({ ...f, taskId: e.target.value })}><option value="">Aucune</option>{tasks.map(t => <option key={t.id} value={t.id}>{t.code} {t.title}</option>)}</select></div></div>

    <fieldset><legend className="field-label">Lignes d’articles *</legend>
      <div className="space-y-2">{lines.map((l, i) => (<div key={i} className="rounded-lg border border-slate-200 p-2">
        <div className="flex gap-2"><input aria-label={`Désignation ligne ${i + 1}`} placeholder="Désignation" value={l.designation} onChange={e => setLine(i, { designation: e.target.value })} />
          <button type="button" aria-label={`Supprimer la ligne ${i + 1}`} disabled={lines.length === 1} onClick={() => setLines(ls => ls.filter((_, k) => k !== i))} className="rounded-lg px-2 text-slate-400 hover:text-red-700 disabled:opacity-30"><Trash2 size={16} /></button></div>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <input aria-label={`Quantité ligne ${i + 1}`} inputMode="numeric" placeholder="Qté" value={l.quantity} onChange={e => setLine(i, { quantity: e.target.value })} />
          <input aria-label={`Unité ligne ${i + 1}`} placeholder="Unité" value={l.unit} onChange={e => setLine(i, { unit: e.target.value })} />
          <input aria-label={`Prix unitaire estimé HT ligne ${i + 1}`} inputMode="numeric" placeholder="PU estimé HT (FCFA)" value={l.estimatedUnitPriceHT} onChange={e => setLine(i, { estimatedUnitPriceHT: e.target.value })} />
          <input aria-label={`Référence article ligne ${i + 1}`} placeholder="Réf. (ex. BAT-001)" value={l.itemRef} onChange={e => setLine(i, { itemRef: e.target.value })} /></div></div>))}</div>
      <button type="button" className="btn-o btn-sm mt-2" onClick={() => setLines(ls => [...ls, emptyLine()])}><Plus size={14} aria-hidden />Ajouter une ligne</button></fieldset>

    <div className="rounded-lg bg-slate-50 p-3 text-sm"><div className="flex justify-between"><span>Estimation</span><Money value={total} suffix="HT" strong /></div>
      <div className="mt-2 text-xs text-slate-600">{plan.ok ? <>Circuit de validation : {plan.steps.map(p => `${p.step} (${nameOf(s.users, p.validatorId)})`).join(" → ")}</> : <span className="text-red-700">{plan.error}</span>}</div></div>
    {errors.length > 0 && <ul className="space-y-1 rounded-lg bg-red-50 p-3 text-sm text-red-800">{errors.map(e => <li key={e}>{e}</li>)}</ul>}
    <div className="flex flex-col gap-2 sm:flex-row"><button disabled={busy} className="btn flex-1">Enregistrer et soumettre</button><button type="button" disabled={busy} className="btn-o" onClick={() => void save(false)}>Enregistrer le brouillon</button></div></form>);
}
