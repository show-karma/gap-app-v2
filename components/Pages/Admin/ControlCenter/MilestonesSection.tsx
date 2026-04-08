import {
  ArrowDownTrayIcon,
  ExclamationTriangleIcon,
  PaperClipIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { memo, useCallback, useState } from "react";
import toast from "react-hot-toast";
import { FileUpload } from "@/components/Utilities/FileUpload";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  type CommunityPayoutInvoiceInfo,
  formatDisplayAmount,
  getInvoiceDownloadUrl,
  MilestoneLifecycleStatus,
} from "@/src/features/payout-disbursement";
import { formatAddressForDisplay } from "@/utilities/donations/helpers";
import { formatDate } from "@/utilities/formatDate";
import { formatMilestoneTitle } from "@/utilities/formatMilestoneTitle";
import { INDEXER } from "@/utilities/indexer";
import { cn } from "@/utilities/tailwind";
import { PaymentStatusDropdown } from "./PaymentStatusDropdown";
import type { ProjectDetailsSidebarGrant } from "./ProjectDetailsSidebar";

const milestoneStatusConfig: Record<
  MilestoneLifecycleStatus,
  { label: string; dotColor: string; textColor: string }
> = {
  [MilestoneLifecycleStatus.PENDING]: {
    label: "Pending",
    dotColor: "bg-gray-300 dark:bg-zinc-600",
    textColor: "text-gray-500 dark:text-zinc-500",
  },
  [MilestoneLifecycleStatus.COMPLETED]: {
    label: "Completed",
    dotColor: "bg-blue-400",
    textColor: "text-blue-600 dark:text-blue-400",
  },
  [MilestoneLifecycleStatus.VERIFIED]: {
    label: "Verified",
    dotColor: "bg-green-500",
    textColor: "text-green-600 dark:text-green-400",
  },
  [MilestoneLifecycleStatus.PAST_DUE]: {
    label: "Past due",
    dotColor: "bg-amber-500",
    textColor: "text-amber-600 dark:text-amber-400",
  },
};

function getEffectiveMilestoneStatus(
  milestoneStatus: MilestoneLifecycleStatus | null,
  milestoneDueDate: string | null
): MilestoneLifecycleStatus {
  const status = milestoneStatus || MilestoneLifecycleStatus.PENDING;
  if (status === MilestoneLifecycleStatus.PENDING && milestoneDueDate) {
    const due = new Date(milestoneDueDate);
    if (due.getTime() < Date.now()) {
      return MilestoneLifecycleStatus.PAST_DUE;
    }
  }
  return status;
}

function getMilestoneStatusTooltip(
  effectiveStatus: MilestoneLifecycleStatus,
  statusUpdatedAt: string | null,
  dueDate: string | null
): string {
  const fmtDate = (iso: string) => formatDate(iso, "UTC");
  switch (effectiveStatus) {
    case MilestoneLifecycleStatus.COMPLETED:
      return statusUpdatedAt ? `Completed on ${fmtDate(statusUpdatedAt)}` : "Completed";
    case MilestoneLifecycleStatus.VERIFIED:
      return statusUpdatedAt ? `Verified on ${fmtDate(statusUpdatedAt)}` : "Verified";
    case MilestoneLifecycleStatus.PAST_DUE:
      return dueDate ? `Due ${fmtDate(dueDate)}` : "Past due";
    case MilestoneLifecycleStatus.PENDING: {
      const parts: string[] = [];
      if (statusUpdatedAt) parts.push(`Created ${fmtDate(statusUpdatedAt)}`);
      if (dueDate) parts.push(`Due ${fmtDate(dueDate)}`);
      return parts.length > 0 ? parts.join(" · ") : "Pending";
    }
    default:
      return effectiveStatus;
  }
}

// ─── Component ───────────────────────────────────────────────────────────────

