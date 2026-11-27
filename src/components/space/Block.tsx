import Link from "next/link";
import type { ReactNode } from "react";
export function Block({ title, href, linkLabel = "Voir tout", children, wide }: { title: string; href?: string; linkLabel?: string; children: ReactNode; wide?: boolean }) {
  return (<section className={`card min-w-0 ${wide ? "lg:col-span-2" : ""}`}>
    <div className="mb-2 flex items-baseline justify-between gap-2"><h2 className="text-sm font-semibold">{title}</h2>{href && <Link href={href} className="text-xs font-medium text-gold-700 hover:underline">{linkLabel}</Link>}</div>
    {children}</section>);
}
