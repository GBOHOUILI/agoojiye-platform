import { documentTotals } from "@/lib/purchasing/money";
import { matchInvoice } from "@/lib/purchasing/invoice-match";
import { PURCHASING_RULES } from "@/lib/purchasing/rules";
import type { ActivityEntry, GoodsReceipt, Notification, PurchaseLine, PurchaseOrder, PurchaseRequest, Quote, Supplier, SupplierInvoice, ValidationRequest } from "@/types";
// Fictitious purchasing data in FCFA (integer amounts). Totals are computed, never typed by hand.
const ts = (d: string, h = "08:00") => `${d}T${h}:00.000Z`;
const VAT = PURCHASING_RULES.defaultVatRateBp;

type S = [id: string, name: string, taxId: string, rccm: string, category: string, contact: string, phone: string, email: string, address: string, city: string, terms: number, status: Supplier["status"]];
const SR: S[] = [
  ["SUP-001", "Atlantique Batteries SARL", "3201812345671", "RB/COT/18 B 21457", "Batteries et énergie", "Rodrigue Akpovi", "+229 00 00 00 01", "ventes@atlantique-batteries.demo", "Zone industrielle d’Akpakpa", "Cotonou", 30, "Actif"],
  ["SUP-002", "Cotonou Électro Industrie", "3201709876542", "RB/COT/17 B 18820", "Électronique", "Mireille Hounsa", "+229 00 00 00 02", "contact@cei-cotonou.demo", "Boulevard de la Marina, Ganhi", "Cotonou", 30, "Actif"],
  ["SUP-003", "Ouémé Mécanique de Précision", "3201911223344", "RB/PNO/19 B 03311", "Mécanique", "Fidèle Dossa", "+229 00 00 00 03", "atelier@oueme-meca.demo", "Quartier Ouando", "Porto-Novo", 45, "Actif"],
  ["SUP-004", "Calavi Outillage Pro", "3202022334455", "RB/ABC/20 B 07764", "Outillage", "Arnaud Gbedji", "+229 00 00 00 04", "devis@calavi-outillage.demo", "Carrefour Kpota", "Abomey-Calavi", 30, "Actif"],
  ["SUP-005", "Borgou Fournitures Générales", "3201633445566", "RB/PKO/16 B 01209", "Fournitures", "Rachida Imorou", "+229 00 00 00 05", "commandes@borgou-fournitures.demo", "Route de Malanville", "Parakou", 15, "Actif"],
  ["SUP-006", "Golfe Composants Lomé", "1000456789", "TG-LOM 2015 B 4521", "Électronique", "Komi Ahadji", "+228 00 00 00 06", "sales@golfe-composants.demo", "Zone portuaire", "Lomé", 60, "Actif"],
  ["SUP-007", "Bénin Transport & Logistique", "3201844556677", "RB/COT/18 B 30115", "Transport", "Basile Adjahouinou", "+229 00 00 00 07", "exploitation@btl.demo", "Port autonome, Zone franche", "Cotonou", 30, "Actif"],
  ["SUP-008", "Sèmè Plasturgie", "3202155667788", "RB/SKP/21 B 00987", "Plasturgie", "Hermione Sossa", "+229 00 00 00 08", "info@seme-plasturgie.demo", "Zone de Sèmè City", "Sèmè-Kpodji", 30, "Suspendu"],
  ["SUP-009", "Ganvié Équipements de Sécurité", "3201766778899", "RB/COT/17 B 22604", "EPI et sécurité", "Euloge Tossou", "+229 00 00 00 09", "pro@ganvie-securite.demo", "Avenue Steinmetz", "Cotonou", 30, "Actif"],
];
export const SUPPLIERS0: Supplier[] = SR.map(([id, name, taxId, rccm, category, contactName, phone, email, address, city, paymentTermsDays, status]) =>
  ({ id, name, taxId, rccm, category, contactName, phone, email, address, city, paymentTermsDays, status, createdAt: ts("2026-06-15") }));

