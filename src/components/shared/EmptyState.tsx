import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
export function EmptyState({ icon: Icon, title, text, action }: { icon: LucideIcon; title: string; text?: string; action?: ReactNode }) {
  return (<div className="flex flex-col items-center px-4 py-8 text-center">
    <Icon className="mb-2 text-slate-300" size={28} aria-hidden /><p className="text-sm font-medium text-slate-700">{title}</p>
    {text && <p className="mt-1 max-w-sm text-sm text-slate-500">{text}</p>}{action && <div className="mt-3">{action}</div>}</div>);
}
