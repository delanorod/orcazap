export type QuotePdfData = {
  businessName: string;
  businessPhone?: string | null;
  clientName: string;
  createdAt: string;
  validUntil: string;
  items: { description: string; quantity: number; unitPrice: number; lineTotal: number }[];
  subtotal: number;
  discountPercent: number;
  total: number;
  notes?: string | null;
};