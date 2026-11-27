"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ReactNode } from "react";
interface Col<T> { h: string; r: (x: T) => ReactNode }
export function DataList<T>({ rows, cols, href }: { rows: T[]; cols: Col<T>[]; href: (x: T) => string }) {
  const router = useRouter();
  if (!rows.length) return <div className="card py-10 text-center text-sm text-slate-500">Aucun résultat pour ces filtres.</div>;
  return (<>
    <div className="card hidden overflow-x-auto p-0 md:block"><table className="w-full text-sm"><thead><tr className="border-b text-left text-xs text-slate-500">{cols.map(c => <th key={c.h} className="px-4 py-3 font-medium">{c.h}</th>)}</tr></thead>
      <tbody>{rows.map((r, i) => <tr key={i} onClick={() => router.push(href(r))} className="cursor-pointer border-b last:border-0 hover:bg-slate-50">{cols.map(c => <td key={c.h} className="px-4 py-3">{c.r(r)}</td>)}</tr>)}</tbody></table></div>
    <div className="space-y-2 md:hidden">{rows.map((r, i) => <Link key={i} href={href(r)} className="card block"><div className="mb-2 font-medium">{cols[0].r(r)} {cols[1] && <span className="ml-1">{cols[1].r(r)}</span>}</div>
      <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">{cols.slice(2).map(c => <div key={c.h} className="min-w-0"><dt className="text-slate-500">{c.h}</dt><dd className="[overflow-wrap:anywhere]">{c.r(r)}</dd></div>)}</dl></Link>)}</div></>);
}
