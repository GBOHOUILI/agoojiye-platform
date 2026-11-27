import { nowIso } from "@/lib/clock";
import { DB_KEY, LocalDatabase } from "./local/database";
import { createLocalRepositories } from "./local";
import type { Repositories } from "./types";

let instance: { repos: Repositories; db: LocalDatabase } | null = null;

function browserStorage(): Storage | null {
  try { return typeof window !== "undefined" ? window.localStorage : null; } catch { return null; }
}

// Single switch point: replace createLocalRepositories with an HTTP implementation to move to the API.
export function getRepositories(): Repositories {
  if (!instance) {
    const db = new LocalDatabase(browserStorage(), nowIso);
    instance = { db, repos: createLocalRepositories(db, nowIso) };
    if (typeof window !== "undefined") window.addEventListener("storage", e => { if (e.key === DB_KEY) db.reloadFromStorage(); });
  }
  return instance.repos;
}

export const getStorageOutcome = () => instance?.db.outcome;
export type { Repositories } from "./types";
