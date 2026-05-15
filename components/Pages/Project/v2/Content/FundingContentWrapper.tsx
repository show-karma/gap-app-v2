"use client";

import { useParams } from "next/navigation";
import { FundingContentSkeleton } from "@/components/Pages/Project/v2/Skeletons/FundingContentSkeleton";
import { useProjectProfile } from "@/hooks/v2/useProjectProfile";
import { FundingContent } from "../FundingPage/FundingContent";

/**
 * Wrapper component for FundingContent that fetches project data.
 *
 * Renders three explicit states (loading / error / success). The error
 * state surfaces a retry CTA for transient network failures instead of
 * leaving the page in an indefinite loading spinner — see DEV-236.
 */
export function FundingContentWrapper() {
  const { projectId } = useParams();
  const { project, isProjectLoading, isError, refetch } = useProjectProfile(projectId as string);

  if (isProjectLoading) {
    return <FundingContentSkeleton />;
  }

  if (isError || !project) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          Couldn&apos;t load funding details
        </h2>
        <p className="max-w-md text-sm text-zinc-600 dark:text-zinc-400">
          We hit a network issue while loading this project. Check your connection and try again.
        </p>
        <button
          type="button"
          onClick={() => {
            void refetch();
          }}
          className="mt-2 rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
        >
          Try again
        </button>
      </div>
    );
  }

  return <FundingContent project={project} />;
}
