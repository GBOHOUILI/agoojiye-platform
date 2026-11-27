"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { DataList } from "@/components/shared/DataList";
import { Drawer } from "@/components/shared/Drawer";
import { RoleBadge } from "@/components/shared/StatusBadge";
import { Tabs } from "@/components/shared/Tabs";
import { PageTitle } from "@/components/shared/ui";
import { UserLabel } from "@/components/shared/UserLabel";
import { UserSheet } from "@/components/organization/UserSheet";
import { useDemoStore } from "@/hooks/demo-store";
import { displayName } from "@/lib/people";
import { getStorageOutcome } from "@/repositories";
import { DB_KEY, LEGACY_KEY, V2_KEY } from "@/repositories/local/database";
import { SESSION_KEY } from "@/repositories/session";
import { Time } from "@/components/shared/Time";
import { PermissionMatrix } from "./PermissionMatrix";

const OUTCOME: Record<string, string> = { v3: "Données v3 existantes chargées.", "migrated-v2": "Données v2 migrées vers v3 lors de ce chargement (module Achats ajouté).", migrated: "Données v1 migrées vers v3 lors de ce chargement.", seeded: "Jeu de données initial chargé.", recovered: "Données illisibles : jeu initial restauré." };

export default function AdminView({ initialTab = "users", userId }: { initialTab?: string; userId?: string }) {
  const s = useDemoStore(); const router = useRouter();
  const [tab, setTab] = useState(["users", "matrix", "demo"].includes(initialTab) ? initialTab : "users");
  const migration = s.activity.find(e => e.action === "demo.migrated");
  const selected = s.users.find(u => u.id === userId);
  return (<><PageTitle t="Administration" s="Utilisateurs, rôles simulés et données de démonstration" />
    <Tabs value={tab} onChange={setTab} tabs={[{ id: "users", label: "Utilisateurs", count: s.users.length }, { id: "matrix", label: "Matrice des permissions" }, { id: "demo", label: "Démonstration" }]} />
    {tab === "users" && <DataList rows={s.users} href={u => `/admin?tab=users&user=${u.id}`} cols={[
      { h: "Collaborateur", r: u => <UserLabel userId={u.id} link={false} /> },
      { h: "Rôle système", r: u => <RoleBadge role={u.systemRole} /> },
      { h: "Fonction", r: u => u.jobTitle },
      { h: "E-mail (fictif)", r: u => u.email },
      { h: "Statut", r: u => (u.active ? "Actif" : "Inactif") }]} />}
    {tab === "users" && <p className="mt-2 text-xs text-slate-500">Cliquez une ligne pour modifier le rôle système, l’équipe ou le responsable. Pour une démonstration à la volée, utilisez plutôt le sélecteur de profil.</p>}
    {tab === "matrix" && <><p className="mb-3 max-w-prose text-sm text-slate-600">Cette matrice est appliquée côté client pour simuler les espaces. Elle sert de spécification aux futurs contrôles de l’API, qui seuls apporteront une sécurité réelle.</p><PermissionMatrix /></>}
    {tab === "demo" && <div className="grid gap-4 lg:grid-cols-2">
      <section className="card"><h2 className="mb-2 text-sm font-semibold">Stockage local</h2>
        <dl className="space-y-2 text-sm"><div><dt className="text-xs text-slate-500">État au chargement</dt><dd>{OUTCOME[getStorageOutcome() ?? ""] ?? "Inconnu"}</dd></div>
          <div><dt className="text-xs text-slate-500">Migration depuis la v1</dt><dd>{migration ? <>Effectuée <Time iso={migration.at} mode="datetime" /></> : "Aucune migration nécessaire."}</dd></div>
          <div><dt className="text-xs text-slate-500">Clés du navigateur</dt><dd><code className="text-xs">{DB_KEY}</code> (données), <code className="text-xs">{SESSION_KEY}</code> (profil simulé), <code className="text-xs">{V2_KEY}</code> et <code className="text-xs">{LEGACY_KEY}</code> (versions précédentes, conservées intactes)</dd></div></dl></section>
      <section className="card"><h2 className="mb-2 text-sm font-semibold">Réinitialisation</h2><p className="text-sm text-slate-600">Restaure le jeu de données fictif initial pour tous les profils. Le profil actif ({displayName(s.currentUser)}) est conservé.</p>
        <button className="btn-danger mt-3" onClick={() => { if (window.confirm("Réinitialiser toutes les données de démonstration ?")) s.reset(); }}>Réinitialiser la démo</button></section>
      <section className="card lg:col-span-2 border-amber-300 bg-amber-50"><h2 className="mb-1 text-sm font-semibold text-amber-900">Limites de sécurité</h2>
        <ul className="list-disc space-y-1 pl-5 text-sm text-amber-900"><li>Aucune authentification : n’importe qui peut choisir n’importe quel profil.</li><li>Les permissions masquent des écrans et refusent des actions dans le navigateur ; elles se contournent en modifiant le stockage local.</li><li>Toutes les données sont fictives et restent dans ce navigateur.</li></ul></section></div>}
    <Drawer open={!!selected} onClose={() => router.push("/admin?tab=users", { scroll: false })} title={selected ? displayName(selected) : ""}>{selected && <UserSheet user={selected} />}</Drawer>
  </>);
}

