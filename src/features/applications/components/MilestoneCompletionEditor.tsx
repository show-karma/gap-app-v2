"use client";

import { PaperClipIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { Pencil } from "lucide-react";
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
import { useApplicationInvoiceConfig } from "../hooks/use-application-invoice-config";
import { useMilestoneCompletions } from "../hooks/use-milestone-completions";
import { formatFieldLabel, isMarkdownContent, MILESTONE_CORE_FIELDS } from "../lib/milestone-utils";

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
}

export function MilestoneCompletionEditor({
  milestones,
  fieldLabel,
  referenceNumber,
  isEditable,
  invoiceRequired,
}: MilestoneCompletionEditorProps) {
  const {
    isLoading,
    createCompletion,
    updateCompletion,
    isCreating,
    isUpdating,
    getCompletion,
    hasCompletion,
  } = useMilestoneCompletions({
    referenceNumber,
    enabled: true,
  });

  const { data: invoiceConfig, isLoading: isInvoiceConfigLoading } = useApplicationInvoiceConfig(
    referenceNumber,
    {
      enabled: !!invoiceRequired,
    }
  );

  const grantUID = invoiceConfig?.grantUID;
  const showInvoice = invoiceRequired && invoiceConfig?.invoiceRequired && !!grantUID;
  const milestoneInvoices = invoiceConfig?.milestoneInvoices ?? [];

  const getExistingInvoice = useCallback(
    (milestoneTitle: string) =>
      milestoneInvoices.find((inv) => inv.milestoneLabel === milestoneTitle),
    [milestoneInvoices]
  );

  const [editingMilestone, setEditingMilestone] = useState<string | null>(null);
  const [editedText, setEditedText] = useState<Record<string, string>>({});
  const [invoiceFiles, setInvoiceFiles] = useState<Record<string, InvoiceFileState | null>>({});
  const [uploadingMilestones, setUploadingMilestones] = useState<Set<string>>(new Set());
  const pendingFileNameRef = useRef<Record<string, string>>({});

  const handleStartEdit = (milestoneTitle: string) => {
    const completion = getCompletion(fieldLabel, milestoneTitle);
    setEditingMilestone(milestoneTitle);
    setEditedText({
      ...editedText,
      [milestoneTitle]: completion?.completionText || "",
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

  const handleSubmit = (milestoneTitle: string) => {
    const text = editedText[milestoneTitle] || "";
    const existingCompletion = hasCompletion(fieldLabel, milestoneTitle);
    const invoiceFile = invoiceFiles[milestoneTitle];

    const submitInvoice = async () => {
      if (invoiceFile && grantUID) {
        try {
          await submitGranteeInvoice(grantUID, {
            milestoneLabel: milestoneTitle,
            invoiceFileKey: invoiceFile.fileKey,
            invoiceFileUrl: invoiceFile.fileUrl,
          });
          toast.success("Invoice submitted successfully");
        } catch {
          toast.error("Failed to submit invoice");
        }
      }
    };

    const onSuccess = async () => {
      await submitInvoice();
      setEditingMilestone(null);
      setInvoiceFiles((prev) => {
        const next = { ...prev };
        delete next[milestoneTitle];
        return next;
      });
    };

    if (existingCompletion) {
      updateCompletion(
        {
          milestoneFieldLabel: fieldLabel,
          milestoneTitle,
          completionText: text,
        },
        { onSuccess }
      );
    } else {
      createCompletion(
        {
          milestoneFieldLabel: fieldLabel,
          milestoneTitle,
          completionText: text,
        },
        { onSuccess }
      );
    }
  };

  const isSubmitEnabled = (milestoneTitle: string) => {
    if (uploadingMilestones.has(milestoneTitle)) return false;
    const currentText = editedText[milestoneTitle] || "";
    const completion = getCompletion(fieldLabel, milestoneTitle);
    const savedText = completion?.completionText || "";
    const hasTextChange = currentText !== savedText;
    const hasInvoice = !!invoiceFiles[milestoneTitle];
    return hasTextChange || hasInvoice;
  };

  if (isLoading) {
    return <div className="text-zinc-500">Loading milestones...</div>;
  }

  return (
    <div className="space-y-3">
      {milestones.map((milestone, index) => {
        const completion = getCompletion(fieldLabel, milestone.title);
        const isEditing = editingMilestone === milestone.title;
        const currentText = editedText[milestone.title] || "";
        const isCompletionVerified = completion?.isVerified || false;
        const canEdit = isEditable && !isCompletionVerified;
        const invoiceFile = invoiceFiles[milestone.title];
        const isUploading = uploadingMilestones.has(milestone.title);

        const additionalFields = Object.keys(milestone).filter(
          (key) => !MILESTONE_CORE_FIELDS.includes(key) && milestone[key as keyof MilestoneData]
        );

        return (
          <div
            key={`${fieldLabel}-${milestone.title}-${index}`}
            className="rounded-lg border bg-zinc-50 dark:bg-zinc-800/50 p-4"
          >
            <div className="space-y-2">
              <div className="flex justify-between items-start">
                <h4 className="font-medium">{milestone.title}</h4>
                <div className="flex items-center gap-2">
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
                  {showInvoice && !isInvoiceConfigLoading && (() => {
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
                              onFileSelect={(file) => handleInvoiceFileSelected(file, milestone.title)}
                              acceptedFormats=".pdf,.docx"
                              description={existingInvoice?.invoiceFileKey ? "Upload to replace existing invoice" : "PDF or DOCX (max 10MB)"}
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
                      isLoading={isCreating || isUpdating}
                      disabled={
                        !isSubmitEnabled(milestone.title) || isCreating || isUpdating || isUploading
                      }
                    >
                      {isCreating || isUpdating ? "Saving..." : completion ? "Update" : "Save"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCancelEdit(milestone.title)}
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
                        <p className="text-xs font-semibold">Completion Update</p>
                        {canEdit && (
                          <Button size="icon-sm" onClick={() => handleStartEdit(milestone.title)}>
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

                  {/* Show existing invoice badge in read-only view */}
                  {showInvoice && getExistingInvoice(milestone.title)?.invoiceFileKey && (
                    <div className="flex items-center gap-1.5 mt-2">
                      <PaperClipIcon className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                      <span className="text-sm text-emerald-700 dark:text-emerald-300">
                        Invoice attached
                      </span>
                    </div>
                  )}

                  {!completion && canEdit && (
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
