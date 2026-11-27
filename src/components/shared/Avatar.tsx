import type { User } from "@/types";
import { ROLE_TONE } from "./tones";
const SIZES = { sm: "h-7 w-7 text-[11px]", md: "h-9 w-9 text-xs", lg: "h-12 w-12 text-sm" };
export function Avatar({ user, size = "md" }: { user?: Pick<User, "firstName" | "lastName" | "systemRole">; size?: keyof typeof SIZES }) {
  if (!user) return <span className={`inline-flex shrink-0 items-center justify-center rounded-full border border-dashed border-slate-300 text-slate-400 ${SIZES[size]}`} aria-hidden>?</span>;
  return <span aria-hidden className={`inline-flex shrink-0 items-center justify-center rounded-full bg-white font-semibold text-slate-700 ring-2 ${ROLE_TONE[user.systemRole].ring} ${SIZES[size]}`}>{user.firstName[0]}{user.lastName[0]}</span>;
}
