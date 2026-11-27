"use client";
import { Menu, X } from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { useState } from "react";
import { NotificationBell } from "./NotificationBell";
import { ProfileSwitcher } from "./ProfileSwitcher";
import { RouteGuard } from "./RouteGuard";
import { Sidebar } from "./Sidebar";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (<div className="min-h-screen lg:pl-64">
    <aside className="fixed inset-y-0 left-0 hidden w-64 lg:block"><Sidebar onNav={() => {}} /></aside>
    {open && <div className="fixed inset-0 z-40 lg:hidden"><div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} /><aside className="absolute inset-y-0 left-0 w-72 max-w-[85vw]"><Sidebar onNav={() => setOpen(false)} /></aside></div>}
    <header className="sticky top-0 z-30 border-b bg-white/95 backdrop-blur">
      <div className="bg-amber-100 px-2 py-1 text-center text-[11px] font-semibold tracking-wide text-amber-900">ENVIRONNEMENT DE DÉMONSTRATION — DONNÉES FICTIVES <span className="font-normal">· Rôles simulés, aucune sécurité réelle</span></div>
      <div className="flex h-14 items-center gap-2 px-3 sm:px-6">
        <button aria-label={open ? "Fermer le menu" : "Ouvrir le menu"} onClick={() => setOpen(!open)} className="rounded-lg p-2 lg:hidden">{open ? <X /> : <Menu />}</button>
        <Link href="/espace" className="lg:hidden" aria-label="Accueil AGOOJIYÉ"><Logo className="h-4 w-auto" /></Link>
        <div className="flex-1" />
        <span className="hidden rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-xs text-amber-900 md:inline">Profil simulé</span>
        <NotificationBell /><ProfileSwitcher /></div></header>
    <main className="mx-auto max-w-7xl p-4 sm:p-6"><RouteGuard>{children}</RouteGuard></main></div>);
}