type L = [designation: string, quantity: number, unit: string, price: number, itemRef?: string];
const lines = (ls: L[]): PurchaseLine[] => ls.map(([designation, quantity, unit, estimatedUnitPriceHT, itemRef], i) => ({ id: `L${i + 1}`, designation, quantity, unit, estimatedUnitPriceHT, ...(itemRef ? { itemRef } : {}) }));
const estimate = (ls: PurchaseLine[]) => ls.reduce((s, l) => s + l.quantity * l.estimatedUnitPriceHT, 0);

type R = Omit<PurchaseRequest, "lines" | "createdAt"> & { l: L[]; created: string };
const RQ: R[] = [
  { id: "DA-2026-001", title: "Fournitures de bureau du service qualité", justification: "Réassort trimestriel des fournitures pour les dossiers d’audit ISO.", requesterId: "U-QU2", departmentId: "D-QUA", urgency: "Normale", neededBy: "2026-12-15", status: "Brouillon", created: "2026-11-24",
    l: [["Ramettes papier A4 80 g", 20, "ramette", 3_500], ["Classeurs à levier", 30, "pièce", 1_500]] },
  { id: "DA-2026-002", title: "Carte contrôleur de rechange pour AG-02", justification: "Diagnostic de l’erreur intermittente ANO-006 : remplacement de la carte contrôleur pour essai comparatif.", requesterId: "U-FIF", departmentId: "D-ENG", projectId: "PRJ-02", taskId: "TSK-013", urgency: "Urgente", neededBy: "2026-12-05", status: "En validation", created: "2026-11-23", submittedAt: ts("2026-11-23", "10:00"),
    l: [["Carte contrôleur électronique", 2, "pièce", 385_000, "CTR-001"], ["Kit de câblage et connectique", 1, "lot", 45_000]] },
  { id: "DA-2026-003", title: "Oscilloscope numérique 4 voies", justification: "Mesures fines sur le contrôleur pendant les essais de la version V1.2.", requesterId: "U-MAT", departmentId: "D-ENG", projectId: "PRJ-01", urgency: "Normale", neededBy: "2026-12-20", status: "Rejetée", created: "2026-11-12", submittedAt: ts("2026-11-12", "09:00"),
    l: [["Oscilloscope numérique 4 voies 200 MHz", 1, "pièce", 2_450_000]] },
  { id: "DA-2026-004", title: "Équipements de protection de l’équipe Essais", justification: "Renouvellement des gants isolants et lunettes arrivés en fin de validité.", requesterId: "U-SEG", departmentId: "D-ENG", urgency: "Normale", neededBy: "2026-12-12", status: "Approuvée", approvedAmountHT: 300_000, created: "2026-11-20", submittedAt: ts("2026-11-20", "11:00"), approvedAt: ts("2026-11-21", "15:00"),
    l: [["Gants isolants classe 0", 12, "paire", 18_500], ["Lunettes de protection", 12, "pièce", 6_500]] },
  { id: "DA-2026-005", title: "Cellules lithium pour le banc de cyclage", justification: "Approvisionnement des cellules de test nécessaires à la tâche TSK-018 du banc batterie.", requesterId: "U-AWA", departmentId: "D-ENG", projectId: "PRJ-03", taskId: "TSK-018", urgency: "Critique", neededBy: "2026-12-08", status: "En consultation", approvedAmountHT: 3_370_000, created: "2026-11-16", submittedAt: ts("2026-11-16", "09:30"), approvedAt: ts("2026-11-18", "16:00"),
    l: [["Cellule lithium 21700 5 Ah", 48, "pièce", 62_500, "BAT-001"], ["Carte BMS 16S", 2, "pièce", 185_000]] },
  { id: "DA-2026-006", title: "Connecteurs haute tension et gaines", justification: "Mise en conformité du faisceau haute tension avant validation de TSK-027.", requesterId: "U-ROM", departmentId: "D-ENG", projectId: "PRJ-01", taskId: "TSK-027", urgency: "Urgente", neededBy: "2026-12-04", status: "Validation complémentaire", approvedAmountHT: 480_000, selectedQuoteId: "DEV-003",
    overrunReason: "Hausse du cours du cuivre, prix confirmé par les deux fournisseurs consultés.", created: "2026-11-17", submittedAt: ts("2026-11-17", "08:30"), approvedAt: ts("2026-11-18", "10:00"),
    l: [["Connecteur HT 2 pôles", 40, "pièce", 11_000], ["Gaine thermorétractable", 2, "lot", 20_000]] },
  { id: "DA-2026-007", title: "Disques et plaquettes de frein FRE-001", justification: "Remplacement après l’essai de freinage TES-003 et action corrective ANO-002.", requesterId: "U-ESP", departmentId: "D-ENG", projectId: "PRJ-02", urgency: "Urgente", neededBy: "2026-11-28", status: "Commandée", approvedAmountHT: 484_800, selectedQuoteId: "DEV-005", created: "2026-11-09", submittedAt: ts("2026-11-09", "09:00"), approvedAt: ts("2026-11-10", "11:00"),
    l: [["Disque de frein ventilé", 8, "pièce", 42_000, "FRE-001"], ["Jeu de plaquettes", 16, "jeu", 9_500, "FRE-001"]] },
  { id: "DA-2026-008", title: "Profilés aluminium et visserie du châssis modulaire", justification: "Intégration du châssis modulaire V0.7 (TSK-012).", requesterId: "U-MAT", departmentId: "D-ENG", projectId: "PRJ-02", taskId: "TSK-012", urgency: "Normale", neededBy: "2026-11-25", status: "Commandée", approvedAmountHT: 780_000, selectedQuoteId: "DEV-006", created: "2026-11-02", submittedAt: ts("2026-11-02", "10:00"), approvedAt: ts("2026-11-04", "09:00"),
    l: [["Profilé aluminium 40 × 40, 2 m", 24, "pièce", 28_000, "CHA-001"], ["Visserie inox M8", 10, "lot", 12_500]] },
  { id: "DA-2026-009", title: "Chargeur de laboratoire et câbles", justification: "Équipement du poste de charge du banc batterie.", requesterId: "U-ROM", departmentId: "D-ENG", projectId: "PRJ-03", urgency: "Normale", neededBy: "2026-11-15", status: "Clôturée", approvedAmountHT: 310_000, selectedQuoteId: "DEV-008", created: "2026-10-28", submittedAt: ts("2026-10-28", "09:00"), approvedAt: ts("2026-10-29", "14:00"),
    l: [["Chargeur de laboratoire 60 V 20 A", 1, "pièce", 285_000, "REC-001"], ["Câble de puissance 16 mm²", 4, "pièce", 7_500]] },
  { id: "DA-2026-010", title: "Armoire de cyclage et instrumentation du banc", justification: "Équipement principal du banc d’essai batterie, prévu au budget du projet PRJ-03.", requesterId: "U-FIF", departmentId: "D-ENG", projectId: "PRJ-03", taskId: "TSK-017", urgency: "Normale", neededBy: "2026-12-18", status: "Commandée", approvedAmountHT: 6_310_000, selectedQuoteId: "DEV-009",
    singleSourceReason: "Fabricant unique agréé pour l’armoire de cyclage compatible avec nos cellules.", created: "2026-11-03", submittedAt: ts("2026-11-03", "09:00"), approvedAt: ts("2026-11-10", "17:00"),
    l: [["Armoire de cyclage 16 voies", 1, "pièce", 4_850_000], ["Sonde de température étalonnée", 10, "pièce", 155_000, "SEN-001"]] },
];
export const PURCHASE_REQUESTS0: PurchaseRequest[] = RQ.map(({ l, created, ...r }) => ({ ...r, lines: lines(l), createdAt: ts(created), ...(r.submittedAt ? { approvalRound: 1 } : {}) }));
const req = (id: string) => PURCHASE_REQUESTS0.find(r => r.id === id)!;
export const requestEstimate = (id: string) => estimate(req(id).lines);

