"use client";

import { PaperClipIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { useQueryClient } from "@tanstack/react-query";
import { Pencil } from "lucide-react";
import dynamic from "next/dynamic";
import { useCallback, useRef, useState } from "react";
import toast from "react-hot-toast";
import { FileUpload } from "@/components/Utilities/FileUpload";
import { MarkdownPreview } from "@/components/Utilities/MarkdownPreview";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { submitGranteeInvoice } from "@/src/features/payout-disbursement/services/payout-disbursement.service";
import type { MilestoneData } from "@/types/whitelabel-entities";
import { formatDate } from "@/utilities/formatDate";
import { INDEXER } from "@/utilities/indexer";
import { QUERY_KEYS } from "@/utilities/queryKeys";
import { formatFieldLabel, isMarkdownContent, MILESTONE_CORE_FIELDS } from "../lib/milestone-utils";
import type { MilestoneCompletion } from "../services/milestone-completion.service";

const ApplicationMilestoneAIEvaluationBadge = dynamic(
  () =>
    import("@/components/Milestone/MilestoneAIEvaluationBadge").then(
      (m) => m.ApplicationMilestoneAIEvaluationBadge
    ),
  { ssr: false }
);

export interface OffChainExistingInvoice {
  invoiceFileKey: string | null;
  milestoneLabel: string;
  invoiceStatus?: string;
}

export interface OffChainInvoiceSupport {
  /** Whether the milestone supports invoice uploads. */
  enabled: boolean;
  /** Whether the invoice configuration is still loading. */
  isLoading: boolean;
  /** Grant UID (required to submit an invoice). */
  grantUID?: string;
  /** Already-uploaded invoice for this milestone, if any. */
  existing?: OffChainExistingInvoice;
}

interface OffChainMilestoneRowProps {
  milestone: MilestoneData;
  fieldLabel: string;
  referenceNumber: string;
  isEditable: boolean;
  completion: MilestoneCompletion | null;
  invoiceSupport?: OffChainInvoiceSupport;
  onCreate: (
    payload: {
      milestoneFieldLabel: string;
      milestoneTitle: string;
      completionText: string;
    },
    callbacks: { onSuccess: () => Promise<void> | void }
  ) => void;
  onUpdate: (
    payload: {
      milestoneFieldLabel: string;
      milestoneTitle: string;
      completionText: string;
    },
    callbacks: { onSuccess: () => Promise<void> | void }
  ) => void;
  isCreating: boolean;
  isUpdating: boolean;
}

interface InvoiceFileState {
  fileUrl: string;
  fileKey: string;
  fileName: string;
}

export function OffChainMilestoneRow({
  milestone,
  fieldLabel,
  referenceNumber,
  isEditable,
  completion,
  invoiceSupport,
  onCreate,
  onUpdate,
  isCreating,
  isUpdating,
}: OffChainMilestoneRowProps) {
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [text, setText] = useState("");
  const [invoiceFile, setInvoiceFile] = useState<InvoiceFileState | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const pendingFileNameRef = useRef<string>("");

  const isCompletionVerified = completion?.isVerified || false;
  const canEdit = isEditable && !isCompletionVerified;

  const showInvoice =
    !!invoiceSupport?.enabled && !invoiceSupport.isLoading && !!invoiceSupport.grantUID;

  const additionalFields = Object.keys(milestone).filter(
    (key) => !MILESTONE_CORE_FIELDS.includes(key) && milestone[key as keyof MilestoneData]
  );

  const handleStartEdit = () => {
    setText(completion?.completionText || "");
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setText("");
    setInvoiceFile(null);
  };

  const handleInvoiceSelected = useCallback((file: File) => {
    pendingFileNameRef.current = file.name;
    setIsUploading(true);
  }, []);

  const handleInvoiceUploaded = useCallback((finalUrl: string, tempKey: string) => {
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

  const submitInvoiceIfAny = async () => {
    if (invoiceFile && invoiceSupport?.grantUID) {
      try {
        await submitGranteeInvoice(invoiceSupport.grantUID, {
          milestoneLabel: milestone.title,
          invoiceFileKey: invoiceFile.fileKey,
          invoiceFileUrl: invoiceFile.fileUrl,
        });
        toast.success("Invoice submitted successfully");
        await queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.APPLICATIONS.INVOICE_CONFIG(referenceNumber),
        });
      } catch {
        toast.error("Failed to submit invoice");
      }
    }
  };

  const handleSubmit = () => {
    const payload = {
      milestoneFieldLabel: fieldLabel,
      milestoneTitle: milestone.title,
      completionText: text,
    };

    const onSuccess = async () => {
      await submitInvoiceIfAny();
      setIsEditing(false);
      setInvoiceFile(null);
    };

    if (completion) {
      onUpdate(payload, { onSuccess });
    } else {
      onCreate(payload, { onSuccess });
    }
  };

  const isSubmitEnabled = (() => {
    if (isUploading) return false;
    const savedText = completion?.completionText || "";
    const hasTextChange = text !== savedText;
    const hasInvoice = !!invoiceFile;
    return hasTextChange || hasInvoice;
  })();

  const existingInvoiceAttached = showInvoice && !!invoiceSupport?.existing?.invoiceFileKey;

  return (
    <div className="rounded-lg border bg-zinc-50 dark:bg-zinc-800/50 p-4">
      <div className="space-y-2">
        <div className="flex justify-between items-start gap-2">
          <h4 className="font-medium">{milestone.title}</h4>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            {isCompletionVerified && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                Verified
              </span>
            )}
            {milestone.dueDate && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">
                Due: {formatDate(milestone.dueDate)}
              </span>
            )}
          </div>
        </div>

        {milestone.description && (
          <div className="text-sm text-zinc-600 dark:text-zinc-400 prose prose-sm dark:prose-invert max-w-none">
            <MarkdownPreview source={milestone.description} />
          </div>
        )}

        {additionalFields.map((fieldKey) => {
          const fieldValue = milestone[fieldKey as keyof MilestoneData];
          if (!fieldValue) return null;
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
                {completion ? "Edit Completion Update" : "Add Completion Update"}
              </p>
              {completion && (
                <p className="text-xs text-zinc-400">
                  Previously updated: {formatDate(completion.updatedAt)}
                </p>
              )}
            </div>
            <Textarea
              placeholder="Enter your completion update for this milestone..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={3}
              className="resize-y"
            />

            {invoiceSupport?.isLoading && invoiceSupport.enabled && (
              <div className="flex w-full flex-col items-start gap-2 mt-2">
                <div className="h-5 w-28 rounded bg-gray-200 dark:bg-zinc-700 animate-pulse" />
                <div className="h-10 w-full rounded bg-gray-200 dark:bg-zinc-700 animate-pulse" />
              </div>
            )}
            {showInvoice && (
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
                      onClick={() => setInvoiceFile(null)}
                    >
                      <XMarkIcon className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex w-full flex-col gap-2">
                    {existingInvoiceAttached && (
                      <div className="flex items-center gap-2 rounded-md border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 px-3 py-2">
                        <PaperClipIcon className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                        <span className="text-sm text-emerald-700 dark:text-emerald-300 flex-1">
                          Invoice attached
                        </span>
                      </div>
                    )}
                    <FileUpload
                      onFileSelect={handleInvoiceSelected}
                      acceptedFormats=".pdf,.docx"
                      description={
                        existingInvoiceAttached
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
                      onS3UploadComplete={handleInvoiceUploaded}
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
                isLoading={isCreating || isUpdating}
                disabled={!isSubmitEnabled || isCreating || isUpdating || isUploading}
              >
                {isCreating || isUpdating ? "Saving..." : completion ? "Update" : "Save"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancelEdit}
                disabled={isCreating || isUpdating}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <>
            {completion && (
              <div className="mt-3 space-y-1 pt-3 border-t border-zinc-200 dark:border-zinc-700">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-semibold">Completion Update</p>
                    <ApplicationMilestoneAIEvaluationBadge
                      referenceNumber={referenceNumber}
                      milestoneTitle={milestone.title}
                    />
                  </div>
                  {canEdit && (
                    <Button size="icon-sm" onClick={handleStartEdit}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                  )}
                </div>
                <div className="text-sm text-zinc-600 dark:text-zinc-400 prose prose-sm dark:prose-invert max-w-none">
                  <MarkdownPreview source={completion.completionText} />
                </div>
                <p className="text-xs text-zinc-400">
                  Last updated: {formatDate(completion.updatedAt)}
                </p>
                {isCompletionVerified && completion.verificationComment && (
                  <div className="mt-2 p-2 bg-green-50 dark:bg-green-900/10 rounded-md">
                    <p className="text-xs font-semibold text-green-700 dark:text-green-400 mb-1">
                      Verification Comment
                    </p>
                    <p className="text-xs text-zinc-600 dark:text-zinc-400">
                      {completion.verificationComment}
                    </p>
                    {completion.verifiedBy && (
                      <p className="text-xs text-zinc-400 mt-1">
                        Verified by: {completion.verifiedBy}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {existingInvoiceAttached && (
              <div className="flex items-center gap-1.5 mt-2">
                <PaperClipIcon className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <span className="text-sm text-emerald-700 dark:text-emerald-300">
                  Invoice attached
                </span>
              </div>
            )}

            {!completion && canEdit && (
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
