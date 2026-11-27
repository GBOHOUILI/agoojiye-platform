"use client";
import { Ban, Check, Clock, X } from "lucide-react";
import { Time } from "@/components/shared/Time";
import { UserLabel } from "@/components/shared/UserLabel";
import { useDemoStore } from "@/hooks/demo-store";
import { approvalPlan } from "@/lib/purchasing/approval";
import type { PurchaseRequest } from "@/types";
import { requestTotalHT } from "@/services/purchasing/requests.service";
import { PurchaseDecision } from "./PurchaseDecision";

const ICON = { Approuvée: <Check size={14} />, Rejetée: <X size={14} />, "En attente": <Clock size={14} />, Annulée: <Ban size={14} /> };
const TONE = { Approuvée: "bg-emerald-600 text-white", Rejetée: "bg-red-600 text-white", "En attente": "bg-gold-500 text-ink", Annulée: "bg-slate-300 text-slate-700" };

export function ApprovalTimeline({ request }: { request: PurchaseRequest }) {
  const s = useDemoStore();
  const vs = s.validations.filter(v => v.subjectType === "purchase_request" && v.subjectId === request.id).sort((a, b) => a.id.localeCompare(b.id));
  // Before submission, preview the circuit the request will follow.
  const preview = request.status === "Brouillon" ? approvalPlan({ amountHT: requestTotalHT(request), requesterId: request.requesterId, projectId: request.projectId }, s) : null;
  return (<section className="card"><h2 className="mb-3 text-sm font-semibold">Circuit de validation</h2>
    {preview && (preview.ok
      ? <ol className="space-y-2">{preview.steps.map(p => <li key={p.step} className="flex items-center gap-3 text-sm"><span className="flex h-6 w-6 items-center justify-center rounded-full border border-dashed border-slate-300 text-xs text-slate-400">·</span><span className="w-24 font-medium">{p.step}</span><UserLabel userId={p.validatorId} /></li>)}
          <li className="text-xs text-slate-500">Aperçu : le circuit démarre à la soumission.</li></ol>
      : <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{preview.error}</p>)}
    {!preview && !vs.length && <p className="text-sm text-slate-500">Aucune étape pour le moment.</p>}
    <ol className="space-y-3">{vs.map(v => (<li key={v.id} className="flex gap-3">
      <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${TONE[v.status]}`} aria-hidden>{ICON[v.status]}</span>
      <div className="min-w-0 flex-1 text-sm">
        <div className="flex flex-wrap items-center gap-x-2"><span className="font-medium">{v.step}</span><span className="text-slate-500">{v.status.toLowerCase()}</span>{(v.round ?? 1) > 1 && <span className="rounded bg-slate-100 px-1.5 text-xs text-slate-600">soumission {v.round}</span>}</div>
        <div className="mt-0.5"><UserLabel userId={v.validatorId} /></div>
        <div className="text-xs text-slate-500">Demandée <Time iso={v.requestedAt} />{v.decidedAt && <>, décidée <Time iso={v.decidedAt} /></>}</div>
        {v.comment && <p className="mt-1 rounded bg-slate-50 px-2 py-1">« {v.comment} »</p>}
        <div className="mt-2"><PurchaseDecision validation={v} /></div></div></li>))}</ol></section>);
}