type Q = [id: string, requestId: string, supplierId: string, ref: string, received: string, days: number, prices: number[], status: Quote["status"], note?: string];
const QR: Q[] = [
  ["DEV-001", "DA-2026-005", "SUP-001", "AB-2026-311", "2026-11-19", 21, [61_000, 179_000], "Reçu"],
  ["DEV-002", "DA-2026-005", "SUP-006", "GCL/Q/8842", "2026-11-20", 35, [58_500, 195_000], "Reçu"],
  ["DEV-003", "DA-2026-006", "SUP-002", "CEI-DV-1187", "2026-11-19", 7, [12_500, 22_000], "Retenu"],
  ["DEV-004", "DA-2026-006", "SUP-004", "COP-2026-0452", "2026-11-19", 10, [13_000, 21_000], "Reçu"],
  ["DEV-005", "DA-2026-007", "SUP-003", "OMP-D-0219", "2026-11-11", 6, [41_000, 9_800], "Retenu"],
  ["DEV-006", "DA-2026-008", "SUP-003", "OMP-D-0207", "2026-11-05", 10, [27_500, 12_000], "Retenu"],
  ["DEV-007", "DA-2026-008", "SUP-004", "COP-2026-0418", "2026-11-05", 8, [29_000, 12_000], "Écarté"],
  ["DEV-008", "DA-2026-009", "SUP-002", "CEI-DV-1102", "2026-10-30", 5, [280_000, 7_500], "Retenu"],
  ["DEV-009", "DA-2026-010", "SUP-001", "AB-2026-288", "2026-11-11", 30, [4_790_000, 152_000], "Retenu"],
];
export const QUOTES0: Quote[] = QR.map(([id, requestId, supplierId, supplierRef, received, deliveryDays, p, status, selectionNote]) => {
  const prices = req(requestId).lines.map((l, i) => ({ lineId: l.id, unitPriceHT: p[i] }));
  const totals = documentTotals(req(requestId).lines.map((l, i) => ({ quantity: l.quantity, unitPriceHT: p[i] })), VAT);
  return { id, requestId, supplierId, supplierRef, receivedAt: ts(received), validUntil: "2026-12-31", deliveryDays, prices, vatRateBp: VAT, ...totals, status, ...(selectionNote ? { selectionNote } : {}) };
});

