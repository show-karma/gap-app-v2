import {
  ClipboardDocumentIcon,
  ExclamationTriangleIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { memo } from "react";
import { KycStatusBadge } from "@/components/KycStatusIcon";
import { DatePicker } from "@/components/Utilities/DatePicker";
import { Button } from "@/components/ui/button";
import {
  type CommunityPayoutAgreementInfo,
  formatDisplayAmount,
  fromSmallestUnit,
  type PayoutDisbursement,
  TokenBreakdown,
  type TokenTotal,
  type useToggleAgreement,
} from "@/src/features/payout-disbursement";
import type { KycStatusResponse } from "@/types/kyc";
import { formatAddressForDisplay } from "@/utilities/donations/helpers";
import { formatDate } from "@/utilities/formatDate";
import { cn } from "@/utilities/tailwind";
import type { ProjectDetailsSidebarGrant } from "./ProjectDetailsSidebar";

export interface DetailsSectionProps {
  grant: ProjectDetailsSidebarGrant;
  kycStatus: KycStatusResponse | null;
  agreement: CommunityPayoutAgreementInfo | null;
  localAgreementSigned: boolean;
  agreementDate: Date | undefined;
  confirmingUnsign: boolean;
  setConfirmingUnsign: (v: boolean) => void;
  toggleAgreementMutation: ReturnType<typeof useToggleAgreement>;
  handleSignAgreement: (date?: Date) => void;
  handleUnsignAgreement: () => void;
  setAgreementDate: (date: Date | undefined) => void;
  handleCopyAddress: () => void;
  totalsByToken: TokenTotal[];
  remainingBalance: {
    approved: number;
    totalDisbursed: number;
    remaining: number;
    pct: number;
  } | null;
  awaitingTx: PayoutDisbursement | null;
  chainInfo: { chainID: number; token: string; tokenDecimals: number } | null;
  milestoneSummary: { total: number; received: number; completed: number; paid: number } | null;
  invoiceRequired: boolean;
}

export const DetailsSection = memo(function DetailsSection({
  grant,
  kycStatus,
  agreement,
  localAgreementSigned,
  agreementDate,
  confirmingUnsign,
  setConfirmingUnsign,
  toggleAgreementMutation,
  handleSignAgreement,
  handleUnsignAgreement,
  setAgreementDate,
  handleCopyAddress,
  totalsByToken,
  remainingBalance,
  awaitingTx,
  chainInfo,
  milestoneSummary,
  invoiceRequired,
}: DetailsSectionProps) {
  return (
    <div className="space-y-4">
      {/* Status panel */}
      <div className="rounded-lg bg-gray-50 dark:bg-zinc-900 p-3 space-y-2.5">
        {/* KYC + Agreement row */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-gray-500 dark:text-zinc-400">KYC/KYB:</span>
            <KycStatusBadge status={kycStatus} showValidityInLabel={false} />
          </div>
          <div className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-white dark:bg-zinc-800/50">
            <span className="text-xs font-medium text-gray-500 dark:text-zinc-400">Agreement:</span>
            {confirmingUnsign ? (
              <div className="flex items-center gap-2 px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50">
                <span className="text-xs text-amber-700 dark:text-amber-300">
                  Mark as unsigned?
                </span>
                <Button
                  size="sm"
                  variant="destructive"
                  className="h-5 px-2 text-[11px]"
                  onClick={handleUnsignAgreement}
                  aria-label="Confirm unsign agreement"
                >
                  Confirm
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-5 px-2 text-[11px]"
                  onClick={() => setConfirmingUnsign(false)}
                  aria-label="Cancel unsign agreement"
                >
                  Cancel
                </Button>
              </div>
            ) : localAgreementSigned ? (
              <div className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
                  Signed {agreementDate ? formatDate(agreementDate, "UTC") : ""}
                </span>
                {agreement?.signedBy && (
                  <span
                    className="text-[10px] text-gray-400 dark:text-zinc-500"
                    title={agreement.signedBy}
                  >
                    by {formatAddressForDisplay(agreement.signedBy)}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => setConfirmingUnsign(true)}
                  disabled={toggleAgreementMutation.isPending}
                  className="ml-0.5 p-0.5 rounded hover:bg-gray-100 dark:hover:bg-zinc-700 text-gray-400 dark:text-zinc-500 hover:text-gray-600 dark:hover:text-zinc-300 transition-colors disabled:opacity-50"
                  aria-label="Remove agreement signed date"
                  title="Mark as unsigned"
                >
                  <XMarkIcon className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-gray-400 dark:text-zinc-500">Not signed</span>
                <span className="text-[10px] text-gray-300 dark:text-zinc-600">&mdash;</span>
                <DatePicker
                  selected={agreementDate}
                  onSelect={(date) => {
                    setAgreementDate(date);
                    handleSignAgreement(date);
                  }}
                  maxDate={new Date()}
                  placeholder="Pick a date"
                  buttonClassName="h-6 text-xs px-2 py-0.5 bg-white dark:bg-zinc-900"
                  ariaLabel="Set agreement signed date"
                />
                {toggleAgreementMutation.isPending && (
                  <span className="text-[11px] text-gray-400 dark:text-zinc-500 animate-pulse">
                    Saving...
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Payout summary */}
        <div className="flex items-center gap-5 flex-wrap text-xs text-gray-500 dark:text-zinc-400">
          <div className="flex items-center gap-1.5">
            <span className="font-medium">Address:</span>
            {grant.currentPayoutAddress ? (
              <button
                type="button"
                onClick={handleCopyAddress}
                className="inline-flex items-center gap-1 font-mono hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer"
                title={`Click to copy: ${grant.currentPayoutAddress}`}
              >
                {formatAddressForDisplay(grant.currentPayoutAddress)}
                <ClipboardDocumentIcon className="h-3 w-3 opacity-50" />
              </button>
            ) : (
              <span className="text-amber-600 dark:text-amber-400 italic font-sans">
                Not configured
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-medium">Approved:</span>
            <span className="tabular-nums text-sm text-gray-700 dark:text-zinc-300">
              {grant.currentAmount && parseFloat(grant.currentAmount) > 0
                ? `${formatDisplayAmount(grant.currentAmount)}${grant.currency ? ` ${grant.currency}` : ""}`
                : "\u2014"}
            </span>
          </div>
          {totalsByToken.length > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="font-medium">Disbursed:</span>
              <span className="text-sm">
                <TokenBreakdown totalsByToken={totalsByToken} size="sm" />
              </span>
            </div>
          )}
        </div>

        {/* Remaining balance progress */}
        {remainingBalance && (
          <div className="flex items-center gap-3">
            <div className="flex-1 h-1.5 rounded-full bg-gray-200 dark:bg-zinc-700 overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all",
                  remainingBalance.pct >= 100
                    ? "bg-green-500"
                    : remainingBalance.pct >= 75
                      ? "bg-blue-500"
                      : "bg-blue-400"
                )}
                style={{ width: `${Math.min(100, remainingBalance.pct)}%` }}
              />
            </div>
            <span className="text-[10px] tabular-nums text-gray-400 dark:text-zinc-500 whitespace-nowrap">
              {remainingBalance.pct}% disbursed
              {remainingBalance.remaining > 0 && (
                <> · {formatDisplayAmount(String(remainingBalance.remaining))} remaining</>
              )}
            </span>
          </div>
        )}
      </div>

      {/* Awaiting signatures banner */}
      {awaitingTx && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50">
          <ExclamationTriangleIcon className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
          <span className="text-xs text-amber-700 dark:text-amber-300">
            Awaiting Safe signatures{" — "}
            {formatDisplayAmount(
              String(
                fromSmallestUnit(awaitingTx.disbursedAmount || "0", awaitingTx.tokenDecimals ?? 6)
              )
            )}{" "}
            {awaitingTx.token}
            {awaitingTx.createdAt && (
              <span className="text-amber-500 dark:text-amber-400/70">
                {" "}
                since {formatDate(awaitingTx.createdAt, "UTC")}
              </span>
            )}
          </span>
        </div>
      )}

      {/* Milestone completion summary */}
      {milestoneSummary && (
        <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-zinc-400">
          <span>
            <span className="font-medium text-gray-700 dark:text-zinc-300">
              {milestoneSummary.received}/{milestoneSummary.total}
            </span>{" "}
            {milestoneSummary.total === 1 ? "invoice" : "invoices"} received
          </span>
          <span>
            <span className="font-medium text-gray-700 dark:text-zinc-300">
              {milestoneSummary.completed}/{milestoneSummary.total}
            </span>{" "}
            {milestoneSummary.total === 1 ? "milestone" : "milestones"} completed
          </span>
          <span>
            <span className="font-medium text-gray-700 dark:text-zinc-300">
              {milestoneSummary.paid}/{milestoneSummary.total}
            </span>{" "}
            {milestoneSummary.total === 1 ? "milestone" : "milestones"} paid
          </span>
        </div>
      )}
    </div>
  );
});
