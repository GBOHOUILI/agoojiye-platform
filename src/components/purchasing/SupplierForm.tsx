"use client";
import { useState } from "react";
import { useDemoStore } from "@/hooks/demo-store";
import { supplierSchema, type SupplierInput } from "@/lib/validations/purchasing";
import type { Supplier } from "@/types";

const FIELDS: { k: keyof SupplierInput; label: string; type?: string; span?: boolean; hint?: string }[] = [
  { k: "name", label: "Raison sociale", span: true }, { k: "taxId", label: "IFU" }, { k: "rccm", label: "RCCM" },
  { k: "category", label: "Catégorie" }, { k: "paymentTermsDays", label: "Délai de paiement (jours)", type: "number" },
  { k: "contactName", label: "Contact" }, { k: "phone", label: "Téléphone", hint: "+229 00 00 00 00" },
  { k: "email", label: "E-mail", type: "email", span: true }, { k: "address", label: "Adresse" }, { k: "city", label: "Ville" },
];

export function SupplierForm({ supplier, onDone }: { supplier?: Supplier; onDone: (id: string) => void }) {
  const s = useDemoStore();
  const [f, setF] = useState<SupplierInput>(supplier ? { ...supplier } : { name: "", taxId: "", rccm: "", category: "", contactName: "", phone: "+229 ", email: "", address: "", city: "Cotonou", paymentTermsDays: 30 });
  const [errors, setErrors] = useState<Record<string, string>>({}), [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const r = supplierSchema.safeParse(f);
    if (!r.success) { setErrors(Object.fromEntries(r.error.issues.map(i => [String(i.path[0]), i.message]))); return; }
    setErrors({}); setBusy(true);
    const id = supplier ? ((await s.updateSupplier(supplier.id, f)) ? supplier.id : null) : await s.createSupplier(f);
    setBusy(false); if (id) onDone(id);
  };
  return (<form onSubmit={submit} className="grid gap-3 sm:grid-cols-2" noValidate>
    {FIELDS.map(({ k, label, type, span, hint }) => (<div key={k} className={span ? "sm:col-span-2" : ""}>
      <label className="field-label" htmlFor={`sf-${k}`}>{label}</label>
      <input id={`sf-${k}`} type={type ?? "text"} placeholder={hint} value={String(f[k] ?? "")} onChange={e => setF({ ...f, [k]: type === "number" ? Number(e.target.value) : e.target.value })} />
      {errors[k] && <p className="field-error">{errors[k]}</p>}</div>))}
    <button disabled={busy} className="btn sm:col-span-2">{supplier ? "Enregistrer les modifications" : "Créer le fournisseur"}</button></form>);
}
