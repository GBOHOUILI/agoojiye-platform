"use client";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { AccessDenied } from "@/components/shared/AccessDenied";
import { useDemoStore } from "@/hooks/demo-store";
import { routePermission } from "@/lib/access-simulation/routes";
// Simulated guard. Until the stored profile is known, protected routes show a placeholder rather than flashing content.
export function RouteGuard({ children }: { children: ReactNode }) {
  const { ready, can } = useDemoStore(); const p = routePermission(usePathname());
  if (p && !ready) return <div className="card animate-pulse py-10 text-center text-sm text-slate-500" aria-busy="true">Chargement du profil…</div>;
  if (p && !can(p)) return <AccessDenied permission={p} />;
  return <>{children}</>;
}
