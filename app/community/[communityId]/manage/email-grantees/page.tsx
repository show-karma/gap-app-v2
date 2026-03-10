"use client";

import { useParams } from "next/navigation";
import { Spinner } from "@/components/Utilities/Spinner";
import { useCommunityAdminAccess } from "@/hooks/communities/useCommunityAdminAccess";
import { useFundingPrograms } from "@/hooks/useFundingPlatform";
import { MESSAGES } from "@/utilities/messages";
import { EmailGranteesComposer } from "./EmailGranteesComposer";

export default function EmailGranteesPage() {
  const { communityId } = useParams() as { communityId: string };
  const { hasAccess, isLoading: isCheckingAccess } = useCommunityAdminAccess(communityId);
  const { programs, isLoading: isProgramsLoading } = useFundingPrograms(communityId);

  if (isCheckingAccess || isProgramsLoading) {
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

  if (!programs || programs.length === 0) {
    return (
      <div className="max-w-full w-full">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-primary">Email Grantees</h1>
          <p className="text-foreground mt-2">Send emails to grantees of your funding programs.</p>
        </div>
        <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed border-gray-300 dark:border-zinc-700 rounded-xl">
          <p className="text-gray-500 dark:text-gray-400">
            No funding programs found. Create a funding program first to email grantees.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-full w-full">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-primary">Email Grantees</h1>
        <p className="text-foreground mt-2">
          Select a program, manage recipients, and compose an email to send to your grantees.
        </p>
      </div>
      <EmailGranteesComposer programs={programs} />
    </div>
  );
}
