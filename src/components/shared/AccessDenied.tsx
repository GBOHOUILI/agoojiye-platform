"use client";
import { ShieldOff } from "lucide-react";
import { useDemoStore } from "@/hooks/demo-store";
import { PERMISSION_LABELS, type Permission } from "@/lib/access-simulation/permissions";
import { ROLE_LABELS } from "@/lib/access-simulation/roles";
export function AccessDenied({ permission }: { permission: Permission }) {
  const { currentUser } = useDemoStore();
  return (<div className="card mx-auto mt-6 max-w-lg text-center">
    <ShieldOff className="mx-auto mb-3 text-slate-400" size={32} aria-hidden />
    <h1 className="text-lg font-semibold">Accès non autorisé pour ce profil</h1>
    <p className="mt-1 text-sm text-slate-600">Le profil {ROLE_LABELS[currentUser.systemRole]} n’a pas la permission « {PERMISSION_LABELS[permission]} ».</p>
    <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">Rappel : il s’agit d’une simulation de rôles côté client, pas d’un contrôle de sécurité. Changez de profil avec le sélecteur en haut de page.</p></div>);
}
