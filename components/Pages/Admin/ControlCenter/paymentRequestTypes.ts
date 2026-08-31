export type PaymentRequestStatus = "awaiting_signatures" | "disbursed";

export type OnRequestRecordPayment = (
  milestoneUID: string | null,
  milestoneLabel: string,
  targetStatus: PaymentRequestStatus
) => void;

export type OnRequestDeleteDisbursement = (milestoneUID: string | null) => void;

export interface InitialPaymentMilestone {
  milestoneUID: string | null;
  milestoneLabel: string;
  status: PaymentRequestStatus;
  amount: string | null;
}
