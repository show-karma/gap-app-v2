"use client";

import { ArrowPathIcon, LinkIcon } from "@heroicons/react/24/outline";
import { type FC, useCallback, useMemo } from "react";
import { Button } from "@/components/Utilities/Button";
import {
  useSimocracyCouncil,
  useSimocracyProgramSummary,
  useSimocracySimLinkMutations,
  useSimocracySimLinks,
} from "@/hooks/useApplicationIntegrations";
import { useCommunityReviewers } from "@/hooks/useCommunityReviewers";
import { useProgramConfig } from "@/hooks/useFundingPlatform";
import { useProgramReviewers } from "@/hooks/useProgramReviewers";
import type { SimocracyCouncilSim } from "@/services/fundingApplicationIntegrations.service";
import { cn } from "@/utilities/tailwind";
import { SimLinkForm } from "./SimLinkForm";
import { SimLinkRow } from "./SimLinkRow";
import type { ReviewerOption } from "./sim-link.shared";

interface SimLinksCardProps {
  programId: string;
  /** PROGRAM_EDIT — full management of every link. */
  canManage: boolean;
  /** Reviewers without PROGRAM_EDIT may only manage a link for their own address. */
  isReviewer: boolean;
  viewerAddress?: string;
  /** Enables the reviewer picker (program + community reviewer lists) for admins. */
  communityUID?: string;
}

const LinksSkeleton: FC = () => (
  <div
    className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-zinc-800 p-5 space-y-3 animate-pulse"
    data-testid="sim-links-loading"
  >
    <div className="h-5 w-40 rounded bg-gray-200 dark:bg-zinc-700" />
    {[0, 1, 2].map((row) => (
      <div key={row} className="h-9 w-full rounded bg-gray-100 dark:bg-zinc-700" />
    ))}
  </div>
);

