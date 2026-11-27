import { Check } from "lucide-react";
import { PERMISSION_LABELS, PERMISSIONS, ROLE_PERMISSIONS, type Permission } from "@/lib/access-simulation/permissions";
import { ROLE_LABELS } from "@/lib/access-simulation/roles";
import { SYSTEM_ROLES } from "@/types";

export function PermissionMatrix() {
  const has = (r: (typeof SYSTEM_ROLES)[number], p: Permission) => (ROLE_PERMISSIONS[r] as readonly Permission[]).includes(p);
  return (<div className="card overflow-x-auto p-0">
    <table className="w-full min-w-[56rem] border-collapse text-xs">
      <thead><tr className="border-b"><th className="sticky left-0 z-10 bg-white px-3 py-2 text-left font-medium text-slate-500">Permission</th>
        {SYSTEM_ROLES.map(r => <th key={r} className="px-2 py-2 text-center font-medium text-slate-600">{ROLE_LABELS[r]}</th>)}</tr></thead>
      <tbody>{PERMISSIONS.map(p => (<tr key={p} className="border-b last:border-0 hover:bg-slate-50">
        <th scope="row" className="sticky left-0 bg-white px-3 py-2 text-left font-normal"><span className="block text-sm text-slate-800">{PERMISSION_LABELS[p]}</span><code className="text-[11px] text-slate-400">{p}</code></th>
        {SYSTEM_ROLES.map(r => <td key={r} className="px-2 py-2 text-center">{has(r, p) ? <Check size={16} className="mx-auto text-gold-700" aria-label="Autorisé" /> : <span className="text-slate-300" aria-label="Non autorisé">·</span>}</td>)}</tr>))}</tbody></table></div>);
}
