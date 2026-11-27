"use client";
import { Time } from "@/components/shared/Time";
import { Bell } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { EmptyState } from "@/components/shared/EmptyState";
import { NotificationPriorityDot } from "@/components/shared/StatusBadge";
import { Tabs } from "@/components/shared/Tabs";
import { PageTitle } from "@/components/shared/ui";
import { useDemoStore } from "@/hooks/demo-store";
import { NOTIFICATION_PRIORITIES } from "@/types";

export default function NotificationsView() {
  const { myNotifications, unreadCount, markRead, markAllRead } = useDemoStore(); const router = useRouter();
  const [tab, setTab] = useState("all"), [prio, setPrio] = useState("");
  const list = myNotifications.filter(n => (tab === "all" || !n.readAt) && (!prio || n.priority === prio));
  return (<><PageTitle t="Notifications" s={`${unreadCount} non lue(s) sur ${myNotifications.length}`}>
    <div className="flex w-full gap-2 sm:w-auto"><select aria-label="Priorité" value={prio} onChange={e => setPrio(e.target.value)}><option value="">Toutes les priorités</option>{NOTIFICATION_PRIORITIES.map(p => <option key={p}>{p}</option>)}</select>
      <button className="btn-o shrink-0" disabled={!unreadCount} onClick={markAllRead}>Tout marquer comme lu</button></div></PageTitle>
    <Tabs value={tab} onChange={setTab} tabs={[{ id: "all", label: "Toutes", count: myNotifications.length }, { id: "unread", label: "Non lues", count: unreadCount }]} />
    <section className="card p-0">{list.length ? <ul>{list.map(n => (
      <li key={n.id} className={`flex gap-3 border-b px-4 py-3 last:border-0 ${n.readAt ? "" : "bg-gold-50/40"}`}>
        <span className="pt-1.5"><NotificationPriorityDot p={n.priority} /></span>
        <div className="min-w-0 flex-1"><div className={`text-sm ${n.readAt ? "" : "font-semibold"}`}>{n.title}{!n.readAt && <span className="sr-only"> (non lue)</span>}</div>
          <p className="text-sm text-slate-600">{n.body}</p>
          <div className="mt-0.5 text-xs text-slate-500"><Time iso={n.createdAt} />, priorité {n.priority.toLowerCase()}</div></div>
        <div className="flex shrink-0 flex-col gap-1 sm:flex-row sm:items-start"><button className="btn-o btn-sm" onClick={() => { markRead(n.id); router.push(n.link); }}>Ouvrir</button>
          {!n.readAt && <button className="btn-o btn-sm" onClick={() => markRead(n.id)}>Marquer lu</button>}</div></li>))}</ul>
      : <EmptyState icon={Bell} title={tab === "unread" ? "Tout est lu" : "Aucune notification"} text="Vous êtes notifié quand une tâche vous est attribuée, qu’un incident est signalé ou qu’une validation vous attend." />}</section></>);
}
