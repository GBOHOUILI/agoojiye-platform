"use client";
import type { ReactNode } from "react";
import { useDemoStore } from "@/hooks/demo-store";
import type { Permission } from "@/lib/access-simulation/permissions";
/** Hides UI the simulated profile may not use. Presentation only — not a security boundary. */
export function Can({ perm, children, fallback = null }: { perm: Permission; children: ReactNode; fallback?: ReactNode }) {
  return <>{useDemoStore().can(perm) ? children : fallback}</>;
}
