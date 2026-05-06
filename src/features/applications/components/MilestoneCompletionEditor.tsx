"use client";

import { PaperClipIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { Pencil } from "lucide-react";
import dynamic from "next/dynamic";
import { useCallback, useMemo, useRef, useState } from "react";
import { FileUpload } from "@/components/Utilities/FileUpload";
import { MarkdownPreview } from "@/components/Utilities/MarkdownPreview";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { GrantMilestoneWithDetails } from "@/types/v2/roadmap";
import type { MilestoneData, MilestoneStatusEntry } from "@/types/whitelabel-entities";
import { formatDate } from "@/utilities/formatDate";
import { INDEXER } from "@/utilities/indexer";
import { useApplicationInvoiceConfig } from "../hooks/use-application-invoice-config";
import { useSubmitMilestoneCompletion } from "../hooks/use-submit-milestone-completion";
import { isMilestoneCompleted, isMilestoneVerified } from "../lib/milestone-status";
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

/**
 * Stable per-row key for component state. Prefers `milestoneUID` (the
 * authoritative on-chain identifier — unique, never collides on duplicate
 * titles, immutable across renames). Falls back to a positional sentinel
 * for rows that haven't been linked on-chain yet (e.g. drafts or
 * pre-approval previews) so the editor stays functional even though
 * submission requires a UID.
 */
function getMilestoneKey(milestone: MilestoneData, index: number): string {
  return milestone.milestoneUID || `__noUID-${index}`;
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
  // Top-level milestoneStatuses array from the application response —
  // authoritative source for on-chain status (currentStatus, completed,
  // verified) keyed by milestoneUID. Used to render the correct badge
  // when the richer `grantMilestones` prop isn't supplied.
  milestoneStatuses?: MilestoneStatusEntry[];
}

export function MilestoneCompletionEditor({
  milestones,
  fieldLabel,
  referenceNumber,
  isEditable,
  invoiceRequired,
  grantMilestones = [],
  grantUID: grantUIDProp,
  chainID,
  milestoneStatuses,
}: MilestoneCompletionEditorProps) {
  const {
    submit: submitCompletion,
    isPending: isSubmittingCompletion,
    isPendingFor: isSubmittingTitle,
  } = useSubmitMilestoneCompletion();

  const { data: invoiceConfig, isLoading: isInvoiceConfigLoading } = useApplicationInvoiceConfig(
    referenceNumber,
    {
      enabled: !!invoiceRequired,
    }
  );

  const grantUID = grantUIDProp || invoiceConfig?.grantUID;
  const showInvoice = invoiceRequired && invoiceConfig?.invoiceRequired && !!grantUID;
  const milestoneInvoices = invoiceConfig?.milestoneInvoices ?? [];

  // Invoice tracking is keyed by the user-facing label — the indexer
  // persists invoices against milestoneLabel (== milestone title) since
  // the schema predates milestoneUIDs being mandatory.
  const getExistingInvoice = useCallback(
    (milestoneTitle: string) =>
      milestoneInvoices.find((inv) => inv.milestoneLabel === milestoneTitle),
    [milestoneInvoices]
  );

  // Match the rich GrantMilestoneWithDetails by UID instead of title — UID
  // is unique, immutable, and side-steps duplicate-title collisions. Falls
  // back to null when no UID exists (draft / pre-approval row).
  const grantMilestoneByKey = useMemo(() => {
    const map = new Map<string, GrantMilestoneWithDetails | null>();
    milestones.forEach((milestone, index) => {
      const key = getMilestoneKey(milestone, index);
      const match = milestone.milestoneUID
        ? grantMilestones.find((gm) => gm.uid === milestone.milestoneUID)
        : undefined;
      map.set(key, match ?? null);
    });
    return map;
  }, [milestones, grantMilestones]);

  // Authoritative status lookup keyed by milestoneUID — populated by the
  // application detail page via the new `milestoneStatuses` array. The
  // richer `grantMilestones` prop wins when both are wired (project page).
  const statusByUID = useMemo(() => {
    const map = new Map<string, MilestoneStatusEntry>();
    for (const entry of milestoneStatuses ?? []) {
      map.set(entry.milestoneUID, entry);
    }
    return map;
  }, [milestoneStatuses]);

  // Per-row state is keyed by the stable milestone key (see
  // `getMilestoneKey`) so duplicate titles never share state and a rename
  // can't orphan in-flight work.
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editedText, setEditedText] = useState<Record<string, string>>({});
  const [invoiceFiles, setInvoiceFiles] = useState<Record<string, InvoiceFileState | null>>({});
  const [uploadingKeys, setUploadingKeys] = useState<Set<string>>(new Set());
  const pendingFileNameRef = useRef<Record<string, string>>({});

  const handleStartEdit = (key: string, milestoneUID?: string) => {
    const grantMilestone = milestoneUID
      ? grantMilestones.find((m) => m.uid === milestoneUID)
      : undefined;
    const completionText = grantMilestone?.completionDetails?.description || "";
    setEditingKey(key);
    setEditedText((prev) => ({ ...prev, [key]: completionText }));
  };

  const handleCancelEdit = (key: string) => {
    setEditingKey(null);
    setEditedText((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
    setInvoiceFiles((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const handleInvoiceFileSelected = useCallback((file: File, key: string) => {
    pendingFileNameRef.current[key] = file.name;
    setUploadingKeys((prev) => new Set(prev).add(key));
  }, []);

  const handleInvoiceFileUploaded = useCallback(
    (finalUrl: string, tempKey: string, key: string) => {
      setInvoiceFiles((prev) => ({
        ...prev,
        [key]: {
          fileUrl: finalUrl,
          fileKey: tempKey,
          fileName: pendingFileNameRef.current[key] || "invoice",
        },
      }));
      setUploadingKeys((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    },
    []
  );

  const handleInvoiceUploadError = useCallback((key: string) => {
    setUploadingKeys((prev) => {
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
  }, []);

  const handleRemoveInvoice = useCallback((key: string) => {
    setInvoiceFiles((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  const handleSubmit = async (milestoneData: MilestoneData, key: string) => {
    const grantMilestone = milestoneData.milestoneUID
      ? grantMilestones.find((m) => m.uid === milestoneData.milestoneUID)
      : undefined;
    const statusEntry = milestoneData.milestoneUID
      ? statusByUID.get(milestoneData.milestoneUID)
      : undefined;
    const invoiceFile = invoiceFiles[key] ?? null;

    try {
      await submitCompletion({
        // Title is still the backend's invoice label and the AI-eval key;
        // the on-chain attestation itself uses the UID under the hood.
        milestoneTitle: milestoneData.title,
        proofOfWork: editedText[key] || "",
        referenceNumber,
        invoiceFile: invoiceFile
          ? { fileKey: invoiceFile.fileKey, fileUrl: invoiceFile.fileUrl }
          : null,
        statusEntry,
        grantMilestone,
        grantUID,
        chainID,
      });

      // Reset edit state on success only — failures keep the form open
      // so the grantee can retry without re-entering proofOfWork.
      setEditingKey(null);
      setEditedText((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      setInvoiceFiles((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    } catch {
      // Error toasts are handled by the hook / underlying attestation
      // mutation. Swallow here so the inline form stays open for retry.
    }
  };

  const isSubmitEnabled = (key: string) => {
    if (uploadingKeys.has(key)) return false;
    const currentText = editedText[key] || "";
    const hasTextChange = currentText.trim().length > 0;
    const hasInvoice = !!invoiceFiles[key];
    return hasTextChange || hasInvoice;
  };

  return (
    <div className="space-y-3">
      {milestones.map((milestone, index) => {
        const key = getMilestoneKey(milestone, index);
        const grantMilestone = grantMilestoneByKey.get(key);
        const isEditing = editingKey === key;
        const currentText = editedText[key] || "";
        const statusEntry = milestone.milestoneUID
          ? statusByUID.get(milestone.milestoneUID)
          : undefined;
        const isCompletionVerified = isMilestoneVerified(statusEntry, grantMilestone);
        const isCompletionSubmitted =
          isMilestoneCompleted(statusEntry, grantMilestone) && !isCompletionVerified;
        const canEdit = isEditable && !isCompletionVerified;
        const isUploading = uploadingKeys.has(key);
        const isWaitingForIndexer = isSubmittingTitle(milestone.title);

        const additionalFields = Object.keys(milestone).filter(
          (k) => !MILESTONE_CORE_FIELDS.includes(k) && milestone[k as keyof MilestoneData]
        );

        return (
          <div
            key={`${fieldLabel}-${key}`}
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
                  {isCompletionVerified ? (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                      Verified
                    </span>
                  ) : isCompletionSubmitted ? (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                      Completed
                    </span>
                  ) : (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-700">
                      Pending
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
                    onChange={(e) => setEditedText((prev) => ({ ...prev, [key]: e.target.value }))}
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
                      const invoiceFile = invoiceFiles[key];
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
                                onClick={() => handleRemoveInvoice(key)}
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
                                onFileSelect={(file) => handleInvoiceFileSelected(file, key)}
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
                                  handleInvoiceFileUploaded(finalUrl, tempKey, key)
                                }
                                onS3UploadError={() => handleInvoiceUploadError(key)}
                              />
                            </div>
                          )}
                        </div>
                      );
                    })()}

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleSubmit(milestone, key)}
                      isLoading={isWaitingForIndexer}
                      disabled={
                        !isSubmitEnabled(key) ||
                        isSubmittingCompletion ||
                        isUploading ||
                        isWaitingForIndexer
                      }
                    >
                      {isWaitingForIndexer
                        ? "Submitting..."
                        : grantMilestone?.completionDetails
                          ? "Update"
                          : "Save"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCancelEdit(key)}
                      disabled={isWaitingForIndexer}
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
                          <Button
                            size="icon-sm"
                            onClick={() => handleStartEdit(key, milestone.milestoneUID)}
                          >
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
                      <Button
                        size="sm"
                        onClick={() => handleStartEdit(key, milestone.milestoneUID)}
                      >
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
