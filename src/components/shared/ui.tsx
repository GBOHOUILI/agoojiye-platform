import Link from "next/link";
import { ReactNode } from "react";
export const fmt = (d: string) => d.split("-").reverse().join("/");
const TONE: Record<string, string> = { Critique: "bg-red-100 text-red-800", Élevée: "bg-orange-100 text-orange-800", Moyenne: "bg-amber-100 text-amber-800", Faible: "bg-slate-100 text-slate-700", Réussi: "bg-emerald-100 text-emerald-800", Échoué: "bg-red-100 text-red-800", "À surveiller": "bg-amber-100 text-amber-800", "En attente": "bg-slate-100 text-slate-700", Résolue: "bg-emerald-100 text-emerald-800", Validé: "bg-emerald-100 text-emerald-800", Réalisée: "bg-emerald-100 text-emerald-800" };
export const Badge = ({ v }: { v: string }) => <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${TONE[v] || "bg-sky-100 text-sky-800"}`}>{v}</span>;
export const PageTitle = ({ t, s, children }: { t: string; s?: string; children?: ReactNode }) => (<div className="mb-5 flex flex-wrap items-end justify-between gap-3"><div><h1 className="text-xl font-semibold sm:text-2xl">{t}</h1>{s && <p className="text-sm text-slate-500">{s}</p>}</div>{children}</div>);
export const Back = ({ href, l }: { href: string; l: string }) => <Link href={href} className="mb-3 inline-block text-sm text-gold-700">← {l}</Link>;
export const NotFoundCard = ({ href, l }: { href: string; l: string }) => <div className="card">Élément introuvable. <Link className="text-gold-700" href={href}>{l}</Link></div>;
