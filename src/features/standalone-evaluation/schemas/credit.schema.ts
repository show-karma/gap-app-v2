import { z } from "zod";

export const CREDIT_PACKS = ["PACK_50", "PACK_100", "PACK_500"] as const;
export const creditPackSchema = z.enum(CREDIT_PACKS);
export type CreditPack = z.infer<typeof creditPackSchema>;

export const creditPurchaseSchema = z.object({
  pack: creditPackSchema,
});
export type CreditPurchaseInput = z.infer<typeof creditPurchaseSchema>;

export interface CreditPackInfo {
  id: CreditPack;
  label: string;
  credits: number;
  priceLabel: string;
  description: string;
}

export const CREDIT_PACK_INFO: Readonly<Record<CreditPack, CreditPackInfo>> = Object.freeze({
  PACK_50: {
    id: "PACK_50",
    label: "Starter",
    credits: 50,
    priceLabel: "$25",
    description: "Try the evaluator on a small batch.",
  },
  PACK_100: {
    id: "PACK_100",
    label: "Standard",
    credits: 100,
    priceLabel: "$45",
    description: "Best value for typical grant rounds.",
  },
  PACK_500: {
    id: "PACK_500",
    label: "Pro",
    credits: 500,
    priceLabel: "$200",
    description: "For high-volume programs.",
  },
});

export const TRANSACTION_TYPES = [
  "SIGNUP_BONUS",
  "PURCHASE",
  "EVALUATION",
  "BULK_EVALUATION",
  "REFUND",
] as const;
export type TransactionType = (typeof TRANSACTION_TYPES)[number];

export interface TransactionResponse {
  id: string;
  amount: number;
  type: TransactionType;
  referenceId: string | null;
  createdAt: string;
}

export interface CreditsResponse {
  balance: number;
  totalPurchased: number;
  totalUsed: number;
  recentTransactions: TransactionResponse[];
}

export interface PurchaseSessionResponse {
  url: string;
  sessionId: string;
}
