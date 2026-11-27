const TONES: Record<string, string> = {
  // requests
  Brouillon: "bg-slate-100 text-slate-700", "En validation": "bg-amber-100 text-amber-800", Rejetée: "bg-red-100 text-red-800", Approuvée: "bg-emerald-100 text-emerald-800",
  "En consultation": "bg-sky-100 text-sky-800", "Validation complémentaire": "bg-orange-100 text-orange-800", Commandée: "bg-gold-100 text-gold-800", Clôturée: "bg-slate-200 text-slate-700", Annulée: "bg-slate-100 text-slate-500 line-through",
  // orders
  Émis: "bg-gold-100 text-gold-800", "Partiellement reçu": "bg-orange-100 text-orange-800", Reçu: "bg-emerald-100 text-emerald-800", Clôturé: "bg-slate-200 text-slate-700", Annulé: "bg-slate-100 text-slate-500 line-through",
  // invoices, quotes, suppliers, urgency
  Enregistrée: "bg-slate-100 text-slate-700", Conforme: "bg-emerald-100 text-emerald-800", "En litige": "bg-red-100 text-red-800", "Transmise à la Finance": "bg-ink text-gold-300",
  Reçu_q: "bg-slate-100 text-slate-700", Retenu: "bg-gold-500 text-ink", Écarté: "bg-slate-100 text-slate-500",
  Actif: "bg-emerald-100 text-emerald-800", Suspendu: "bg-red-100 text-red-800",
  Normale: "bg-slate-100 text-slate-700", Urgente: "bg-orange-100 text-orange-800", Critique: "bg-red-600 text-white",
};
export const StatusPill = ({ v, quote }: { v: string; quote?: boolean }) =>
  <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${TONES[quote && v === "Reçu" ? "Reçu_q" : v] ?? "bg-slate-100 text-slate-700"}`}>{v}</span>;
