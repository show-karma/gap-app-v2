"use client";

import { AlertTriangle, Inbox, Mail } from "lucide-react";
import { useParams } from "next/navigation";
import { Spinner } from "@/components/Utilities/Spinner";
import { useCommunityAdminAccess } from "@/hooks/communities/useCommunityAdminAccess";
import { useFundingPrograms } from "@/hooks/useFundingPlatform";
import { MESSAGES } from "@/utilities/messages";
import { SendEmailComposer } from "./SendEmailComposer";

function SendEmailContent({ communityId }: { communityId: string }) {
  const { programs, isLoading, error, refetch } = useFundingPrograms(communityId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full">
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-1">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary/10">
              <Mail className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-white">
                Send Email
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Send emails to grantees of your funding programs.
              </p>
            </div>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center py-16 text-center rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900">
          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-50 dark:bg-red-900/20 mb-4">
            <AlertTriangle className="w-6 h-6 text-red-500 dark:text-red-400" />
          </div>
          <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">
            Failed to load funding programs
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Something went wrong while fetching your programs.
          </p>
          <button
            type="button"
            onClick={() => refetch()}
            className="text-sm font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (!programs || programs.length === 0) {
    return (
      <div className="w-full">
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-1">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary/10">
              <Mail className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-white">
                Send Email
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Send emails to grantees of your funding programs.
              </p>
            </div>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center py-16 text-center rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900">
          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 dark:bg-zinc-800 mb-4">
            <Inbox className="w-6 h-6 text-gray-400 dark:text-gray-500" />
          </div>
          <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">
            No funding programs yet
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Create a funding program first to email grantees.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary/10">
            <Mail className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-white">
              Send Email
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Select a program, manage recipients, and compose your message.
            </p>
          </div>
        </div>
      </div>
      <SendEmailComposer programs={programs} />
    </div>
  );
}

export default function SendEmailPage() {
  const { communityId } = useParams() as { communityId: string };
  const { hasAccess, isLoading: isCheckingAccess } = useCommunityAdminAccess(communityId);

  if (isCheckingAccess) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner />
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Access Denied</h1>
        <p className="text-gray-600 dark:text-gray-400">
          {MESSAGES.ADMIN.NOT_AUTHORIZED(communityId)}
        </p>
      </div>
    );
  }

  return <SendEmailContent communityId={communityId} />;
}
