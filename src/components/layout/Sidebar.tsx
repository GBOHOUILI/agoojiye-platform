"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Settings } from "lucide-react";
import { useEffect, useRef } from "react";
import { Logo } from "@/components/brand/Logo";
import { useDemoStore } from "@/hooks/demo-store";
import { useUiPrefs } from "@/hooks/use-ui-prefs";
import { routePermission } from "@/lib/access-simulation/routes";
import { activeGroup, openWith, toggleGroup } from "@/lib/ui/nav-state";
import { NAV_GROUPS, type NavItem } from "./nav";

const isActive = (path: string, href: string, exact?: boolean) => path === href || (!exact && path.startsWith(href + "/"));

export function Sidebar({ onNav }: { onNav: () => void }) {
  const { can, unreadCount, validations, currentUser } = useDemoStore(), path = usePathname();
  const { prefs, update, ready } = useUiPrefs();
  const badges = { notifications: unreadCount, validations: validations.filter(v => v.status === "En attente" && v.validatorId === currentUser.id).length };
  const groups = NAV_GROUPS.map(g => ({ ...g, items: g.items.filter(i => { const p = routePermission(i.href); return !p || can(p); }) })).filter(g => g.items.length);
  const [pinned, ...collapsible] = groups;
  const current = activeGroup(path, collapsible);
  // Before preferences are read (first render), the current page's group is open.
  const openGroups = prefs.openGroups ?? (current ? [current] : []);
  const row = prefs.density === "compacte" ? "min-h-[36px]" : "min-h-[40px]";
  const head = prefs.density === "compacte" ? "min-h-[32px]" : "min-h-[38px]";

  // Only an actual page change opens the page's group (without closing others), so the user can still close it by hand.
  const lastPage = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (!ready || lastPage.current === path) return;
    lastPage.current = path;
    if (prefs.autoOpen && current && !openGroups.includes(current)) update({ openGroups: openWith(openGroups, current) });
  }, [ready, path, current, prefs.autoOpen, openGroups, update]);

  const link = ({ href, label, icon: I, badge, exact }: NavItem) => {
    const on = isActive(path, href, exact), n = badge ? badges[badge] : 0;
    return (<Link key={href} href={href} onClick={onNav} aria-current={on ? "page" : undefined} className={`flex ${row} items-center gap-3 rounded-lg px-3 text-sm ${on ? "bg-white/10 text-white shadow-[inset_3px_0_0_#c79a2b]" : "text-slate-300 hover:bg-white/5 hover:text-white"}`}>
      <I size={17} aria-hidden className={on ? "text-gold-400" : ""} /><span className="flex-1">{label}</span>{n > 0 && <span className="rounded-full bg-gold-500 px-1.5 text-xs font-semibold tabular-nums text-ink">{n > 9 ? "9+" : n}</span>}</Link>);
  };

  return (<div className="flex h-full flex-col bg-ink text-white">
    <Link href="/espace" onClick={onNav} className="block px-5 pb-2 pt-3"><Logo variant="light" className="h-[22px] w-auto" /><div className="mt-1.5 text-xs text-slate-400 [@media(max-height:720px)]:hidden">Plateforme de gestion, démonstration</div></Link>
    <nav className="flex-1 overflow-y-auto px-3 pb-3" aria-label="Navigation principale">
      {pinned && <div className="mb-2"><div className="px-3 pb-1 text-xs font-medium text-slate-500 [@media(max-height:720px)]:hidden">{pinned.title}</div>{pinned.items.map(link)}</div>}
      {collapsible.map(g => {
        const expanded = openGroups.includes(g.title), id = `nav-${g.title.replace(/\W+/g, "-")}`;
        const hidden = expanded ? 0 : g.items.reduce((t, i) => t + (i.badge ? badges[i.badge] : 0), 0);
        return (<div key={g.title} className="border-t border-white/5 py-0.5">
          <button type="button" aria-expanded={expanded} aria-controls={id} onClick={() => update({ openGroups: toggleGroup(openGroups, g.title) })}
            className={`flex ${head} w-full items-center gap-2 rounded-lg px-3 text-left text-xs font-medium ${expanded || current === g.title ? "text-white" : "text-slate-400 hover:text-white"}`}>
            <ChevronRight size={15} aria-hidden className={`transition-transform ${expanded ? "rotate-90 text-gold-400" : ""}`} />
            <span className="flex-1">{g.title}</span>
            {hidden > 0 && <span className="rounded-full bg-gold-500 px-1.5 text-xs font-semibold tabular-nums text-ink" aria-label={`${hidden} élément(s) en attente`}>{hidden > 9 ? "9+" : hidden}</span>}
          </button>
          {expanded && <div id={id} className="pb-1">{g.items.map(link)}</div>}</div>);
      })}
    </nav>
    <div className="border-t border-white/10 px-3 py-2">
      <Link href="/settings" onClick={onNav} aria-current={path === "/settings" ? "page" : undefined} className={`flex ${row} items-center gap-3 rounded-lg px-3 text-sm ${path === "/settings" ? "bg-white/10 text-white shadow-[inset_3px_0_0_#c79a2b]" : "text-slate-300 hover:bg-white/5 hover:text-white"}`}><Settings size={17} aria-hidden className={path === "/settings" ? "text-gold-400" : ""} />Paramètres</Link></div></div>);
}
