import { z } from "zod";
import { PURCHASING_RULES } from "@/lib/purchasing/rules";
import { URGENCIES } from "@/types";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date invalide.");
const money = (label: string) => z.number({ invalid_type_error: `${label} : montant requis.` }).int(`${label} : montant entier en FCFA.`).min(0, `${label} : montant positif.`);
const qty = (label: string) => z.number({ invalid_type_error: `${label} : quantité requise.` }).int(`${label} : quantité entière.`).min(0, `${label} : quantité positive.`);
const vatRate = z.number().int().refine(v => PURCHASING_RULES.allowedVatRatesBp.includes(v), "Taux de TVA non autorisé.");
export const reasonSchema = z.string().trim().min(5, "Un motif est requis (5 caractères minimum).");

export const supplierSchema = z.object({
  name: z.string().trim().min(2, "Raison sociale requise."),
  taxId: z.string().trim().min(5, "IFU requis."),
  rccm: z.string().trim().min(3, "RCCM requis."),
  category: z.string().trim().min(2, "Catégorie requise."),
  contactName: z.string().trim().min(2, "Contact requis."),
  phone: z.string().trim().regex(/^\+22[89](\s?\d{2}){4}$/, "Téléphone au format +229 00 00 00 00."),
  email: z.string().trim().email("E-mail invalide."),
  address: z.string().trim().min(2, "Adresse requise."),
  city: z.string().trim().min(2, "Ville requise."),
  paymentTermsDays: z.number().int("Délai de paiement : nombre entier de jours.").min(0, "Délai de paiement invalide.").max(120, "Délai de paiement : 120 jours au plus."),
});
export type SupplierInput = z.input<typeof supplierSchema>;
export const supplierPatchSchema = supplierSchema.partial().extend({ status: z.enum(["Actif", "Suspendu"]).optional() });

export const requestLineSchema = z.object({
  designation: z.string().trim().min(2, "Désignation requise."),
  itemRef: z.string().trim().optional(),
  quantity: qty("Quantité").min(1, "Quantité : au moins 1."),
  unit: z.string().trim().min(1, "Unité requise."),
  estimatedUnitPriceHT: money("Prix unitaire estimé"),
});
export const requestDraftSchema = z.object({
  title: z.string().trim().min(3, "Objet requis (3 caractères minimum)."),
  justification: z.string().trim().min(10, "Justification requise (10 caractères minimum)."),
  urgency: z.enum(URGENCIES),
  neededBy: isoDate,
  projectId: z.string().optional(),
  taskId: z.string().optional(),
  lines: z.array(requestLineSchema).min(1, "Au moins une ligne est requise."),
});
export type RequestDraftInput = z.input<typeof requestDraftSchema>;

export const quoteSchema = z.object({
  supplierId: z.string().min(1, "Fournisseur requis."),
  supplierRef: z.string().trim().min(1, "Référence du devis requise."),
  receivedAt: isoDate, validUntil: isoDate,
  deliveryDays: z.number().int("Délai : nombre entier de jours.").min(0),
  prices: z.array(z.object({ lineId: z.string(), unitPriceHT: money("Prix unitaire") })),
  vatRateBp: vatRate.optional(),
});
export type QuoteInput = z.input<typeof quoteSchema>;

export const orderIssueSchema = z.object({ vatRateBp: vatRate.optional(), expectedDelivery: isoDate, deliveryAddress: z.string().trim().min(3, "Lieu de livraison requis.") });
export type OrderIssueInput = z.input<typeof orderIssueSchema>;

export const receiptSchema = z.object({
  deliveryNoteRef: z.string().trim().min(2, "Référence du bon de livraison requise."),
  lines: z.array(z.object({ orderLineId: z.string(), received: qty("Reçu"), accepted: qty("Accepté"), rejected: qty("Rejeté"), rejectReason: z.string().trim().optional() })),
  comment: z.string().trim().optional(),
});
export type ReceiptInput = z.input<typeof receiptSchema>;

export const invoiceSchema = z.object({
  orderId: z.string().min(1),
  supplierInvoiceNo: z.string().trim().min(2, "Numéro de facture fournisseur requis."),
  invoiceDate: isoDate, dueDate: isoDate,
  lines: z.array(z.object({ orderLineId: z.string(), quantity: qty("Quantité facturée").min(1, "Quantité facturée : au moins 1."), unitPriceHT: money("Prix unitaire facturé") })).min(1, "Au moins une ligne facturée."),
  vatRateBp: vatRate,
  declaredTTC: money("Montant TTC de la facture"),
});
export type InvoiceInput = z.input<typeof invoiceSchema>;