type O = [id: string, requestId: string, issued: string, expected: string, status: PurchaseOrder["status"], closed?: string];
const OR: O[] = [
  ["BC-2026-0001", "DA-2026-007", "2026-11-11", "2026-11-20", "Partiellement reçu"],
  ["BC-2026-0002", "DA-2026-008", "2026-11-05", "2026-11-18", "Reçu"],
  ["BC-2026-0003", "DA-2026-009", "2026-10-30", "2026-11-06", "Clôturé", "2026-11-14"],
  ["BC-2026-0004", "DA-2026-010", "2026-11-11", "2026-12-18", "Émis"],
];
export const PURCHASE_ORDERS0: PurchaseOrder[] = OR.map(([id, requestId, issued, expectedDelivery, status, closed], n) => {
  const r = req(requestId), q = QUOTES0.find(x => x.id === r.selectedQuoteId)!;
  const ls = r.lines.map((l, i) => ({ id: `OL${i + 1}`, requestLineId: l.id, designation: l.designation, unit: l.unit, quantity: l.quantity, unitPriceHT: q.prices[i].unitPriceHT, cancelledQty: 0, ...(l.itemRef ? { itemRef: l.itemRef } : {}) }));
  return { id, requestId, quoteId: q.id, supplierId: q.supplierId, ...(r.projectId ? { projectId: r.projectId } : {}), lines: ls, vatRateBp: VAT, ...documentTotals(ls, VAT),
    expectedDelivery, deliveryAddress: n === 2 || n === 3 ? "Banc d’essai batterie, site de Sèmè" : "Atelier prototypes, Cotonou", status, issuedById: "U-ACH", issuedAt: ts(issued, "14:00"),
    ...(closed ? { closedAt: ts(closed, "16:00") } : {}) };
});

