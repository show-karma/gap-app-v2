"use client";

import { PaperClipIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { Pencil } from "lucide-react";
import dynamic from "next/dynamic";
import { useCallback, useRef, useState } from "react";
import EthereumAddressToProfileName from "@/components/EthereumAddressToProfileName";
import { FileUpload } from "@/components/Utilities/FileUpload";
import { MarkdownPreview } from "@/components/Utilities/MarkdownPreview";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { MilestoneStatusEntry } from "@/types/whitelabel-entities";
import { formatDate } from "@/utilities/formatDate";
import { INDEXER } from "@/utilities/indexer";
import { useSubmitMilestoneCompletion } from "../hooks/use-submit-milestone-completion";
import {
  isMilestoneCompleted,
  isMilestoneLate,
  isMilestoneVerified,
} from "../lib/milestone-status";
import { formatFieldLabel, isMarkdownContent, MILESTONE_CORE_FIELDS } from "../lib/milestone-utils";

const ApplicationMilestoneAIEvaluationBadge = dynamic(
  () =>
    import("@/components/Milestone/MilestoneAIEvaluationBadge").then(
      (m) => m.ApplicationMilestoneAIEvaluationBadge
    ),
  { ssr: false }
);

interface InvoiceFileState {
  fileUrl: string;
  fileKey: string;
  fileName: string;
}

interface ExistingInvoice {
  invoiceFileKey: string | null;
}

interface OffChainMilestoneRowProps {
  /**
   * Pre-merged `application.milestoneStatuses[]` entry (source: "application").
   * Carries `title`/`description`/`dueDate` + form `formData` + on-chain
   * status payloads (`completed`/`verified`) + the `grantUID`/`chainID` the
   * submit hook needs.
   */
  entry: MilestoneStatusEntry;
  referenceNumber: string;
  isEditable: boolean;
  /** Whether the per-grant invoice config has invoiceRequired + grantUID. */
  showInvoice: boolean;
  /** Existing on-disk invoice for this milestone title, if any. */
  existingInvoice?: ExistingInvoice;
  /** True while the parent is still loading the invoice config — render a skeleton. */
  isInvoiceConfigLoading: boolean;
}

export function OffChainMilestoneRow({
  entry,
  referenceNumber,
  isEditable,
  showInvoice,
  existingInvoice,
  isInvoiceConfigLoading,
}: OffChainMilestoneRowProps) {
  const {
    submit: submitCompletion,
    isPending: isSubmittingCompletion,
    isPendingFor: isSubmittingTitle,
  } = useSubmitMilestoneCompletion();

  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState("");
  const [invoiceFile, setInvoiceFile] = useState<InvoiceFileState | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const pendingFileNameRef = useRef<string | undefined>(undefined);

  const isCompletionVerified = isMilestoneVerified(entry);
  const isCompletionSubmitted = isMilestoneCompleted(entry) && !isCompletionVerified;
  const isLate = isMilestoneLate(entry);
  // Submission requires a milestoneUID (refUID for the on-chain attestation).
  // Slots that haven't been anchored on-chain yet stay read-only.
  const canEdit = isEditable && !isCompletionVerified && !!entry.milestoneUID;
  const isWaitingForIndexer = isSubmittingTitle(entry.milestoneUID, entry.title);

  const completionEntry = entry.completed ?? null;
  const verifiedEntry = entry.verified ?? null;
  const completionText = completionEntry?.reason ?? "";
  const completionDate = completionEntry?.createdAt;

  const additionalFields = Object.entries(entry.formData ?? {}).filter(
    ([key, value]) => !MILESTONE_CORE_FIELDS.includes(key) && value
  );

  const handleStartEdit = () => {
    setEditedText(completionEntry?.reason || "");
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedText("");
    setInvoiceFile(null);
  };

  const handleInvoiceFileSelected = useCallback((file: File) => {
    pendingFileNameRef.current = file.name;
    setIsUploading(true);
  }, []);

  const handleInvoiceFileUploaded = useCallback((finalUrl: string, tempKey: string) => {
    setInvoiceFile({
      fileUrl: finalUrl,
      fileKey: tempKey,
      fileName: pendingFileNameRef.current || "invoice",
    });
    setIsUploading(false);
  }, []);

  const handleInvoiceUploadError = useCallback(() => {
    setIsUploading(false);
  }, []);

  const handleRemoveInvoice = useCallback(() => {
    setInvoiceFile(null);
  }, []);

  // For a brand-new completion the on-chain attestation must carry some
  // proof-of-work text — submitting `reason: ""` writes an attestation
  // that the next viewer can't make sense of. For an existing completion
  // we accept the "invoice-only update" path: the user is replacing the
  // attached invoice without changing the rationale, so we fall back to
  // the existing reason on submit.
  const existingReason = completionEntry?.reason?.trim() ?? "";
  const hasExistingReason = existingReason.length > 0;
  const hasEditedText = editedText.trim().length > 0;

  const isSubmitEnabled = (() => {
    if (isUploading) return false;
    if (hasEditedText) return true;
    // No new text typed — only valid when the user is updating the
    // invoice on an existing completion (we reuse the prior reason).
    return !!invoiceFile && hasExistingReason;
  })();

  const handleSubmit = async () => {
    if (!entry.milestoneUID) return;
    const trimmed = editedText.trim();
    const proofOfWork = trimmed.length > 0 ? trimmed : existingReason;
    if (!proofOfWork) return;
    try {
      await submitCompletion({
        milestoneTitle: entry.title,
        milestoneUID: entry.milestoneUID,
        statusEntry: entry,
        proofOfWork,
        referenceNumber,
        invoiceFile: invoiceFile
          ? { fileKey: invoiceFile.fileKey, fileUrl: invoiceFile.fileUrl }
          : null,
      });
      setIsEditing(false);
      setEditedText("");
      setInvoiceFile(null);
    } catch {
      // hook surfaces errors via toast; keep the form open for retry
    }
  };

  return (
    <div className="rounded-lg border bg-zinc-50 dark:bg-zinc-800/50 p-4">
      <div className="space-y-2">
        <div className="flex justify-between items-start">
          <h4 className="font-medium">{entry.title}</h4>
          <div className="flex items-center gap-2">
            {isCompletionVerified ? (
              <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                Verified
              </span>
            ) : isCompletionSubmitted ? (
              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                Completed
              </span>
            ) : isLate ? (
              <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">
                Past Due
              </span>
            ) : (
              <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-700">
                Pending
              </span>
            )}
            {entry.dueDate && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">
                Due: {formatDate(entry.dueDate)}
              </span>
            )}
          </div>
        </div>

        {entry.description && (
          <div className="text-sm text-zinc-600 dark:text-zinc-400 prose prose-sm dark:prose-invert max-w-none">
            <MarkdownPreview source={entry.description} />
          </div>
        )}

        {additionalFields.map(([fieldKey, fieldValue]) => {
          const label = formatFieldLabel(fieldKey);
          const shouldRenderAsMarkdown =
            typeof fieldValue === "string" && isMarkdownContent(fieldValue);

          return (
            <div key={fieldKey} className="text-sm">
              {shouldRenderAsMarkdown ? (
                <div className="text-zinc-600 dark:text-zinc-400">
                  <span className="font-medium block mb-1">{label}:</span>
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <MarkdownPreview source={String(fieldValue)} />
                  </div>
                </div>
              ) : (
                <p className="text-zinc-600 dark:text-zinc-400">
                  <span className="font-medium">{label}:</span> {String(fieldValue)}
                </p>
              )}
            </div>
          );
        })}

        {isEditing ? (
          <div className="mt-3 space-y-2 pt-3 border-t border-zinc-200 dark:border-zinc-700">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">
                {completionEntry ? "Edit Completion Update" : "Add Completion Update"}
              </p>
              {completionDate && (
                <p className="text-xs text-zinc-400">
                  Previously updated: {formatDate(completionDate)}
                </p>
              )}
            </div>
            <Textarea
              placeholder="Enter your completion update for this milestone..."
              value={editedText}
              onChange={(e) => setEditedText(e.target.value)}
              rows={3}
              className="resize-y"
            />

            {isInvoiceConfigLoading && (
              <div className="flex w-full flex-col items-start gap-2 mt-2">
                <div className="h-5 w-28 rounded bg-gray-200 dark:bg-zinc-700 animate-pulse" />
                <div className="h-10 w-full rounded bg-gray-200 dark:bg-zinc-700 animate-pulse" />
              </div>
            )}

            {showInvoice && !isInvoiceConfigLoading && (
              <div className="flex w-full flex-col items-start gap-2 mt-2">
                <p className="text-sm font-medium">Invoice (optional)</p>
                {invoiceFile ? (
                  <div className="flex items-center gap-2 rounded-md border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 px-3 py-2">
                    <PaperClipIcon className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-sm text-emerald-700 dark:text-emerald-300 flex-1 truncate">
                      {invoiceFile.fileName}
                    </span>
                    <button
                      type="button"
                      aria-label="Remove invoice"
                      className="p-0.5 rounded text-red-400 hover:text-red-600 transition-colors"
                      onClick={handleRemoveInvoice}
                    >
                      <XMarkIcon className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex w-full flex-col gap-2">
                    {existingInvoice?.invoiceFileKey && (
                      <div className="flex items-center gap-2 rounded-md border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 px-3 py-2">
                        <PaperClipIcon className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                        <span className="text-sm text-emerald-700 dark:text-emerald-300 flex-1">
                          Invoice attached
                        </span>
                      </div>
                    )}
                    <FileUpload
                      onFileSelect={handleInvoiceFileSelected}
                      acceptedFormats=".pdf,.docx"
                      description={
                        existingInvoice?.invoiceFileKey
                          ? "Upload to replace existing invoice"
                          : "PDF or DOCX (max 10MB)"
                      }
                      useS3Upload
                      skipDimensionValidation
                      presignedUrlEndpoint={INDEXER.V2.MILESTONE_INVOICES.GRANTEE_PRESIGNED()}
                      maxFileSize={10 * 1024 * 1024}
                      allowedFileTypes={[
                        "application/pdf",
                        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                      ]}
                      onS3UploadComplete={handleInvoiceFileUploaded}
                      onS3UploadError={handleInvoiceUploadError}
                    />
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleSubmit}
                isLoading={isWaitingForIndexer}
                disabled={
                  !entry.milestoneUID ||
                  !isSubmitEnabled ||
                  isSubmittingCompletion ||
                  isUploading ||
                  isWaitingForIndexer
                }
              >
                {isWaitingForIndexer ? "Submitting..." : completionEntry ? "Update" : "Save"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancelEdit}
                disabled={isWaitingForIndexer}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <>
            {completionEntry && (
              <div className="mt-3 space-y-1 pt-3 border-t border-zinc-200 dark:border-zinc-700">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-semibold">Completion Update</p>
                    {completionText ? (
                      <ApplicationMilestoneAIEvaluationBadge
                        referenceNumber={referenceNumber}
                        milestoneTitle={entry.title}
                        completionReason={completionText}
                      />
                    ) : null}
                  </div>
                  {canEdit && (
                    <Button
                      size="icon-sm"
                      onClick={handleStartEdit}
                      aria-label="Edit completion update"
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                  )}
                </div>
                {completionText.trim() ? (
                  <div className="text-sm text-zinc-600 dark:text-zinc-400 prose prose-sm dark:prose-invert max-w-none">
                    <MarkdownPreview source={completionText} />
                  </div>
                ) : (
                  <p className="text-sm italic text-zinc-400 dark:text-zinc-500">
                    No completion text
                  </p>
                )}
                {completionDate && (
                  <p className="text-xs text-zinc-400">
                    Last updated: {formatDate(completionDate)}
                  </p>
                )}
                {isCompletionVerified && verifiedEntry && (
                  <div className="mt-2 p-2 bg-green-50 dark:bg-green-900/10 rounded-md">
                    <p className="text-xs font-semibold text-green-700 dark:text-green-400 mb-1">
                      Verification
                    </p>
                    {verifiedEntry.reason && (
                      <p className="text-xs text-zinc-600 dark:text-zinc-400">
                        {verifiedEntry.reason}
                      </p>
                    )}
                    <p className="text-xs text-zinc-400 mt-1">
                      Verified by: <EthereumAddressToProfileName address={verifiedEntry.attester} />
                    </p>
                  </div>
                )}
              </div>
            )}

            {showInvoice && existingInvoice?.invoiceFileKey && (
              <div className="flex items-center gap-1.5 mt-2">
                <PaperClipIcon className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <span className="text-sm text-emerald-700 dark:text-emerald-300">
                  Invoice attached
                </span>
              </div>
            )}

            {!completionEntry && canEdit && (
              <div className="mt-3 pt-3 border-t border-zinc-200 dark:border-zinc-700">
                <Button size="sm" onClick={handleStartEdit}>
                  Add Completion Update
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
