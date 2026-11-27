"use client";
import Link from "next/link";
import { RotateCcw } from "lucide-react";
import { Avatar } from "@/components/shared/Avatar";
import { Can } from "@/components/shared/Can";
import { RoleBadge } from "@/components/shared/StatusBadge";
import { PageTitle } from "@/components/shared/ui";
import { useDemoStore } from "@/hooks/demo-store";
import { useUiPrefs } from "@/hooks/use-ui-prefs";
import { displayName } from "@/lib/people";
import type { Density } from "@/lib/ui/nav-state";

const DENSITIES: { id: Density; label: string; hint: string }[] = [
  { id: "compacte", label: "Compacte", hint: "Lignes de 36 px : davantage de liens visibles sans défiler." },
  { id: "confortable", label: "Confortable", hint: "Lignes de 40 px, plus faciles à toucher." },
];

export default function SettingsView() {
  const s = useDemoStore(); const me = s.currentUser; const { prefs, update } = useUiPrefs();
  const team = s.teams.find(t => t.id === me.teamId)?.name, dept = s.departments.find(d => d.id === me.departmentId)?.name;
  return (<><PageTitle t="Paramètres" s="Profil simulé, affichage et données de démonstration" />
    <div className="grid max-w-3xl gap-4">
      <section className="card"><h2 className="mb-3 text-sm font-semibold">Mon profil simulé</h2>
        <div className="flex items-center gap-3"><Avatar user={me} size="lg" /><div className="min-w-0"><div className="flex flex-wrap items-center gap-2 font-medium">{displayName(me)}<RoleBadge role={me.systemRole} /></div>
          <div className="text-sm text-slate-600">{me.jobTitle}{team ? `, ${team}` : ""}{dept ? `, ${dept}` : ""}</div><div className="text-xs text-slate-500">{me.email}</div></div></div>
        <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">Simulation : aucun mot de passe ni contrôle d’accès réel. Pour voir la plateforme avec un autre profil, utilisez le sélecteur en haut à droite.</p></section>

      <section className="card"><h2 className="mb-3 text-sm font-semibold">Affichage du menu</h2>
        <fieldset><legend className="field-label">Densité</legend>
          <div className="grid gap-2 sm:grid-cols-2">{DENSITIES.map(d => (
            <label key={d.id} className={`flex cursor-pointer gap-3 rounded-lg border p-3 ${prefs.density === d.id ? "border-gold-500 bg-gold-50" : "border-slate-200 hover:bg-slate-50"}`}>
              <input type="radio" name="density" className="!w-4" checked={prefs.density === d.id} onChange={() => update({ density: d.id })} />
              <span><span className="block text-sm font-medium">{d.label}</span><span className="block text-xs text-slate-500">{d.hint}</span></span></label>))}</div></fieldset>
        <label className="mt-4 flex cursor-pointer items-start gap-3">
          <input type="checkbox" className="mt-0.5 !w-4" checked={prefs.autoOpen} onChange={e => update({ autoOpen: e.target.checked })} />
          <span><span className="block text-sm font-medium">Ouvrir automatiquement le groupe de la page affichée</span><span className="block text-xs text-slate-500">Les groupes ouverts le restent jusqu’à ce que vous les fermiez ; les compteurs restent visibles sur les groupes fermés.</span></span></label>
        <p className="mt-3 text-xs text-slate-500">Ces préférences sont enregistrées dans ce navigateur uniquement.</p></section>

      <Can perm="admin:access"><section className="card"><h2 className="mb-1 text-sm font-semibold">Données de démonstration</h2>
        <p className="mb-3 text-sm text-slate-600">Restaure le jeu de données fictif initial pour tous les profils. Le profil actif est conservé.</p>
        <div className="flex flex-wrap gap-2"><button className="btn-danger" onClick={() => { if (window.confirm("Réinitialiser toutes les données de démonstration ?")) s.reset(); }}><RotateCcw size={16} aria-hidden />Réinitialiser la démo</button>
          <Link href="/admin?tab=demo" className="btn-o">Stockage et migration</Link></div></section></Can>
    </div></>);
}