export const RECEIPTS0: GoodsReceipt[] = [
  { id: "REC-001", orderId: "BC-2026-0001", receivedById: "U-MAG", receivedAt: ts("2026-11-19", "10:30"), deliveryNoteRef: "BL-OMP-5521",
    lines: [{ orderLineId: "OL1", received: 8, accepted: 6, rejected: 2, rejectReason: "Voile constaté au contrôle dimensionnel" }, { orderLineId: "OL2", received: 16, accepted: 16, rejected: 0 }] },
  { id: "REC-002", orderId: "BC-2026-0002", receivedById: "U-MAG", receivedAt: ts("2026-11-12", "09:00"), deliveryNoteRef: "BL-OMP-5480",
    lines: [{ orderLineId: "OL1", received: 12, accepted: 12, rejected: 0 }, { orderLineId: "OL2", received: 10, accepted: 10, rejected: 0 }] },
  { id: "REC-003", orderId: "BC-2026-0002", receivedById: "U-SEG", receivedAt: ts("2026-11-17", "15:00"), deliveryNoteRef: "BL-OMP-5507",
    lines: [{ orderLineId: "OL1", received: 12, accepted: 12, rejected: 0 }, { orderLineId: "OL2", received: 0, accepted: 0, rejected: 0 }] },
  { id: "REC-004", orderId: "BC-2026-0003", receivedById: "U-ROM", receivedAt: ts("2026-11-05", "11:00"), deliveryNoteRef: "BL-CEI-2210",
    lines: [{ orderLineId: "OL1", received: 1, accepted: 1, rejected: 0 }, { orderLineId: "OL2", received: 4, accepted: 4, rejected: 0 }] },
];

type I = [id: string, orderId: string, no: string, date: string, ls: [string, number, number][], status: SupplierInvoice["status"], declared?: number, extra?: Partial<SupplierInvoice>];
const IR: I[] = [
  ["FAC-001", "BC-2026-0001", "OMP-F-2026-0310", "2026-11-20", [["OL1", 6, 41_000], ["OL2", 16, 9_800]], "Annulée", undefined, { cancelReason: "Numéro de facture mal saisi, facture à ressaisir." }],
  ["FAC-002", "BC-2026-0002", "OMP-F-2026-0288", "2026-11-13", [["OL1", 12, 27_500], ["OL2", 10, 12_000]], "Conforme"],
  ["FAC-003", "BC-2026-0002", "OMP-F-2026-0301", "2026-11-18", [["OL1", 12, 28_000]], "En litige"],
  ["FAC-004", "BC-2026-0003", "CEI-FA-7719", "2026-11-07", [["OL1", 1, 280_000], ["OL2", 4, 7_500]], "Transmise à la Finance", undefined, { transmittedAt: ts("2026-11-14", "15:30") }],
];
// Issues come from the real three-way matching (earlier invoices of the same order), never typed by hand.
export const INVOICES0: SupplierInvoice[] = IR.reduce<SupplierInvoice[]>((acc, [id, orderId, supplierInvoiceNo, date, ls, status, declared, extra]) => {
  const o = PURCHASE_ORDERS0.find(x => x.id === orderId)!;
  const il = ls.map(([orderLineId, quantity, unitPriceHT]) => ({ orderLineId, quantity, unitPriceHT }));
  const totals = documentTotals(il, VAT);
  const declaredTTC = declared ?? totals.totalTTC;
  const issues = status === "Annulée" ? [] : matchInvoice({ lines: il, vatRateBp: VAT, declaredTTC }, o, RECEIPTS0, acc.filter(i => i.orderId === orderId)).issues;
  return [...acc, { id, orderId, supplierId: o.supplierId, supplierInvoiceNo, invoiceDate: date, dueDate: "2026-12-20", lines: il, vatRateBp: VAT, ...totals, declaredTTC,
    status, issues, ...(issues.length ? { disputeReason: "Écart au rapprochement avec le bon de commande et les réceptions." } : {}), recordedById: "U-ACH", recordedAt: ts(date, "16:00"), ...extra }];
}, []);

