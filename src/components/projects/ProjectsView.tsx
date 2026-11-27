"use client";
import { FolderKanban, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { DataList } from "@/components/shared/DataList";
import { Drawer } from "@/components/shared/Drawer";
import { EmptyState } from "@/components/shared/EmptyState";
import { ProgressBar } from "@/components/shared/ProgressBar";
import { PriorityBadge } from "@/components/shared/StatusBadge";
import { Badge, PageTitle } from "@/components/shared/ui";
import { UserLabel } from "@/components/shared/UserLabel";
import { Can } from "@/components/shared/Can";
import { useDemoStore } from "@/hooks/demo-store";
import { formatDate } from "@/lib/format";
import { projectProgress } from "@/services/projects.service";
import { visibleProjects } from "@/services/space.service";
import { PRIORITIES, PROJECT_STATUSES } from "@/types";
import { ProjectForm } from "./ProjectForm";

export default function ProjectsView() {
  const s = useDemoStore(); const router = useRouter();
  const [q, setQ] = useState(""), [st, setSt] = useState(""), [pr, setPr] = useState(""), [creating, setCreating] = useState(false);
  const all = visibleProjects(s, s.currentUser);
  const rows = all.filter(p => (!st || p.status === st) && (!pr || p.priority === pr) && `${p.code} ${p.name}`.toLowerCase().includes(q.toLowerCase()));
  return (<><PageTitle t="Projets" s={s.can("project:read_all") ? `${all.length} projet(s) dans l’organisation` : `${all.length} projet(s) auxquels vous participez`}>
    <Can perm="project:create"><button className="btn w-full sm:w-auto" onClick={() => setCreating(true)}><Plus size={16} aria-hidden />Nouveau projet</button></Can></PageTitle>
    <div className="mb-4 grid gap-2 sm:grid-cols-3"><input placeholder="Rechercher un projet" aria-label="Rechercher un projet" value={q} onChange={e => setQ(e.target.value)} />
      <select aria-label="Statut" value={st} onChange={e => setSt(e.target.value)}><option value="">Tous les statuts</option>{PROJECT_STATUSES.map(x => <option key={x}>{x}</option>)}</select>
      <select aria-label="Priorité" value={pr} onChange={e => setPr(e.target.value)}><option value="">Toutes les priorités</option>{PRIORITIES.map(x => <option key={x}>{x}</option>)}</select></div>
    {all.length ? <DataList rows={rows} href={p => `/projects/${p.id}`} cols={[
      { h: "Projet", r: p => <span><b>{p.name}</b><span className="block text-xs font-normal text-slate-500">{p.code}</span></span> },
      { h: "Statut", r: p => <Badge v={p.status} /> },
      { h: "Chef de projet", r: p => <UserLabel userId={p.ownerId} link={false} /> },
      { h: "Priorité", r: p => <PriorityBadge p={p.priority} /> },
      { h: "Échéance", r: p => formatDate(p.dueDate) },
      { h: "Tâches ouvertes", r: p => s.tasks.filter(t => t.projectId === p.id && t.status !== "Terminée").length },
      { h: "Avancement", r: p => <div className="w-32"><ProgressBar value={projectProgress(s.tasks, p.id)} /></div> },
    ]} /> : <div className="card"><EmptyState icon={FolderKanban} title="Aucun projet visible pour ce profil" text="Vous verrez ici les projets dont vous êtes membre." /></div>}
    <Drawer open={creating} onClose={() => setCreating(false)} title="Nouveau projet"><ProjectForm onDone={id => { setCreating(false); router.push(`/projects/${id}`); }} /></Drawer></>);
}
