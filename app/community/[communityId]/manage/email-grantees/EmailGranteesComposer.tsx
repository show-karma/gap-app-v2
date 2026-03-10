"use client";

import { XMarkIcon } from "@heroicons/react/24/outline";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { Spinner } from "@/components/Utilities/Spinner";
import type { FundingProgram } from "@/services/fundingPlatformService";
import fetchData from "@/utilities/fetchData";

interface GranteeEmail {
  email: string;
  projectName: string;
  referenceNumber?: string;
}

interface EmailGranteesComposerProps {
  programs: FundingProgram[];
}

export function EmailGranteesComposer({ programs }: EmailGranteesComposerProps) {
  const [selectedProgramId, setSelectedProgramId] = useState("");
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
  } = useQuery({
    queryKey: ["grantee-emails", selectedProgramId],
    queryFn: async () => {
      const [data, error] = await fetchData<{ emails: GranteeEmail[] }>(
        `/v2/email-grantees/program/${selectedProgramId}/emails`
      );
      if (error) throw new Error(error);
      return data?.emails ?? [];
    },
    enabled: !!selectedProgramId,
  });

  const handleProgramChange = useCallback((programId: string) => {
    setSelectedProgramId(programId);
    setRecipients([]);
  }, []);

  const deduplicateEmails = useCallback((emails: GranteeEmail[]): string[] => {
    const seen = new Set<string>();
    return emails.reduce<string[]>((acc, g) => {
      const normalized = g.email.trim().toLowerCase();
      if (normalized && !seen.has(normalized)) {
        seen.add(normalized);
        acc.push(normalized);
      }
      return acc;
    }, []);
  }, []);

  const handleEmailsFetched = useCallback(() => {
    if (granteeEmails) {
      setRecipients(deduplicateEmails(granteeEmails));
    }
  }, [granteeEmails, deduplicateEmails]);

  // Auto-populate recipients when grantee emails load for a new program
  const prevProgramRef = useRef<string | null>(null);
  useEffect(() => {
    if (granteeEmails && prevProgramRef.current !== selectedProgramId) {
      prevProgramRef.current = selectedProgramId;
      setRecipients(deduplicateEmails(granteeEmails));
    }
  }, [granteeEmails, selectedProgramId, deduplicateEmails]);

  const removeRecipient = useCallback((email: string) => {
    setRecipients((prev) => prev.filter((r) => r !== email));
  }, []);

  const addManualEmail = useCallback(() => {
    const trimmed = manualEmail.trim().toLowerCase();
    if (!trimmed) return;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmed)) {
      toast.error("Please enter a valid email address");
      return;
    }
    if (recipients.includes(trimmed)) {
      toast.error("This email is already in the list");
      return;
    }
    setRecipients((prev) => [...prev, trimmed]);
    setManualEmail("");
  }, [manualEmail, recipients]);

  const sendEmailMutation = useMutation({
    mutationFn: async () => {
      const [data, error] = await fetchData<{
        success: boolean;
        sentCount: number;
        failedCount: number;
      }>("/v2/email-grantees/send", "POST", {
        programId: selectedProgramId,
        recipients,
        subject,
        body,
      });
      if (error) throw new Error(error);
      return data;
    },
    onSuccess: (data) => {
      if (data?.success) {
        toast.success(
          `Email sent successfully to ${data.sentCount} recipient${data.sentCount === 1 ? "" : "s"}`
        );
        setSubject("");
        setBody("");
      } else {
        toast.success(
          `Sent to ${data?.sentCount} recipient${data?.sentCount === 1 ? "" : "s"}, ${data?.failedCount} failed`
        );
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to send email");
    },
  });

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
                onClick={handleEmailsFetched}
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
                    const grantee = granteeEmails?.find((g) => g.email === email);
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
                          <XMarkIcon className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                  {granteeEmails && granteeEmails.length === 0
                    ? "No approved grantees with email addresses found for this program."
                    : "No recipients selected. Add emails manually or select a program with grantees."}
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

            <div>
              <label
                htmlFor="email-body"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Message
                <span className="ml-1 text-xs font-normal text-gray-400">
                  (supports markdown: **bold**, *italic*, [links](url))
                </span>
              </label>
              <textarea
                id="email-body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Write your message here..."
                rows={10}
                maxLength={50000}
                className="w-full rounded-lg border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-4 py-3 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 focus:outline-none resize-y"
              />
            </div>
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
              onClick={() => sendEmailMutation.mutate()}
              className="rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {sendEmailMutation.isPending ? (
                <>
                  <Spinner />
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