type V = [subjectId: string, step: NonNullable<ValidationRequest["step"]>, validatorId: string, status: ValidationRequest["status"], requested: string, decided?: string, comment?: string];
const VR: V[] = [
  ["DA-2026-002", "Responsable", "U-NAD", "Approuvée", "2026-11-23", "2026-11-24"],
  ["DA-2026-002", "Finance", "U-FIN", "En attente", "2026-11-24"],
  ["DA-2026-003", "Responsable", "U-KAR", "Approuvée", "2026-11-12", "2026-11-13"],
  ["DA-2026-003", "Finance", "U-FIN", "Rejetée", "2026-11-13", "2026-11-14", "Matériel équivalent disponible sur le banc de PRJ-03 : mutualiser l’usage."],
  ["DA-2026-004", "Responsable", "U-NAD", "Approuvée", "2026-11-20", "2026-11-21"],
  ["DA-2026-005", "Responsable", "U-YAN", "Approuvée", "2026-11-16", "2026-11-17"],
  ["DA-2026-005", "Finance", "U-FIN", "Approuvée", "2026-11-17", "2026-11-18"],
  ["DA-2026-006", "Responsable", "U-KAR", "Approuvée", "2026-11-17", "2026-11-18"],
  ["DA-2026-006", "Finance", "U-FIN", "En attente", "2026-11-20"],
  ["DA-2026-007", "Responsable", "U-NAD", "Approuvée", "2026-11-09", "2026-11-10"],
  ["DA-2026-008", "Responsable", "U-NAD", "Approuvée", "2026-11-02", "2026-11-03"],
  ["DA-2026-008", "Finance", "U-FIN", "Approuvée", "2026-11-03", "2026-11-04"],
  ["DA-2026-009", "Responsable", "U-YAN", "Approuvée", "2026-10-28", "2026-10-29"],
  ["DA-2026-010", "Responsable", "U-YAN", "Approuvée", "2026-11-03", "2026-11-04"],
  ["DA-2026-010", "Finance", "U-FIN", "Approuvée", "2026-11-04", "2026-11-06"],
  ["DA-2026-010", "Direction", "U-DIR", "Approuvée", "2026-11-06", "2026-11-10"],
];
export const PURCHASE_VALIDATIONS0: ValidationRequest[] = VR.map(([subjectId, step, validatorId, status, requested, decided, comment], i) => {
  const r = req(subjectId);
  return { id: `VAL-${String(101 + i)}`, subjectType: "purchase_request", subjectId, step, round: 1, authorId: r.requesterId, ownerId: r.requesterId, validatorId, status,
    requestedAt: ts(requested, "09:00"), ...(decided ? { decidedAt: ts(decided, "11:00") } : {}), ...(comment ? { comment } : {}) };
});