export interface MilestonesSectionProps {
  grant: ProjectDetailsSidebarGrant;
  communityUID: string;
  milestoneInvoices: CommunityPayoutInvoiceInfo[];
  invoiceRequired: boolean;
  milestoneEdits: Record<
    string,
    { invoiceReceivedAt?: string | null; milestoneUID?: string | null }
  >;
  pendingFiles: Record<
    string,
    {
      milestoneLabel: string;
      milestoneUID: string | null;
      invoiceFileUrl: string;
      invoiceFileKey: string;
    }
  >;
  allocationByUID: Map<string, string>;
  todayLocal: string;
  getMilestoneKey: (invoice: CommunityPayoutInvoiceInfo, idx: number) => string;
  getInvoiceReceivedDate: (invoice: CommunityPayoutInvoiceInfo, idx: number) => string | null;
  handleInvoiceReceivedDateChange: (
    milestoneKey: string,
    milestoneUID: string | null,
    dateValue: string
  ) => void;
  onFileUploaded: (
    mKey: string,
    milestoneLabel: string,
    milestoneUID: string | null,
    invoiceFileUrl: string,
    invoiceFileKey: string
  ) => void;
  removedFiles: Set<string>;
  onFileRemoved: (mKey: string) => void;
  onRequestRecordPayment?: (
    milestoneLabel: string,
    targetStatus: "awaiting_signatures" | "disbursed"
  ) => void;
  onRequestDeleteDisbursement?: (milestoneLabel: string) => void;
}

