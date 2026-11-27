export type SupplierStatus = "Actif" | "Suspendu";
export interface Supplier {
  id: string; name: string; taxId: string; rccm: string; category: string; contactName: string; phone: string; email: string;
  address: string; city: string; paymentTermsDays: number; status: SupplierStatus; createdAt: string;
}

export const URGENCIES = ["Normale", "Urgente", "Critique"] as const;
export type Urgency = (typeof URGENCIES)[number];
export const PURCHASE_REQUEST_STATUSES = ["Brouillon", "En validation", "Rejetée", "Approuvée", "En consultation", "Validation complémentaire", "Commandée", "Clôturée", "Annulée"] as const;
export type PurchaseRequestStatus = (typeof PURCHASE_REQUEST_STATUSES)[number];
export interface PurchaseLine { id: string; designation: string; itemRef?: string; quantity: number; unit: string; estimatedUnitPriceHT: number }
export interface PurchaseRequest {
  id: string; title: string; justification: string; requesterId: string; departmentId: string;
  projectId?: string; taskId?: string; urgency: Urgency; neededBy: string; lines: PurchaseLine[];
  status: PurchaseRequestStatus;
  approvedAmountHT?: number;            // amount covered for issuing the order
  validatedAmountHT?: number;           // amount last validated by a human decision (overrun reference)
  approvalRound?: number;               // incremented at each submission; scopes ValidationRequest.round
  selectedQuoteId?: string; singleSourceReason?: string; overrunReason?: string; cancelReason?: string;
  createdAt: string; submittedAt?: string; approvedAt?: string;
}

export type QuoteStatus = "Reçu" | "Retenu" | "Écarté";
export interface Quote {
  id: string; requestId: string; supplierId: string; supplierRef: string; receivedAt: string; validUntil: string;
  deliveryDays: number; prices: { lineId: string; unitPriceHT: number }[]; vatRateBp: number;
  totalHT: number; totalVAT: number; totalTTC: number; status: QuoteStatus; selectionNote?: string;
}

export type OrderStatus = "Émis" | "Partiellement reçu" | "Reçu" | "Clôturé" | "Annulé";
export interface OrderLine { id: string; requestLineId: string; designation: string; itemRef?: string; unit: string; quantity: number; unitPriceHT: number; cancelledQty: number }
export interface PurchaseOrder {
  id: string; requestId: string; quoteId: string; supplierId: string; projectId?: string;
  lines: OrderLine[]; vatRateBp: number; totalHT: number; totalVAT: number; totalTTC: number;
  expectedDelivery: string; deliveryAddress: string; status: OrderStatus; issuedById: string; issuedAt: string;
  closedAt?: string; closeReason?: string; cancelReason?: string;
}

export interface ReceiptLine { orderLineId: string; received: number; accepted: number; rejected: number; rejectReason?: string }
export interface GoodsReceipt { id: string; orderId: string; receivedById: string; receivedAt: string; deliveryNoteRef: string; lines: ReceiptLine[]; comment?: string }

export type InvoiceStatus = "Enregistrée" | "Conforme" | "En litige" | "Transmise à la Finance" | "Annulée";
export interface InvoiceLine { orderLineId: string; quantity: number; unitPriceHT: number }
export interface SupplierInvoice {
  id: string; orderId: string; supplierId: string; supplierInvoiceNo: string; invoiceDate: string; dueDate: string;
  lines: InvoiceLine[]; vatRateBp: number; totalHT: number; totalVAT: number; totalTTC: number; declaredTTC: number;
  status: InvoiceStatus; issues: string[]; disputeReason?: string; recordedById: string; recordedAt: string; transmittedAt?: string; cancelReason?: string;
}
