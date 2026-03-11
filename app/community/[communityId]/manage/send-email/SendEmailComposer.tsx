"use client";

import { Filter, Plus, RotateCcw, Send, Users, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { MarkdownEditor } from "@/components/Utilities/MarkdownEditor";
import { type DropdownItem, MultiSelectDropdown } from "@/components/Utilities/MultiSelectDropdown";
import { Spinner } from "@/components/Utilities/Spinner";
import type { FundingProgram } from "@/services/fundingPlatformService";
import { useGranteeEmails, useSendEmailToGrantees } from "./hooks/useSendEmail";

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
  { id: "pending", label: "Pending", color: "#f59e0b" },
  { id: "under_review", label: "Under Review", color: "#3b82f6" },
  { id: "approved", label: "Approved", color: "#22c55e" },
  { id: "in_progress", label: "In Progress", color: "#8b5cf6" },
  { id: "rejected", label: "Rejected", color: "#ef4444" },
  { id: "revision_requested", label: "Revision Requested", color: "#f97316" },
  { id: "resubmitted", label: "Resubmitted", color: "#06b6d4" },
  { id: "withdrawn", label: "Withdrawn", color: "#6b7280" },
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

interface RecipientsListProps {
  recipients: string[];
  granteeEmails: GranteeEmail[] | undefined;
  selectedStatuses: string[];
  manualEmail: string;
  setManualEmail: (value: string) => void;
  addManualEmail: () => void;
  removeRecipient: (email: string) => void;
  resetToAllGrantees: () => void;
}

function RecipientsList({
  recipients,
  granteeEmails,
  selectedStatuses,
  manualEmail,
  setManualEmail,
  addManualEmail,
  removeRecipient,
  resetToAllGrantees,
}: RecipientsListProps) {
  return (
    <>
      {recipients.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {recipients.map((email) => {
            const grantee = granteeEmails?.find((g) => g.email.trim().toLowerCase() === email);
            return (
              <div
                key={email}
                className="group inline-flex items-center gap-1 rounded-md bg-gray-100 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 px-2 py-1 text-xs transition-colors hover:bg-gray-150 dark:hover:bg-zinc-750"
                title={grantee ? `${grantee.projectName} - ${email}` : email}
              >
                <span className="text-gray-700 dark:text-zinc-300 max-w-[180px] truncate">
                  {email}
                </span>
                <button
                  type="button"
                  onClick={() => removeRecipient(email)}
                  className="flex-shrink-0 text-gray-400 hover:text-red-500 dark:text-zinc-500 dark:hover:text-red-400 transition-colors"
                  aria-label={`Remove ${email}`}
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            );
          })}
          {granteeEmails && granteeEmails.length > 0 && (
            <button
              type="button"
              onClick={resetToAllGrantees}
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors"
              title="Reset to all grantees"
            >
              <RotateCcw className="w-3 h-3" />
              Reset
            </button>
          )}
        </div>
      ) : (
        <p className="text-sm text-gray-400 dark:text-zinc-500 py-1">
          {emptyRecipientsMessage(granteeEmails, selectedStatuses)}
        </p>
      )}

      {/* Add manual email inline */}
      <div className="flex items-center gap-2 mt-2">
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
          className="flex-1 min-w-0 rounded-md border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800/50 px-3 py-1.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-zinc-500 focus:bg-white dark:focus:bg-zinc-800 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none transition-all"
        />
        <button
          type="button"
          onClick={addManualEmail}
          className="flex items-center gap-1 rounded-md bg-gray-100 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-zinc-300 hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors"
        >
          <Plus className="w-3 h-3" />
          Add
        </button>
      </div>

      {recipients.length > 0 && (
        <p className="text-xs text-gray-400 dark:text-zinc-500 mt-1.5">
          {recipients.length} recipient{recipients.length === 1 ? "" : "s"} selected
        </p>
      )}
    </>
  );
}

interface SendEmailComposerProps {
  programs: FundingProgram[];
}

