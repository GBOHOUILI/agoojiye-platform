"use client";
import Link from "next/link";
import { useDemoStore } from "@/hooks/demo-store";
import { displayName } from "@/lib/people";
import { Avatar } from "./Avatar";
export function UserLabel({ userId, empty = "Non attribué", link = true }: { userId?: string; empty?: string; link?: boolean }) {
  const { users, can } = useDemoStore();
  const u = userId ? users.find(x => x.id === userId) : undefined;
  if (!u) return <span className="inline-flex items-center gap-2 text-sm text-slate-400"><Avatar size="sm" />{empty}</span>;
  const inner = <><Avatar user={u} size="sm" /><span className="truncate">{displayName(u)}</span></>;
  return link && can("org:read") ? <Link href={`/organization?user=${u.id}`} onClick={e => e.stopPropagation()} className="inline-flex min-w-0 items-center gap-2 text-sm hover:text-gold-800">{inner}</Link> : <span className="inline-flex min-w-0 items-center gap-2 text-sm">{inner}</span>;
}
