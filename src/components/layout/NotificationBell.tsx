"use client";
import { Time } from "@/components/shared/Time";
import { Bell } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { NotificationPriorityDot } from "@/components/shared/StatusBadge";
import { useDemoStore } from "@/hooks/demo-store";

export function NotificationBell() {
  const { myNotifications, unreadCount, markRead, markAllRead } = useDemoStore();
  const [open, setOpen] = useState(false); const router = useRouter(); const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDown); document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, [open]);
  return (<div ref={ref} className="relative">
    <button onClick={() => setOpen(!open)} aria-expanded={open} aria-label={`Notifications : ${unreadCount} non lue(s)`} className="relative flex h-10 w-10 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100">
      <Bell size={20} aria-hidden />{unreadCount > 0 && <span className="absolute right-1 top-1 min-w-[18px] rounded-full bg-red-600 px-1 text-center text-[11px] font-semibold leading-[18px] text-white tabular-nums">{unreadCount > 9 ? "9+" : unreadCount}</span>}</button>
    {open && (<div className="fixed inset-x-2 top-16 z-50 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 sm:w-96">
      <div className="flex items-center justify-between border-b px-3 py-2.5"><span className="text-sm font-semibold">Notifications</span>
        {unreadCount > 0 && <button onClick={markAllRead} className="text-xs font-medium text-gold-700 hover:underline">Tout marquer comme lu</button>}</div>
      <ul className="max-h-[60vh] overflow-y-auto">
        {myNotifications.slice(0, 8).map(n => (<li key={n.id}>
          <button onClick={() => { markRead(n.id); setOpen(false); router.push(n.link); }} className={`flex w-full gap-3 border-b px-3 py-2.5 text-left last:border-0 hover:bg-slate-50 ${n.readAt ? "" : "bg-gold-50/50"}`}>
            <span className="pt-1.5"><NotificationPriorityDot p={n.priority} /></span>
            <span className="min-w-0 flex-1"><span className={`block text-sm ${n.readAt ? "text-slate-600" : "font-medium"}`}>{n.title}</span><span className="line-clamp-2 block text-xs text-slate-500">{n.body}</span>
              <span className="mt-0.5 block text-[11px] text-slate-400"><Time iso={n.createdAt} /></span></span>
            {!n.readAt && <span className="sr-only">non lue</span>}</button></li>))}
        {!myNotifications.length && <li className="px-3 py-8 text-center text-sm text-slate-500">Aucune notification pour ce profil.</li>}</ul>
      <Link href="/notifications" onClick={() => setOpen(false)} className="block border-t px-3 py-2.5 text-center text-sm font-medium text-gold-700 hover:bg-slate-50">Voir toutes les notifications</Link></div>)}
  </div>);
}