export function SendEmailComposer({ programs }: SendEmailComposerProps) {
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
    <div className="flex flex-col xl:flex-row gap-6">
      {/* Left panel: Program & filters */}
      <div className="w-full xl:w-80 2xl:w-96 flex-shrink-0">
        <div className="xl:sticky xl:top-6 space-y-4">
          {/* Program selection */}
          <div className="rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-400 dark:text-zinc-500" />
                <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
                  Program & Filters
                </h2>
              </div>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label
                  htmlFor="program-select"
                  className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1.5"
                >
                  Program
                </label>
                <select
                  id="program-select"
                  value={selectedProgramId}
                  onChange={(e) => handleProgramChange(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3.5 py-2.5 text-sm text-gray-900 dark:text-white focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none transition-shadow"
                >
                  <option value="">Choose a program...</option>
                  {programs.map((program) => (
                    <option key={program.programId} value={program.programId}>
                      {program.metadata?.title || program.name || program.programId}
                    </option>
                  ))}
                </select>
              </div>

              {selectedProgramId && (
                <MultiSelectDropdown
                  label="Application Status"
                  items={APPLICATION_STATUS_ITEMS}
                  selectedIds={selectedStatuses}
                  onChange={handleStatusChange}
                  placeholder="Select statuses..."
                  searchPlaceholder="Search statuses..."
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Right panel: Compose area */}
      <div className="flex-1 min-w-0">
        {!selectedProgramId ? (
          <div className="flex flex-col items-center justify-center py-20 text-center rounded-xl border border-dashed border-gray-300 dark:border-zinc-600 bg-gray-50/50 dark:bg-zinc-800/30">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 dark:bg-zinc-800 mb-4">
              <Send className="w-5 h-5 text-gray-400 dark:text-zinc-500" />
            </div>
            <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">
              Select a program to get started
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs">
              Choose a funding program from the panel on the left, then compose your email.
            </p>
          </div>
        ) : (
          <div className="rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-sm overflow-hidden flex flex-col">
            {/* Recipients "To" row */}
            <div className="px-5 py-4 border-b border-gray-100 dark:border-zinc-800">
              <div className="flex items-start gap-3">
                <div className="flex items-center gap-2 pt-0.5 flex-shrink-0">
                  <Users className="w-4 h-4 text-gray-400 dark:text-zinc-500" />
                  <span className="text-sm font-medium text-gray-500 dark:text-zinc-400">To</span>
                </div>
                <div className="flex-1 min-w-0">
                  {isLoadingEmails ? (
                    <output className="flex items-center gap-2 py-1" aria-live="polite">
                      <Spinner className="w-4 h-4" />
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        Loading grantee emails...
                      </span>
                    </output>
                  ) : isEmailsError ? (
                    <div className="flex items-center gap-3 py-1">
                      <p className="text-sm text-red-600 dark:text-red-400">
                        Failed to load grantee emails.
                      </p>
                      <button
                        type="button"
                        onClick={() => refetchEmails()}
                        className="text-sm font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors"
                      >
                        Retry
                      </button>
                    </div>
                  ) : (
                    <RecipientsList
                      recipients={recipients}
                      granteeEmails={granteeEmails}
                      selectedStatuses={selectedStatuses}
                      manualEmail={manualEmail}
                      setManualEmail={setManualEmail}
                      addManualEmail={addManualEmail}
                      removeRecipient={removeRecipient}
                      resetToAllGrantees={resetToAllGrantees}
                    />
                  )}
                </div>
              </div>
            </div>

            {/* Subject row */}
            <div className="px-5 py-3 border-b border-gray-100 dark:border-zinc-800">
              <div className="flex items-center gap-3">
                <label
                  htmlFor="email-subject"
                  className="text-sm font-medium text-gray-500 dark:text-zinc-400 flex-shrink-0"
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
                  className="flex-1 min-w-0 bg-transparent border-0 px-0 py-1 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-zinc-500 focus:ring-0 focus:outline-none"
                />
              </div>
            </div>

            {/* Body */}
            <div className="px-5 pt-4 pb-2 flex-1">
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

            {/* Send footer */}
            <div className="px-5 py-4 bg-gray-50 dark:bg-zinc-800/50 border-t border-gray-100 dark:border-zinc-800">
              <div className="flex items-center justify-between gap-4">
                <p className="text-sm text-gray-500 dark:text-zinc-400 truncate">
                  Sending to{" "}
                  <span className="font-medium text-gray-700 dark:text-zinc-300">
                    {recipients.length} recipient{recipients.length === 1 ? "" : "s"}
                  </span>
                  {selectedProgram && (
                    <span>
                      {" "}
                      from{" "}
                      <span className="font-medium text-gray-700 dark:text-zinc-300">
                        {selectedProgram.metadata?.title || selectedProgram.name}
                      </span>
                    </span>
                  )}
                </p>
                <button
                  type="button"
                  disabled={!canSend || sendEmailMutation.isPending}
                  onClick={handleSendEmail}
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-sm transition-all hover:bg-primary/90 hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none active:scale-[0.98] flex-shrink-0"
                >
                  {sendEmailMutation.isPending ? (
                    <>
                      <Spinner className="w-4 h-4" />
                      <span>Sending...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Send Email</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
