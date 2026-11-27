"use client";
import { useState } from "react";
import { useDemoStore } from "@/hooks/demo-store";
import type { ValidationRequest } from "@/types";

/** Approve / reject (mandatory reason) a purchase approval step. Only rendered for the designated validator. */
export function PurchaseDecision({ validation }: { validation: ValidationRequest }) {
  const s = useDemoStore();
  const [rejecting, setRejecting] = useState(false), [reason, setReason] = useState(""), [busy, setBusy] = useState(false);
  if (validation.status !== "En attente" || validation.validatorId !== s.currentUser.id) return null;
  const act = async (d: "approve" | "reject") => { setBusy(true); const ok = await s.decideValidation(validation.id, d, d === "reject" ? reason : undefined); setBusy(false); if (ok) { setRejecting(false); setReason(""); } };
  return rejecting
    ? <form className="flex w-full flex-col gap-2 sm:flex-row" onSubmit={e => { e.preventDefault(); void act("reject"); }}>
        <input autoFocus value={reason} onChange={e => setReason(e.target.value)} placeholder="Motif du rejet (obligatoire)" aria-label="Motif du rejet" />
        <div className="flex gap-2"><button disabled={busy} className="btn-danger btn-sm">Rejeter</button><button type="button" className="btn-o btn-sm" onClick={() => setRejecting(false)}>Annuler</button></div></form>
    : <div className="flex flex-wrap gap-2"><button disabled={busy} className="btn btn-sm" onClick={() => void act("approve")}>Approuver (étape {validation.step})</button>
        <button disabled={busy} className="btn-o btn-sm text-red-700" onClick={() => setRejecting(true)}>Rejeter…</button></div>;
}