type N = [recipient: string, type: string, priority: Notification["priority"], title: string, body: string, link: string, entityId: string, at: string, read: boolean];
const NR: N[] = [
  ["U-FIN", "purchase.approval_requested", "Haute", "Validation d’achat : DA-2026-002", "Étape Finance — Carte contrôleur de rechange pour AG-02 (815 000 FCFA HT).", "/purchasing/requests/DA-2026-002", "DA-2026-002", "2026-11-24", false],
  ["U-FIN", "purchase.approval_requested", "Haute", "Validation complémentaire : DA-2026-006", "Le devis retenu (544 000 FCFA HT) dépasse le seuil Finance.", "/purchasing/requests/DA-2026-006", "DA-2026-006", "2026-11-20", false],
  ["U-MAT", "purchase.request_rejected", "Haute", "Demande d’achat rejetée : DA-2026-003", "Olivier Dansou : « Matériel équivalent disponible sur le banc de PRJ-03 : mutualiser l’usage. »", "/purchasing/requests/DA-2026-003", "DA-2026-003", "2026-11-14", true],
  ["U-ACH", "purchase.request_approved", "Normale", "Demande d’achat approuvée : DA-2026-004", "Équipements de protection de l’équipe Essais — à mettre en consultation.", "/purchasing/requests/DA-2026-004", "DA-2026-004", "2026-11-21", false],
  ["U-ACH", "purchase.nonconformity", "Haute", "Non-conformité à la réception : BC-2026-0001", "2 disques de frein rejetés : voile constaté au contrôle dimensionnel.", "/purchasing/orders/BC-2026-0001", "BC-2026-0001", "2026-11-19", false],
  ["U-QUA", "purchase.nonconformity", "Haute", "Non-conformité à la réception : BC-2026-0001", "2 disques de frein rejetés : voile constaté au contrôle dimensionnel.", "/purchasing/orders/BC-2026-0001", "BC-2026-0001", "2026-11-19", false],
  ["U-ACH", "purchase.invoice_disputed", "Haute", "Facture en litige : FAC-003", "Prix unitaire différent du bon de commande BC-2026-0002.", "/purchasing/orders/BC-2026-0002", "FAC-003", "2026-11-18", false],
  ["U-FIN", "purchase.invoice_transmitted", "Normale", "Facture transmise : FAC-004", "Cotonou Électro Industrie, 365 800 FCFA TTC (BC-2026-0003).", "/purchasing/orders/BC-2026-0003", "FAC-004", "2026-11-14", true],
];
export const PURCHASE_NOTIFICATIONS0: Omit<Notification, "id">[] = NR.map(([recipientId, type, priority, title, body, link, entityId, at, read]) => ({
  recipientId, type, priority, title, body, link, entityType: "purchase", entityId, createdAt: ts(at, "12:00"), ...(read ? { readAt: ts(at, "13:00") } : {}) }));

type A = [at: string, actor: string, action: string, entityId: string, summary: string];
const AR: A[] = [
  ["2026-11-11", "U-ACH", "purchase.order_issued", "BC-2026-0001", "Josiane Akplogan a émis le bon de commande BC-2026-0001 (Ouémé Mécanique de Précision)."],
  ["2026-11-14", "U-FIN", "purchase.request_rejected", "DA-2026-003", "Olivier Dansou a rejeté la demande d’achat DA-2026-003."],
  ["2026-11-14", "U-ACH", "purchase.invoice_transmitted", "FAC-004", "Josiane Akplogan a transmis la facture FAC-004 à la Finance."],
  ["2026-11-18", "U-ACH", "purchase.invoice_disputed", "FAC-003", "Facture FAC-003 placée en litige : prix unitaire différent du bon de commande."],
  ["2026-11-19", "U-MAG", "purchase.goods_received", "BC-2026-0001", "Ulrich Tchibozo a réceptionné BC-2026-0001 : 22 acceptés, 2 rejetés."],
  ["2026-11-20", "U-ACH", "purchase.quote_selected", "DA-2026-006", "Josiane Akplogan a retenu le devis DEV-003 (dépassement justifié)."],
  ["2026-11-24", "U-NAD", "purchase.approval_requested", "DA-2026-002", "Nadia Sossou a approuvé DA-2026-002 (étape Responsable)."],
];
export const PURCHASE_ACTIVITY0: Omit<ActivityEntry, "id">[] = AR.map(([at, actorId, action, entityId, summary]) => ({ at: ts(at, "14:00"), actorId, action, entityType: "purchase", entityId, summary }));
