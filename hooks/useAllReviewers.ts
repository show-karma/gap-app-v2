import { useMemo } from "react";
import { useMilestoneReviewers } from "@/hooks/useMilestoneReviewers";
import { useProgramReviewers } from "@/hooks/useProgramReviewers";

/**
 * Merges milestone and program reviewers into a single deduplicated list.
 * Deduplicates by email — milestone reviewers take priority on conflict.
 */
export function useAllReviewers(programId: string) {
  const milestone = useMilestoneReviewers(programId);
  const program = useProgramReviewers(programId);

  const data = useMemo(() => {
    const milestoneData = milestone.data ?? [];
    const programData = program.data ?? [];

    const seen = new Map<string, (typeof milestoneData)[number]>();
    for (const reviewer of milestoneData) {
      seen.set(reviewer.email, reviewer);
    }
    for (const reviewer of programData) {
      if (!seen.has(reviewer.email)) {
        seen.set(reviewer.email, reviewer);
      }
    }

    return Array.from(seen.values());
  }, [milestone.data, program.data]);

  return useMemo(
    () => ({
      data,
      isLoading: milestone.isLoading || program.isLoading,
      isError: milestone.isError || program.isError,
      error: milestone.error || program.error,
      refetch: () => {
        milestone.refetch();
        program.refetch();
      },
    }),
    [data, milestone, program]
  );
}
