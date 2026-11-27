"use client";
import { ClipboardList, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Can } from "@/components/shared/Can";
import { DataList } from "@/components/shared/DataList";
import { Drawer } from "@/components/shared/Drawer";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageTitle } from "@/components/shared/ui";
import { UserLabel } from "@/components/shared/UserLabel";
import { useDemoStore } from "@/hooks/demo-store";
import { canSeeRequest } from "@/lib/access-simulation/purchasing-scope";
import { formatDate } from "@/lib/format";
import { requestTotalHT } from "@/services/purchasing/requests.service";
import { PURCHASE_REQUEST_STATUSES, URGENCIES } from "@/types";
import { Money } from "./Money";
import { RequestForm } from "./RequestForm";
import { StatusPill } from "./StatusPill";

type Scope = "mine" | "todo" | "all";

export default function RequestsView({ openNew = false }: { openNew?: boolean }) {
  const s = useDemoStore(); const me = s.currentUser; const router = useRouter();
  const readAll = s.can("purchase:read_all");
  const [scope, setScope] = useState<Scope>(readAll ? "all" : "mine");
  const [st, setSt] = useState(""), [urg, setUrg] = useState(""), [q, setQ] = useState(""), [creating, setCreating] = useState(openNew);
  const visible = s.purchaseRequests.filter(r => canSeeRequest(me, r, s));
  const todo = new Set(s.validations.filter(v => v.subjectType === "purchase_request" && v.status === "En attente" && v.validatorId === me.id).map(v => v.subjectId));
  const base = scope === "mine" ? visible.filter(r => r.requesterId === me.id) : scope === "todo" ? visible.filter(r => todo.has(r.id)) : visible;
  const rows = base.filter(r => (!st || r.status === st) && (!urg || r.urgency === urg) && `${r.id} ${r.title}`.toLowerCase().includes(q.toLowerCase())).sort((a, b) => b.id.localeCompare(a.id));
  const scopes: { id: Scope; label: string; n: number }[] = [{ id: "mine", label: "Mes demandes", n: visible.filter(r => r.requesterId === me.id).length }, { id: "todo", label: "À valider par moi", n: todo.size }, ...(readAll ? [{ id: "all" as const, label: "Toutes", n: visible.length }] : [])];
  return (<><PageTitle t="Demandes d’achat" s="Création, circuit de validation et suivi jusqu’à la commande">
    <Can perm="purchase:request"><button className="btn w-full sm:w-auto" onClick={() => setCreating(true)}><Plus size={16} aria-hidden />Nouvelle demande</button></Can></PageTitle>
    <div className="mb-3 flex flex-wrap gap-2" role="group" aria-label="Périmètre">{scopes.map(o => <button key={o.id} aria-pressed={scope === o.id} onClick={() => setScope(o.id)} className={`rounded-full border px-3 py-1.5 text-sm ${scope === o.id ? "border-ink bg-ink font-medium text-white" : "border-slate-300 text-slate-600 hover:bg-slate-100"}`}>{o.label} <span className="tabular-nums opacity-70">{o.n}</span></button>)}</div>
    <div className="mb-4 grid gap-2 sm:grid-cols-3"><input placeholder="N° ou objet" aria-label="Rechercher une demande" value={q} onChange={e => setQ(e.target.value)} />
      <select aria-label="Statut" value={st} onChange={e => setSt(e.target.value)}><option value="">Tous les statuts</option>{PURCHASE_REQUEST_STATUSES.map(x => <option key={x}>{x}</option>)}</select>
      <select aria-label="Urgence" value={urg} onChange={e => setUrg(e.target.value)}><option value="">Toutes les urgences</option>{URGENCIES.map(x => <option key={x}>{x}</option>)}</select></div>
    {rows.length ? <DataList rows={rows} href={r => `/purchasing/requests/${r.id}`} cols={[
      { h: "Demande", r: r => <span><b>{r.title}</b><span className="block text-xs font-normal text-slate-500">{r.id}{r.projectId ? `, ${r.projectId}` : ", hors projet"}</span></span> },
      { h: "Statut", r: r => <StatusPill v={r.status} /> },
      { h: "Urgence", r: r => <StatusPill v={r.urgency} /> },
      { h: "Montant", r: r => <Money value={r.approvedAmountHT ?? requestTotalHT(r)} suffix="HT" /> },
      { h: "Demandeur", r: r => <UserLabel userId={r.requesterId} link={false} /> },
      { h: "Besoin le", r: r => formatDate(r.neededBy) }]} />
      : <div className="card"><EmptyState icon={ClipboardList} title="Aucune demande dans ce périmètre" text="Créez une demande d’achat : elle suivra automatiquement le circuit de validation adapté à son montant." /></div>}
    <Drawer open={creating} onClose={() => setCreating(false)} title="Nouvelle demande d’achat">{s.ready && creating && <RequestForm key={me.id} onDone={id => { setCreating(false); router.push(`/purchasing/requests/${id}`); }} />}</Drawer></>);
}
