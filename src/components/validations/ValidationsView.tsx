"use client";
import { Time } from "@/components/shared/Time";
import { BadgeCheck } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { EmptyState } from "@/components/shared/EmptyState";
import { Tabs } from "@/components/shared/Tabs";
import { Badge, PageTitle } from "@/components/shared/ui";
import { TaskActions } from "@/components/tasks/TaskActions";
import { Money } from "@/components/purchasing/Money";
import { PurchaseDecision } from "@/components/purchasing/PurchaseDecision";
import { approvalAmountOf } from "@/services/purchasing/requests.service";
import { useDemoStore } from "@/hooks/demo-store";
import { nameOf } from "@/lib/people";
import { pendingValidationsFor } from "@/services/space.service";
import type { ValidationRequest } from "@/types";

const STATUS_TONE = { "En attente": "text-amber-700", Approuvée: "text-emerald-700", Rejetée: "text-red-700", Annulée: "text-slate-500" };

export default function ValidationsView() {
  const s = useDemoStore(); const me = s.currentUser; const [tab, setTab] = useState("todo");
  const todo = pendingValidationsFor(s, me);
  const mine = s.validations.filter(v => v.ownerId === me.id || v.authorId === me.id);
  const history = s.validations.filter(v => v.status !== "En attente" && (v.validatorId === me.id || v.ownerId === me.id || v.authorId === me.id || s.can("validation:override")));
  const anomalies = s.can("incident:update") || s.currentUser.systemRole === "QUALITY_MANAGER" ? s.anos.filter(a => a.s === "En vérification") : [];
  const sortDesc = (xs: ValidationRequest[]) => [...xs].sort((a, b) => (b.decidedAt ?? b.requestedAt).localeCompare(a.decidedAt ?? a.requestedAt));
  const list = tab === "todo" ? todo : tab === "mine" ? sortDesc(mine) : sortDesc(history);

  const Row = ({ v }: { v: ValidationRequest }) => {
    const purchase = v.subjectType === "purchase_request";
    const t = purchase ? undefined : s.tasks.find(x => x.id === v.subjectId);
    const da = purchase ? s.purchaseRequests.find(x => x.id === v.subjectId) : undefined;
    const p = s.projects.find(x => x.id === (t?.projectId ?? da?.projectId));
    return (
    <div className="border-b py-3 last:border-0">
      <div className="flex flex-wrap items-start justify-between gap-2"><div className="min-w-0"><Link href={purchase ? `/purchasing/requests/${v.subjectId}` : `/tasks/${v.subjectId}`} className="text-sm font-medium hover:text-gold-800">{t?.title ?? da?.title ?? v.subjectId}</Link>
        <div className="text-xs text-slate-500">{purchase ? <>Achat {v.subjectId}, étape {v.step}{da && <>, <Money value={approvalAmountOf(da, s.quotes)} suffix="HT" /></>}</> : t?.code}{p && `, ${p.name}`}</div></div><span className={`text-xs font-medium ${STATUS_TONE[v.status]}`}>{v.status}</span></div>
      <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs sm:grid-cols-4">
        <div><dt className="text-slate-500">Auteur</dt><dd>{nameOf(s.users, v.authorId)}</dd></div><div><dt className="text-slate-500">Responsable</dt><dd>{nameOf(s.users, v.ownerId)}</dd></div>
        <div><dt className="text-slate-500">Validateur</dt><dd>{nameOf(s.users, v.validatorId)}</dd></div><div><dt className="text-slate-500">{v.decidedAt ? "Décision" : "Demande"}</dt><dd><Time iso={v.decidedAt ?? v.requestedAt} /></dd></div></dl>
      {v.comment && <p className="mt-2 rounded bg-slate-50 px-2 py-1 text-sm">« {v.comment} »</p>}
      {v.status === "En attente" && t && <div className="mt-2"><TaskActions task={t} /></div>}
      {purchase && <div className="mt-2"><PurchaseDecision validation={v} /></div>}</div>); };

  return (<><PageTitle t="Validations" s="Tâches et achats : auteur, responsable et validateur" />
    <Tabs value={tab} onChange={setTab} tabs={[{ id: "todo", label: "À décider", count: todo.length }, { id: "mine", label: "Mes demandes", count: mine.length }, { id: "history", label: "Historique", count: history.length }]} />
    <section className="card">{list.length ? list.map(v => <Row key={v.id} v={v} />) : <EmptyState icon={BadgeCheck} title={tab === "todo" ? "Rien à décider pour le moment" : "Aucune demande"} text={tab === "todo" ? "Les tâches soumises à votre validation apparaîtront ici, et vous serez notifié." : undefined} />}</section>
    {tab === "todo" && anomalies.length > 0 && <section className="card mt-4"><h2 className="mb-1 text-sm font-semibold">Anomalies en attente de vérification</h2>
      <p className="mb-2 text-xs text-slate-500">Elles suivent leur propre workflow ; la résolution se décide depuis la fiche de l’anomalie.</p>
      {anomalies.map(a => <Link key={a.id} href={`/anomalies/${a.id}`} className="flex items-center justify-between gap-2 border-b py-2.5 text-sm last:border-0 hover:bg-slate-50"><span className="truncate">{a.id}, {a.titre}</span><Badge v={a.g} /></Link>)}</section>}</>);
}