export const MilestonesSection = memo(function MilestonesSection({
  grant,
  communityUID,
  milestoneInvoices,
  invoiceRequired,
  milestoneEdits,
  pendingFiles,
  allocationByUID,
  todayLocal,
  getMilestoneKey,
  getInvoiceReceivedDate,
  handleInvoiceReceivedDateChange,
  onFileUploaded,
  removedFiles,
  onFileRemoved,
  onRequestRecordPayment,
  onRequestDeleteDisbursement,
}: MilestonesSectionProps) {
  const [uploadModalInvoice, setUploadModalInvoice] = useState<{
    mKey: string;
    label: string;
    milestoneUID: string | null;
  } | null>(null);
  const [loadingFileKeys, setLoadingFileKeys] = useState<Set<string>>(new Set());

  const handleViewFile = useCallback(
    async (fileKey: string) => {
      setLoadingFileKeys((prev) => new Set(prev).add(fileKey));
      try {
        const downloadUrl = await getInvoiceDownloadUrl(grant.grantUid, fileKey);
        window.open(downloadUrl, "_blank", "noopener,noreferrer");
      } catch {
        toast.error("Failed to get download link");
      } finally {
        setLoadingFileKeys((prev) => {
          const next = new Set(prev);
          next.delete(fileKey);
          return next;
        });
      }
    },
    [grant.grantUid]
  );

  const handleFileUploaded = useCallback(
    (_finalUrl: string, tempKey: string) => {
      if (!uploadModalInvoice) return;

      onFileUploaded(
        uploadModalInvoice.mKey,
        uploadModalInvoice.label,
        uploadModalInvoice.milestoneUID,
        _finalUrl,
        tempKey
      );

      // Auto-populate received date to today only if not already set
      const invoiceIdx = milestoneInvoices.findIndex(
        (inv, idx) => getMilestoneKey(inv, idx) === uploadModalInvoice.mKey
      );
      const existingDate =
        invoiceIdx >= 0 ? getInvoiceReceivedDate(milestoneInvoices[invoiceIdx], invoiceIdx) : null;

      if (!existingDate) {
        handleInvoiceReceivedDateChange(
          uploadModalInvoice.mKey,
          uploadModalInvoice.milestoneUID,
          todayLocal
        );
      }

      setUploadModalInvoice(null);
    },
    [
      uploadModalInvoice,
      onFileUploaded,
      todayLocal,
      handleInvoiceReceivedDateChange,
      milestoneInvoices,
      getMilestoneKey,
      getInvoiceReceivedDate,
    ]
  );

  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-900 dark:text-zinc-100 mb-1">
        Milestones ({milestoneInvoices.length})
      </h3>
      {invoiceRequired && (
        <p className="text-xs text-gray-400 dark:text-zinc-500 mb-3">
          Attach invoice files or set received dates. Save changes when done.
        </p>
      )}

      {milestoneInvoices.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-zinc-400 py-4 text-center">
          No milestones configured yet.
        </p>
      ) : (
        <TooltipProvider delayDuration={150}>
          <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-zinc-700">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-zinc-800 border-b border-gray-200 dark:border-zinc-700">
                  <th className="text-left py-3 px-3 font-medium text-gray-600 dark:text-zinc-400 min-w-[140px]">
                    Milestone
                  </th>
                  <th className="text-center py-3 px-3 font-medium text-gray-600 dark:text-zinc-400 min-w-[100px]">
                    Milestone Status
                  </th>
                  <th className="text-right py-3 px-3 font-medium text-gray-600 dark:text-zinc-400 min-w-[80px]">
                    Allocation
                  </th>
                  {invoiceRequired && (
                    <th className="text-center py-3 px-3 font-medium text-gray-600 dark:text-zinc-400 min-w-[160px]">
                      Invoice
                    </th>
                  )}
                  <th className="text-center py-3 px-3 font-medium text-gray-600 dark:text-zinc-400 min-w-[110px]">
                    Payment
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
                {milestoneInvoices.map((invoice, idx) => {
                  const mKey = getMilestoneKey(invoice, idx);
                  const receivedDateValue = getInvoiceReceivedDate(invoice, idx);
                  const effectiveMsStatus = getEffectiveMilestoneStatus(
                    invoice.milestoneStatus,
                    invoice.milestoneDueDate
                  );
                  const msCfg =
                    milestoneStatusConfig[effectiveMsStatus] ??
                    milestoneStatusConfig[MilestoneLifecycleStatus.PENDING];
                  const msTooltip = getMilestoneStatusTooltip(
                    effectiveMsStatus,
                    invoice.milestoneStatusUpdatedAt,
                    invoice.milestoneDueDate
                  );
                  const isRemoved = removedFiles.has(mKey);
                  const isEdited =
                    milestoneEdits[mKey] !== undefined ||
                    pendingFiles[mKey] !== undefined ||
                    isRemoved;
                  const isCleared =
                    milestoneEdits[mKey] !== undefined &&
                    milestoneEdits[mKey]?.invoiceReceivedAt === null &&
                    invoice.invoiceReceivedAt !== null;
                  const hasFile = (!isRemoved && !!invoice.invoiceFileKey) || !!pendingFiles[mKey];
                  const hasPendingFile = !!pendingFiles[mKey];
                  const hasReceivedDate = !!receivedDateValue;

                  return (
                    <tr
                      key={
                        invoice.milestoneUID
                          ? `${invoice.milestoneUID}-${idx}`
                          : `${formatMilestoneTitle(idx, invoice.milestoneLabel)}-${idx}`
                      }
                      className={cn(
                        "transition-colors",
                        isCleared
                          ? "bg-amber-50/50 dark:bg-amber-900/10"
                          : isEdited
                            ? "bg-blue-50/50 dark:bg-blue-900/10"
                            : "bg-white dark:bg-zinc-950"
                      )}
                    >
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5">
                          {isEdited && (
                            <span
                              className={cn(
                                "h-1.5 w-1.5 rounded-full shrink-0",
                                isCleared ? "bg-amber-400" : "bg-blue-400"
                              )}
                            />
                          )}
                          <span className="font-medium text-gray-900 dark:text-zinc-100">
                            {formatMilestoneTitle(idx, invoice.milestoneLabel)}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span
                              className={cn(
                                "inline-flex items-center gap-1.5 text-xs font-medium cursor-default",
                                msCfg.textColor
                              )}
                            >
                              <span
                                className={cn("h-1.5 w-1.5 rounded-full shrink-0", msCfg.dotColor)}
                              />
                              {msCfg.label}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{msTooltip}</p>
                          </TooltipContent>
                        </Tooltip>
                        {effectiveMsStatus === MilestoneLifecycleStatus.COMPLETED && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <ExclamationTriangleIcon className="inline h-3.5 w-3.5 ml-1 text-amber-500 cursor-default" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>The milestone has not been verified yet</p>
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right">
                        {(() => {
                          const amount =
                            invoice.allocatedAmount ??
                            (invoice.milestoneUID
                              ? allocationByUID.get(invoice.milestoneUID)
                              : undefined) ??
                            null;
                          if (amount !== null) {
                            return (
                              <span className="text-xs tabular-nums text-gray-700 dark:text-zinc-300">
                                {formatDisplayAmount(amount)}
                                {grant.currency && (
                                  <span className="text-gray-400 dark:text-zinc-500 ml-0.5">
                                    {grant.currency}
                                  </span>
                                )}
                              </span>
                            );
                          }
                          return (
                            <span className="text-xs text-gray-300 dark:text-zinc-600">
                              &mdash;
                            </span>
                          );
                        })()}
                      </td>
                      {invoiceRequired && (
                        <td className="py-3 px-3">
                          <div className="flex flex-col items-center gap-1.5">
                            {/* Row 1: File action */}
                            {hasFile ? (
                              <div className="inline-flex items-center gap-1.5">
                                {hasPendingFile ? (
                                  <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-400">
                                    <PaperClipIcon className="h-3 w-3" />
                                    Attached (unsaved)
                                  </span>
                                ) : (
                                  <button
                                    type="button"
                                    className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    onClick={() => handleViewFile(invoice.invoiceFileKey!)}
                                    disabled={loadingFileKeys.has(invoice.invoiceFileKey!)}
                                  >
                                    {loadingFileKeys.has(invoice.invoiceFileKey!) ? (
                                      <svg className="h-3 w-3 animate-spin" viewBox="0 0 24 24" fill="none">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                      </svg>
                                    ) : (
                                      <ArrowDownTrayIcon className="h-3 w-3" />
                                    )}
                                    View invoice
                                  </button>
                                )}
                                <button
                                  type="button"
                                  className="p-0.5 rounded text-red-400 hover:text-red-600 dark:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                  onClick={() => {
                                    onFileRemoved(mKey);
                                    if (invoice.invoiceFileKey) {
                                      // Removing a saved file — clear the date too
                                      handleInvoiceReceivedDateChange(
                                        mKey,
                                        invoice.milestoneUID,
                                        ""
                                      );
                                    }
                                    // Cancelling a pending upload — leave existing date intact
                                  }}
                                  title="Remove invoice file"
                                >
                                  <XMarkIcon className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                className="inline-flex items-center gap-1 text-xs text-gray-400 dark:text-zinc-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                                onClick={() =>
                                  setUploadModalInvoice({
                                    mKey,
                                    label: invoice.milestoneLabel,
                                    milestoneUID: invoice.milestoneUID,
                                  })
                                }
                              >
                                <PaperClipIcon className="h-3 w-3" />
                                Attach file
                              </button>
                            )}

                            {/* Row 2: Received date */}
                            <div className="flex flex-col items-center gap-0.5">
                              <Input
                                type="date"
                                max={todayLocal}
                                value={receivedDateValue ?? ""}
                                onChange={(e) =>
                                  handleInvoiceReceivedDateChange(
                                    mKey,
                                    invoice.milestoneUID,
                                    e.target.value
                                  )
                                }
                                className={cn(
                                  "h-6 text-[11px] w-[130px] bg-white dark:bg-zinc-900",
                                  hasReceivedDate
                                    ? "border-emerald-200 dark:border-emerald-800"
                                    : ""
                                )}
                                aria-label={`Invoice received date for ${formatMilestoneTitle(idx, invoice.milestoneLabel)}`}
                              />
                              {invoice.invoiceReceivedBy && (
                                <span
                                  className="text-[10px] text-gray-400 dark:text-zinc-500 font-mono"
                                  title={invoice.invoiceReceivedBy}
                                >
                                  by {formatAddressForDisplay(invoice.invoiceReceivedBy)}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                      )}
                      <td className="py-3 px-3 text-center">
                        <div className="flex flex-col items-center gap-0.5">
                          <PaymentStatusDropdown
                            currentStatus={invoice.paymentStatus ?? "unpaid"}
                            milestoneLabel={invoice.milestoneLabel}
                            grantUID={grant.grantUid}
                            communityUID={communityUID}
                            paymentStatusDate={invoice.paymentStatusDate}
                            onRequestRecordPayment={onRequestRecordPayment}
                            onRequestDeleteDisbursement={onRequestDeleteDisbursement}
                          />
                          {invoice.paymentStatusDate && (
                            <span className="text-[10px] text-gray-400 dark:text-zinc-500 tabular-nums">
                              {formatDate(invoice.paymentStatusDate, "UTC")}
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </TooltipProvider>
      )}

      {/* Upload modal */}
      <Dialog
        open={!!uploadModalInvoice}
        onOpenChange={(open) => {
          if (!open) setUploadModalInvoice(null);
        }}
      >
        <DialogContent className="max-w-sm bg-white dark:bg-zinc-950">
          <DialogHeader>
            <DialogTitle className="text-base">Attach Invoice</DialogTitle>
            <DialogDescription>{uploadModalInvoice?.label}</DialogDescription>
          </DialogHeader>
          <FileUpload
            onFileSelect={() => {}}
            acceptedFormats=".pdf,.docx"
            description="PDF or DOCX (max 10MB)"
            useS3Upload
            skipDimensionValidation
            presignedUrlEndpoint={INDEXER.V2.MILESTONE_INVOICES.PRESIGNED_URL()}
            maxFileSize={10 * 1024 * 1024}
            allowedFileTypes={[
              "application/pdf",
              "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            ]}
            onS3UploadComplete={handleFileUploaded}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
});
