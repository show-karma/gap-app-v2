"use client";

import { X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { MarkdownEditor } from "@/components/Utilities/MarkdownEditor";
import { type DropdownItem, MultiSelectDropdown } from "@/components/Utilities/MultiSelectDropdown";
import { Spinner } from "@/components/Utilities/Spinner";
import type { FundingProgram } from "@/services/fundingPlatformService";
import { useGranteeEmails, useSendEmailToGrantees } from "./hooks/useEmailGrantees";

interface GranteeEmail {
  email: string;
  projectName: string;
  referenceNumber?: string;
}

function deduplicateEmails(emails: GranteeEmail[]): string[] {
  const seen = new Set<string>();
  return emails.reduce<string[]>((acc, g) => {
    const normalized = g.email.trim().toLowerCase();
    if (normalized && !seen.has(normalized)) {
      seen.add(normalized);
      acc.push(normalized);
    }
    return acc;
  }, []);
}

const APPLICATION_STATUS_ITEMS: DropdownItem[] = [
  { id: "pending", label: "Pending" },
  { id: "under_review", label: "Under Review" },
  { id: "approved", label: "Approved" },
  { id: "in_progress", label: "In Progress" },
  { id: "rejected", label: "Rejected" },
  { id: "revision_requested", label: "Revision Requested" },
  { id: "resubmitted", label: "Resubmitted" },
  { id: "withdrawn", label: "Withdrawn" },
];

function statusLabel(value: string): string {
  return APPLICATION_STATUS_ITEMS.find((s) => s.id === value)?.label || value;
}

function emptyRecipientsMessage(
  granteeEmails: GranteeEmail[] | undefined,
  selectedStatuses: string[]
): string {
  if (granteeEmails && granteeEmails.length === 0) {
    if (selectedStatuses.length === 0) {
      return "No statuses selected. Select at least one status above to fetch grantee emails.";
    }
    const labels = selectedStatuses.map(statusLabel).join(", ");
    const suffix = selectedStatuses.length === 1 ? "" : "es";
    return `No grantees with email addresses found for ${labels} status${suffix}.`;
  }
  return "No recipients selected. Add emails manually or select a program with grantees.";
}

interface EmailGranteesComposerProps {
  programs: FundingProgram[];
}

export function EmailGranteesComposer({ programs }: EmailGranteesComposerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [selectedProgramId, setSelectedProgramId] = useState(
    () => searchParams.get("programId") || ""
  );
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>(() => {
    const fromUrl = searchParams.get("statuses");
    return fromUrl ? fromUrl.split(",") : ["approved"];
  });
  const [recipients, setRecipients] = useState<string[]>([]);
  const [manualEmail, setManualEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  const selectedProgram = programs.find((p) => p.programId === selectedProgramId);

  const {
    data: granteeEmails,
    isLoading: isLoadingEmails,
    isError: isEmailsError,
    refetch: refetchEmails,
  } = useGranteeEmails(selectedProgramId, selectedStatuses);

  const sendEmailMutation = useSendEmailToGrantees();

  // Track previous program to auto-populate recipients only on program change
  const prevProgramRef = useRef<string | null>(null);

  function updateSearchParam(key: string, value: string | undefined) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  function handleProgramChange(programId: string) {
    setSelectedProgramId(programId);
    setRecipients([]);
    if (!programId) {
      prevProgramRef.current = null;
    }
    updateSearchParam("programId", programId || undefined);
  }

  function handleStatusChange(newStatuses: string[]) {
    setSelectedStatuses(newStatuses);
    updateSearchParam("statuses", newStatuses.length > 0 ? newStatuses.join(",") : undefined);
    setRecipients([]);
    prevProgramRef.current = null;
  }

  function resetToAllGrantees() {
    if (granteeEmails) {
      setRecipients(deduplicateEmails(granteeEmails));
    }
  }

  useEffect(() => {
    if (granteeEmails && prevProgramRef.current !== selectedProgramId) {
      prevProgramRef.current = selectedProgramId;
      setRecipients(deduplicateEmails(granteeEmails));
    }
  }, [granteeEmails, selectedProgramId]);

  function removeRecipient(email: string) {
    setRecipients((prev) => prev.filter((r) => r !== email));
  }

  function addManualEmail() {
    const trimmed = manualEmail.trim().toLowerCase();
    if (!trimmed) return;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    if (!emailRegex.test(trimmed)) {
      toast.error("Please enter a valid email address");
      return;
    }
    setRecipients((prev) => {
      if (prev.includes(trimmed)) {
        toast.error("This email is already in the list", { id: "duplicate-email" });
        return prev;
      }
      return [...prev, trimmed];
    });
    setManualEmail("");
  }

  function handleSendEmail() {
    const confirmed = window.confirm(
      `Are you sure you want to send this email to ${recipients.length} recipient${recipients.length === 1 ? "" : "s"}?`
    );
    if (!confirmed) return;

    sendEmailMutation.mutate(
      {
        programId: selectedProgramId,
        recipients,
        subject,
        body,
      },
      {
        onSuccess: (data) => {
          if (data.success) {
            setSubject("");
            setBody("");
          }
        },
      }
    );
  }

  const canSend = selectedProgramId && recipients.length > 0 && subject.trim() && body.trim();

  return (
    <div className="space-y-6">
      {/* Program Selector */}
      <div className="rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-6">
        <label
          htmlFor="program-select"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
        >
          Select Program
        </label>
        <select
          id="program-select"
          value={selectedProgramId}
          onChange={(e) => handleProgramChange(e.target.value)}
          className="w-full rounded-lg border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-4 py-2.5 text-sm text-gray-900 dark:text-white focus:border-primary-500 focus:ring-1 focus:ring-primary-500 focus:outline-none"
        >
          <option value="">Choose a program...</option>
          {programs.map((program) => (
            <option key={program.programId} value={program.programId}>
              {program.metadata?.title || program.name || program.programId}
            </option>
          ))}
        </select>
      </div>

      {/* Application Status Filter */}
      {selectedProgramId && (
        <div className="rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-6">
          <MultiSelectDropdown
            label="Application Status Filter"
            items={APPLICATION_STATUS_ITEMS}
            selectedIds={selectedStatuses}
            onChange={handleStatusChange}
            placeholder="Select statuses..."
            searchPlaceholder="Search statuses..."
          />
        </div>
      )}

      {/* Recipients Section */}
      {selectedProgramId && (
        <div className="rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Recipients
              {recipients.length > 0 && (
                <span className="ml-2 text-sm font-normal text-gray-500 dark:text-gray-400">
                  ({recipients.length})
                </span>
              )}
            </h2>
            {granteeEmails && granteeEmails.length > 0 && (
              <button
                type="button"
                onClick={resetToAllGrantees}
                className="text-sm text-primary-600 dark:text-primary-400 hover:underline"
              >
                Reset to all grantees
              </button>
            )}
          </div>

          {isLoadingEmails ? (
            <div className="flex items-center justify-center py-8">
              <Spinner />
              <span className="ml-2 text-sm text-gray-500">Loading grantee emails...</span>
            </div>
          ) : isEmailsError ? (
            <div className="text-center py-8">
              <p className="text-sm text-red-600 dark:text-red-400 mb-2">
                Failed to load grantee emails
              </p>
              <button
                type="button"
                onClick={() => refetchEmails()}
                className="text-sm text-primary-600 dark:text-primary-400 hover:underline"
              >
                Try again
              </button>
            </div>
          ) : (
            <>
              {/* Email chips */}
              {recipients.length > 0 ? (
                <div className="flex flex-wrap gap-2 mb-4">
                  {recipients.map((email) => {
                    const grantee = granteeEmails?.find(
                      (g) => g.email.trim().toLowerCase() === email
                    );
                    return (
                      <div
                        key={email}
                        className="inline-flex items-center gap-1.5 rounded-full bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 px-3 py-1.5 text-sm"
                        title={grantee ? `${grantee.projectName} - ${email}` : email}
                      >
                        <span className="text-primary-700 dark:text-primary-300 max-w-[200px] truncate">
                          {email}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeRecipient(email)}
                          className="flex-shrink-0 text-primary-500 hover:text-primary-700 dark:hover:text-primary-200"
                          aria-label={`Remove ${email}`}
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                  {emptyRecipientsMessage(granteeEmails, selectedStatuses)}
                </p>
              )}

              {/* Add manual email */}
              <div className="flex gap-2">
                <label htmlFor="manual-recipient" className="sr-only">
                  Add recipient email
                </label>
                <input
                  id="manual-recipient"
                  type="email"
                  value={manualEmail}
                  onChange={(e) => setManualEmail(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addManualEmail();
                    }
                  }}
                  placeholder="Add email address..."
                  className="flex-1 rounded-lg border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-4 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={addManualEmail}
                  className="rounded-lg bg-gray-100 dark:bg-zinc-800 border border-gray-300 dark:border-zinc-600 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors"
                >
                  Add
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Email Composer */}
      {selectedProgramId && recipients.length > 0 && (
        <div className="rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Compose Email
          </h2>

          <div className="space-y-4">
            <div>
              <label
                htmlFor="email-subject"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Subject
              </label>
              <input
                id="email-subject"
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Email subject..."
                maxLength={200}
                className="w-full rounded-lg border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-4 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 focus:outline-none"
              />
            </div>

            <MarkdownEditor
              label="Message"
              value={body}
              onChange={(val) => setBody(val)}
              placeholder="Write your message here..."
              height={300}
              minHeight={200}
              maxLength={50000}
              showCharacterCount
            />
          </div>

          <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200 dark:border-zinc-700">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Sending to {recipients.length} recipient{recipients.length === 1 ? "" : "s"}
              {selectedProgram && (
                <span> from {selectedProgram.metadata?.title || selectedProgram.name}</span>
              )}
            </p>
            <button
              type="button"
              disabled={!canSend || sendEmailMutation.isPending}
              onClick={handleSendEmail}
              className="rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {sendEmailMutation.isPending ? (
                <>
                  <Spinner className="w-4 h-4" />
                  Sending...
                </>
              ) : (
                "Send Email"
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
