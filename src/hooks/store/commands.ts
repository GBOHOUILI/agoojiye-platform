import { dispatchEvents } from "@/domain/dispatch";
import type { Repositories } from "@/repositories/types";
import { DomainError, type CommandResult } from "@/services/context";

export type Toast = (msg: string, tone?: "ok" | "error") => void;

/** Runs a service command, then turns its events into notifications/activity. Never throws. */
export async function runCommand<T>(repos: Repositories, toast: Toast, fn: () => Promise<CommandResult<T>>, okMsg?: (v: T) => string): Promise<{ ok: true; value: T } | { ok: false }> {
  try {
    const r = await fn();
    await dispatchEvents(repos, r.events);
    if (okMsg) toast(okMsg(r.value));
    return { ok: true, value: r.value };
  } catch (e) {
    if (e instanceof DomainError) toast(e.message, "error");
    else { console.error(e); toast("Erreur inattendue. Consultez la console du navigateur.", "error"); }
    return { ok: false };
  }
}