export const SimLinksCard: FC<SimLinksCardProps> = ({
  programId,
  canManage,
  isReviewer,
  viewerAddress,
  communityUID,
}) => {
  const {
    data: links,
    isLoading: isLoadingLinks,
    isError: isLinksError,
    error: linksError,
    refetch: refetchLinks,
  } = useSimocracySimLinks(programId);
  const { data: summary } = useSimocracyProgramSummary(programId);
  const { data: council } = useSimocracyCouncil(programId, { enabled: canManage });
  const { data: programConfig } = useProgramConfig(programId);
  const integrationDisabled =
    programConfig?.applicationConfig?.integrations?.simocracy?.enabled === false;
  const { addSimLinkAsync, isAdding, deleteSimLinkAsync, isDeleting, deletingSimUri } =
    useSimocracySimLinkMutations(programId);
  // Stable reference so SimLinkRow's React.memo isn't defeated by a new closure
  // on every render of the list.
  const handleDeleteSimLink = useCallback(
    async (simUri: string) => {
      await deleteSimLinkAsync(simUri);
    },
    [deleteSimLinkAsync]
  );

  const canAdd = canManage || isReviewer;
  const normalizedViewer = viewerAddress?.toLowerCase();

  const { data: programReviewers, isLoading: isLoadingProgramReviewers } = useProgramReviewers(
    canManage ? programId : ""
  );
  const { items: communityReviewers, isLoading: isLoadingCommunityReviewers } =
    useCommunityReviewers({
      communityUID: communityUID ?? "",
      enabled: canManage && !!communityUID,
    });

  const simsByUri = useMemo(() => {
    const map = new Map<string, SimocracyCouncilSim>();
    for (const sim of summary?.sims ?? []) {
      map.set(sim.simUri, {
        simUri: sim.simUri,
        simName: sim.simName,
        avatar: sim.avatar,
        ownerDid: "",
      });
    }
    for (const sim of council ?? []) {
      map.set(sim.simUri, sim);
    }
    return map;
  }, [summary?.sims, council]);

  const linkedUris = useMemo(() => new Set((links ?? []).map((link) => link.simUri)), [links]);

  const unlinkedSims = useMemo(
    () => [...simsByUri.values()].filter((sim) => !linkedUris.has(sim.simUri)),
    [simsByUri, linkedUris]
  );

  const linkedCouncilCount = (council ?? []).filter((sim) => linkedUris.has(sim.simUri)).length;

  const programReviewerOptions = useMemo<ReviewerOption[]>(
    () =>
      (programReviewers ?? [])
        .filter(
          (reviewer): reviewer is typeof reviewer & { publicAddress: string } =>
            !!reviewer.publicAddress
        )
        .map((reviewer) => ({
          publicAddress: reviewer.publicAddress,
          name: reviewer.name,
          email: reviewer.email,
        })),
    [programReviewers]
  );

  const communityReviewerOptions = useMemo<ReviewerOption[]>(() => {
    const inProgram = new Set(
      programReviewerOptions.map((reviewer) => reviewer.publicAddress.toLowerCase())
    );
    const seen = new Set<string>();
    const options: ReviewerOption[] = [];
    for (const reviewer of communityReviewers ?? []) {
      const key = reviewer.publicAddress.toLowerCase();
      if (inProgram.has(key) || seen.has(key)) continue;
      seen.add(key);
      options.push({
        publicAddress: reviewer.publicAddress,
        name: reviewer.name,
        email: reviewer.email,
      });
    }
    return options;
  }, [communityReviewers, programReviewerOptions]);

  const linkedAddresses = useMemo(
    () => new Set((links ?? []).map((link) => link.publicAddress.toLowerCase())),
    [links]
  );
  const simlessReviewers = useMemo(
    () =>
      programReviewerOptions.filter(
        (reviewer) => !linkedAddresses.has(reviewer.publicAddress.toLowerCase())
      ),
    [programReviewerOptions, linkedAddresses]
  );

  const reviewerByAddress = useMemo(() => {
    const map = new Map<string, ReviewerOption>();
    for (const reviewer of [...communityReviewerOptions, ...programReviewerOptions]) {
      map.set(reviewer.publicAddress.toLowerCase(), reviewer);
    }
    return map;
  }, [programReviewerOptions, communityReviewerOptions]);

  const hasReviewerOptions =
    programReviewerOptions.length > 0 || communityReviewerOptions.length > 0;
  const isLoadingReviewers = isLoadingProgramReviewers || isLoadingCommunityReviewers;

  if (isLoadingLinks) {
    return <LinksSkeleton />;
  }

  if (isLinksError) {
    return (
      <div className="rounded-lg border border-red-200 dark:border-red-800/50 bg-red-50 dark:bg-red-900/10 p-6 text-center">
        <p className="text-sm text-red-700 dark:text-red-400">
          {linksError instanceof Error ? linksError.message : "Failed to load sim links."}
        </p>
        <Button onClick={() => refetchLinks()} className="mt-4 inline-flex items-center gap-2">
          <ArrowPathIcon className="h-4 w-4" />
          Retry
        </Button>
      </div>
    );
  }

  const rows = links ?? [];

  return (
    <div
      className={cn(
        "rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-zinc-800 transition-opacity",
        integrationDisabled && "opacity-50"
      )}
    >
      <div className="flex items-start justify-between gap-4 px-5 pt-5">
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
            Link reviewer to Sim
          </h2>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
            Only sims linked to a reviewer or admin are surfaced in evaluations.
          </p>
        </div>
        {(council?.length ?? 0) > 0 && (
          <div className="flex shrink-0 items-center gap-2 pt-0.5">
            <div aria-hidden="true" className="flex max-w-40 flex-wrap gap-0.5">
              {(council ?? []).map((sim) => (
                <span
                  key={sim.simUri}
                  className={cn(
                    "h-1 w-3 rounded-full",
                    linkedUris.has(sim.simUri)
                      ? "bg-blue-600 dark:bg-blue-400"
                      : "bg-gray-200 dark:bg-zinc-700"
                  )}
                />
              ))}
            </div>
            <span className="whitespace-nowrap text-xs text-gray-500 dark:text-gray-400">
              {linkedCouncilCount} of {council?.length} linked
            </span>
          </div>
        )}
      </div>

      {rows.length === 0 ? (
        <div className="px-5 py-8 text-center">
          <LinkIcon className="mx-auto h-8 w-8 text-gray-400 dark:text-gray-500" />
          <h3 className="mt-3 text-sm font-semibold text-gray-900 dark:text-white">
            No sims linked yet
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {canAdd
              ? "Link a sim to a reviewer address below to surface its evaluations."
              : "Sim links will appear here once an administrator adds them."}
          </p>
        </div>
      ) : (
        <ul className="mt-4 divide-y divide-gray-100 border-t border-gray-100 dark:divide-gray-700 dark:border-gray-700">
          {rows.map((link) => (
            <SimLinkRow
              key={link.simUri}
              programId={programId}
              link={link}
              sim={simsByUri.get(link.simUri)}
              reviewer={reviewerByAddress.get(link.publicAddress.toLowerCase())}
              canDelete={
                canManage ||
                (isReviewer &&
                  !!normalizedViewer &&
                  link.publicAddress.toLowerCase() === normalizedViewer)
              }
              isDeleting={isDeleting && deletingSimUri === link.simUri}
              onDelete={handleDeleteSimLink}
            />
          ))}
        </ul>
      )}

      {canAdd && (
        <SimLinkForm
          canManage={canManage}
          viewerAddress={viewerAddress}
          unlinkedSims={unlinkedSims}
          simlessReviewers={simlessReviewers}
          programReviewerOptions={programReviewerOptions}
          communityReviewerOptions={communityReviewerOptions}
          hasReviewerOptions={hasReviewerOptions}
          isLoadingReviewers={isLoadingReviewers}
          addSimLinkAsync={addSimLinkAsync}
          isAdding={isAdding}
        />
      )}
    </div>
  );
};
