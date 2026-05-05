"use client";

import { PaperClipIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { useQueryClient } from "@tanstack/react-query";
import { Pencil } from "lucide-react";
import dynamic from "next/dynamic";
import { useCallback, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { FileUpload } from "@/components/Utilities/FileUpload";
import { MarkdownPreview } from "@/components/Utilities/MarkdownPreview";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useMilestoneAttestation } from "@/src/features/milestones/hooks/useMilestoneAttestation";
import { submitGranteeInvoice } from "@/src/features/payout-disbursement/services/payout-disbursement.service";
import type { GrantMilestoneWithDetails } from "@/types/v2/roadmap";
import type { MilestoneData } from "@/types/whitelabel-entities";
import { formatDate } from "@/utilities/formatDate";
import { INDEXER } from "@/utilities/indexer";
import { QUERY_KEYS } from "@/utilities/queryKeys";
import { useApplicationInvoiceConfig } from "../hooks/use-application-invoice-config";
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

interface MilestoneCompletionEditorProps {
  milestones: MilestoneData[];
  fieldLabel: string;
  referenceNumber: string;
  isEditable: boolean;
  invoiceRequired?: boolean;
  grantMilestones?: GrantMilestoneWithDetails[]; // For on-chain attestations
  grantUID?: string; // For query invalidation (overrides invoice config)
  chainID?: number; // For on-chain attestations
}

export function MilestoneCompletionEditor({
  milestones,
  fieldLabel,
  referenceNumber,
  isEditable,
  invoiceRequired,
  grantMilestones = [],
  grantUID: grantUIDProp,
  chainID = 8453,
}: MilestoneCompletionEditorProps) {
  const queryClient = useQueryClient();
  const { completeMutation } = useMilestoneAttestation();
  const [isIndexerPending, setIsIndexerPending] = useState<Set<string>>(new Set());

  const { data: invoiceConfig, isLoading: isInvoiceConfigLoading } = useApplicationInvoiceConfig(
    referenceNumber,
    {
      enabled: !!invoiceRequired,
    }
  );

  const grantUID = grantUIDProp || invoiceConfig?.grantUID;
  const showInvoice = invoiceRequired && invoiceConfig?.invoiceRequired && !!grantUID;
  const milestoneInvoices = invoiceConfig?.milestoneInvoices ?? [];

  const getExistingInvoice = useCallback(
    (milestoneTitle: string) =>
      milestoneInvoices.find((inv) => inv.milestoneLabel === milestoneTitle),
    [milestoneInvoices]
  );

  // Build positional completion map to handle duplicate milestone titles.
  // Match milestones to grant milestone entities for on-chain status.
  const completionByIndex = useMemo(() => {
    const map = new Map<number, GrantMilestoneWithDetails | null>();
    milestones.forEach((milestone, index) => {
      const grantMilestone = grantMilestones.find((gm) => gm.title === milestone.title);
      map.set(index, grantMilestone || null);
    });
    return map;
  }, [milestones, grantMilestones]);

  const [editingMilestone, setEditingMilestone] = useState<string | null>(null);
  const [editedText, setEditedText] = useState<Record<string, string>>({});
  const [invoiceFiles, setInvoiceFiles] = useState<Record<string, InvoiceFileState | null>>({});
  const [uploadingMilestones, setUploadingMilestones] = useState<Set<string>>(new Set());
  const pendingFileNameRef = useRef<Record<string, string>>({});

  const handleStartEdit = (milestoneTitle: string) => {
    const milestone = grantMilestones.find((m) => m.title === milestoneTitle);
    const completionText = milestone?.completionDetails?.description || "";
    setEditingMilestone(milestoneTitle);
    setEditedText({
      ...editedText,
      [milestoneTitle]: completionText,
    });
  };

  const handleCancelEdit = (milestoneTitle: string) => {
    setEditingMilestone(null);
    const newEditedText = { ...editedText };
    delete newEditedText[milestoneTitle];
    setEditedText(newEditedText);
    setInvoiceFiles((prev) => {
      const next = { ...prev };
      delete next[milestoneTitle];
      return next;
    });
  };

  const handleInvoiceFileSelected = useCallback((file: File, milestoneTitle: string) => {
    pendingFileNameRef.current[milestoneTitle] = file.name;
    setUploadingMilestones((prev) => new Set(prev).add(milestoneTitle));
  }, []);

  const handleInvoiceFileUploaded = useCallback(
    (finalUrl: string, tempKey: string, milestoneTitle: string) => {
      setInvoiceFiles((prev) => ({
        ...prev,
        [milestoneTitle]: {
          fileUrl: finalUrl,
          fileKey: tempKey,
          fileName: pendingFileNameRef.current[milestoneTitle] || "invoice",
        },
      }));
      setUploadingMilestones((prev) => {
        const next = new Set(prev);
        next.delete(milestoneTitle);
        return next;
      });
    },
    []
  );

  const handleInvoiceUploadError = useCallback((milestoneTitle: string) => {
    setUploadingMilestones((prev) => {
      const next = new Set(prev);
      next.delete(milestoneTitle);
      return next;
    });
  }, []);

  const handleRemoveInvoice = useCallback((milestoneTitle: string) => {
    setInvoiceFiles((prev) => {
      const next = { ...prev };
      delete next[milestoneTitle];
      return next;
    });
  }, []);

  const handleSubmit = async (milestoneTitle: string) => {
    const proofOfWork = editedText[milestoneTitle] || "";
    const milestone = grantMilestones.find((m) => m.title === milestoneTitle);
    const invoiceFile = invoiceFiles[milestoneTitle];

    if (!milestone || !grantUID) {
      toast.error("Milestone or grant information missing");
      return;
    }

    try {
      // Submit on-chain attestation
      setIsIndexerPending((prev) => new Set(prev).add(milestoneTitle));

      await completeMutation.mutateAsync({
        milestone,
        chainID,
        proofOfWork,
        grantUID,
      });

      // Show success toast with tx hash
      toast.success("Milestone completion submitted. Processing on-chain...");

      // Submit invoice if present
      if (invoiceFile) {
        try {
          await submitGranteeInvoice(grantUID, {
            milestoneLabel: milestoneTitle,
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

      setEditingMilestone(null);
      setEditedText({});
      setInvoiceFiles((prev) => {
        const next = { ...prev };
        delete next[milestoneTitle];
        return next;
      });
    } catch (_error) {
      // Error already shown by completeMutation toast
      setIsIndexerPending((prev) => {
        const next = new Set(prev);
        next.delete(milestoneTitle);
        return next;
      });
    }
  };

  const isSubmitEnabled = (milestoneTitle: string) => {
    if (uploadingMilestones.has(milestoneTitle)) return false;
    const currentText = editedText[milestoneTitle] || "";
    const hasTextChange = currentText.trim().length > 0;
    const hasInvoice = !!invoiceFiles[milestoneTitle];
    return hasTextChange || hasInvoice;
  };

  return (
    <div className="space-y-3">
      {milestones.map((milestone, index) => {
        const grantMilestone = completionByIndex.get(index);
        const isEditing = editingMilestone === milestone.title;
        const currentText = editedText[milestone.title] || "";
        const isCompletionVerified = grantMilestone?.verificationDetails !== null;
        const canEdit = isEditable && !isCompletionVerified;
        const _invoiceFile = invoiceFiles[milestone.title];
        const isUploading = uploadingMilestones.has(milestone.title);
        const isWaitingForIndexer = isIndexerPending.has(milestone.title);

        const additionalFields = Object.keys(milestone).filter(
          (key) => !MILESTONE_CORE_FIELDS.includes(key) && milestone[key as keyof MilestoneData]
        );

        return (
          <div
            key={`${fieldLabel}-${milestone.title}-${index}`}
            className="rounded-lg border bg-zinc-50 dark:bg-zinc-800/50 p-4"
          >
            <div className="space-y-2">
              {isWaitingForIndexer && (
                <div className="px-3 py-2 rounded-md bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                  <p className="text-xs text-blue-700 dark:text-blue-300">
                    Indexer is processing your submission...
                  </p>
                </div>
              )}
              <div className="flex justify-between items-start">
                <h4 className="font-medium">{milestone.title}</h4>
                <div className="flex items-center gap-2">
                  {isCompletionVerified && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                      Verified
                    </span>
                  )}
                  {grantMilestone?.completionDetails && !isCompletionVerified && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">
                      Submitted
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
                      {grantMilestone?.completionDetails
                        ? "Edit Completion Update"
                        : "Add Completion Update"}
                    </p>
                    {grantMilestone?.completionDetails && (
                      <p className="text-xs text-zinc-400">
                        Previously updated:{" "}
                        {formatDate(grantMilestone.completionDetails.completedAt)}
                      </p>
                    )}
                  </div>
                  <Textarea
                    placeholder="Enter your completion update for this milestone..."
                    value={currentText}
                    onChange={(e) =>
                      setEditedText({
                        ...editedText,
                        [milestone.title]: e.target.value,
                      })
                    }
                    rows={3}
                    className="resize-y"
                  />

                  {/* Invoice upload section */}
                  {isInvoiceConfigLoading && invoiceRequired && (
                    <div className="flex w-full flex-col items-start gap-2 mt-2">
                      <div className="h-5 w-28 rounded bg-gray-200 dark:bg-zinc-700 animate-pulse" />
                      <div className="h-10 w-full rounded bg-gray-200 dark:bg-zinc-700 animate-pulse" />
                    </div>
                  )}
                  {showInvoice &&
                    !isInvoiceConfigLoading &&
                    (() => {
                      const invoiceFile = invoiceFiles[milestone.title];
                      const existingInvoice = getExistingInvoice(milestone.title);
                      return (
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
                                onClick={() => handleRemoveInvoice(milestone.title)}
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
                                onFileSelect={(file) =>
                                  handleInvoiceFileSelected(file, milestone.title)
                                }
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
                                onS3UploadComplete={(finalUrl, tempKey) =>
                                  handleInvoiceFileUploaded(finalUrl, tempKey, milestone.title)
                                }
                                onS3UploadError={() => handleInvoiceUploadError(milestone.title)}
                              />
                            </div>
                          )}
                        </div>
                      );
                    })()}

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleSubmit(milestone.title)}
                      isLoading={completeMutation.isPending || isWaitingForIndexer}
                      disabled={
                        !isSubmitEnabled(milestone.title) ||
                        completeMutation.isPending ||
                        isUploading ||
                        isWaitingForIndexer
                      }
                    >
                      {completeMutation.isPending || isWaitingForIndexer
                        ? "Submitting..."
                        : grantMilestone?.completionDetails
                          ? "Update"
                          : "Save"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCancelEdit(milestone.title)}
                      disabled={completeMutation.isPending || isWaitingForIndexer}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  {grantMilestone?.completionDetails && (
                    <div className="mt-3 space-y-1 pt-3 border-t border-zinc-200 dark:border-zinc-700">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-semibold">Completion Update</p>
                          {grantMilestone.completionDetails.proofOfWork ? (
                            <ApplicationMilestoneAIEvaluationBadge
                              referenceNumber={referenceNumber}
                              milestoneTitle={milestone.title}
                              completionReason={grantMilestone.completionDetails.proofOfWork}
                            />
                          ) : null}
                        </div>
                        {canEdit && (
                          <Button size="icon-sm" onClick={() => handleStartEdit(milestone.title)}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                      <div className="text-sm text-zinc-600 dark:text-zinc-400 prose prose-sm dark:prose-invert max-w-none">
                        <MarkdownPreview
                          source={grantMilestone.completionDetails.proofOfWork || ""}
                        />
                      </div>
                      <p className="text-xs text-zinc-400">
                        Last updated: {formatDate(grantMilestone.completionDetails.completedAt)}
                      </p>
                      {isCompletionVerified && grantMilestone.verificationDetails && (
                        <div className="mt-2 p-2 bg-green-50 dark:bg-green-900/10 rounded-md">
                          <p className="text-xs font-semibold text-green-700 dark:text-green-400 mb-1">
                            Verification
                          </p>
                          <p className="text-xs text-zinc-600 dark:text-zinc-400">
                            {grantMilestone.verificationDetails.description}
                          </p>
                          <p className="text-xs text-zinc-400 mt-1">
                            Verified by: {grantMilestone.verificationDetails.verifiedBy}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Show existing invoice badge in read-only view */}
                  {showInvoice && getExistingInvoice(milestone.title)?.invoiceFileKey && (
                    <div className="flex items-center gap-1.5 mt-2">
                      <PaperClipIcon className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                      <span className="text-sm text-emerald-700 dark:text-emerald-300">
                        Invoice attached
                      </span>
                    </div>
                  )}

                  {!grantMilestone?.completionDetails && canEdit && (
                    <div className="mt-3 pt-3 border-t border-zinc-200 dark:border-zinc-700">
                      <Button size="sm" onClick={() => handleStartEdit(milestone.title)}>
                        Add Completion Update
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
