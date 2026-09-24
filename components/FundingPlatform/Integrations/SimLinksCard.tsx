"use client";

import { ArrowPathIcon, CpuChipIcon, LinkIcon } from "@heroicons/react/24/outline";
import pluralize from "pluralize";
import { type FC, useCallback, useMemo, useState } from "react";
import { Button } from "@/components/Utilities/Button";
import { ProfilePicture } from "@/components/Utilities/ProfilePicture";
import { Button as UiButton } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { shortAddress } from "@/utilities/shortAddress";
import { cn } from "@/utilities/tailwind";
import { type ReviewerOption, SimLinkRow, truncateMiddle } from "./SimLinkRow";
import {
  addressSchema,
  CUSTOM_ADDRESS_VALUE,
  CUSTOM_SIM_VALUE,
  simUriSchema,
} from "./sim-link.schemas";

export interface SimLinksCardProps {
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

  const [selectedSim, setSelectedSim] = useState<string>("");
  const [customSimUri, setCustomSimUri] = useState("");
  const [selectedReviewer, setSelectedReviewer] = useState<string>("");
  const [address, setAddress] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

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

  const isCustom = selectedSim === CUSTOM_SIM_VALUE || (!canManage && unlinkedSims.length === 0);

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
  const isCustomAddress =
    selectedReviewer === CUSTOM_ADDRESS_VALUE || (!isLoadingReviewers && !hasReviewerOptions);

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

  const handleAdd = async () => {
    const rawUri = isCustom ? customSimUri : selectedSim;
    const parsedUri = simUriSchema.safeParse(rawUri);
    if (!parsedUri.success) {
      setFormError(parsedUri.error.issues[0]?.message ?? "Invalid sim AT-URI");
      return;
    }
    const rawAddress = canManage
      ? isCustomAddress
        ? address
        : selectedReviewer
      : (viewerAddress ?? "");
    const parsedAddress = addressSchema.safeParse(rawAddress);
    if (!parsedAddress.success) {
      setFormError(
        canManage && !isCustomAddress && !selectedReviewer
          ? "Select a reviewer"
          : (parsedAddress.error.issues[0]?.message ?? "Invalid address")
      );
      return;
    }
    setFormError(null);
    try {
      await addSimLinkAsync({ simUri: parsedUri.data, publicAddress: parsedAddress.data });
      setSelectedSim("");
      setCustomSimUri("");
      if (canManage) {
        setAddress("");
        setSelectedReviewer("");
      }
    } catch {
      // SUPPRESSED: the mutation's onError owns the failure toast; the form
      // keeps its values so the user can correct and retry.
    }
  };

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

      {canAdd && (unlinkedSims.length > 0 || simlessReviewers.length > 0) && (
        <div className="border-t border-gray-100 bg-gray-50 px-5 py-3.5 dark:border-gray-700 dark:bg-zinc-900/40">
          {unlinkedSims.length > 0 && (
            <>
              <p className="text-xs font-medium text-gray-700 dark:text-gray-300">
                {unlinkedSims.length} council {pluralize("sim", unlinkedSims.length)}{" "}
                {unlinkedSims.length === 1 ? "isn't" : "aren't"} linked — their evaluations are
                dropped from every application.
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {unlinkedSims.map((sim) => (
                  <div
                    key={sim.simUri}
                    className="flex items-center gap-1.5 rounded-md border border-gray-200 bg-white py-1 pl-1.5 pr-1 dark:border-gray-700 dark:bg-zinc-800"
                  >
                    {sim.avatar ? (
                      <ProfilePicture
                        imageURL={sim.avatar}
                        name={sim.simName ?? sim.simUri}
                        size="18"
                        className="h-[18px] w-[18px] rounded [image-rendering:pixelated]"
                        alt=""
                      />
                    ) : (
                      <span className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded bg-gray-100 text-gray-400 dark:bg-zinc-700 dark:text-gray-500">
                        <CpuChipIcon className="h-3 w-3" />
                      </span>
                    )}
                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                      {sim.simName ?? truncateMiddle(sim.simUri, 14, 8)}
                    </span>
                    <UiButton
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        setSelectedSim(sim.simUri);
                        if (formError) setFormError(null);
                      }}
                      className="h-6 px-2 text-xs text-blue-600 shadow-none dark:text-blue-400"
                    >
                      Link
                    </UiButton>
                  </div>
                ))}
              </div>
            </>
          )}
          {canManage && simlessReviewers.length > 0 && (
            <>
              <p
                className={cn(
                  "text-xs font-medium text-gray-700 dark:text-gray-300",
                  unlinkedSims.length > 0 && "mt-3"
                )}
              >
                {simlessReviewers.length} program {pluralize("reviewer", simlessReviewers.length)}{" "}
                {simlessReviewers.length === 1 ? "has" : "have"} no sim — they can still review by
                hand, but won't appear in the council.
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {simlessReviewers.map((reviewer) => (
                  <div
                    key={reviewer.publicAddress}
                    className="flex items-center gap-1.5 rounded-md border border-gray-200 bg-white py-1 pl-2 pr-1 dark:border-gray-700 dark:bg-zinc-800"
                  >
                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                      {reviewer.name || reviewer.email}
                    </span>
                    <UiButton
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        setSelectedReviewer(reviewer.publicAddress);
                        if (formError) setFormError(null);
                      }}
                      className="h-6 px-2 text-xs shadow-none"
                    >
                      Assign sim
                    </UiButton>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {canAdd && (
        <div className="border-t border-gray-100 px-5 py-4 dark:border-gray-700">
          <p className="text-xs font-medium text-gray-700 dark:text-gray-300">Add a link</p>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            <div className="space-y-2 sm:w-64">
              {canManage ? (
                <>
                  {(hasReviewerOptions || isLoadingReviewers) && (
                    <Select
                      value={selectedReviewer}
                      onValueChange={(value) => {
                        setSelectedReviewer(value);
                        if (formError) setFormError(null);
                      }}
                      disabled={isLoadingReviewers && !hasReviewerOptions}
                    >
                      <SelectTrigger aria-label="Select a reviewer">
                        <SelectValue
                          placeholder={
                            isLoadingReviewers && !hasReviewerOptions
                              ? "Loading reviewers…"
                              : "Select a reviewer"
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {programReviewerOptions.length > 0 && (
                          <SelectGroup>
                            <SelectLabel>Program reviewers</SelectLabel>
                            {programReviewerOptions.map((reviewer) => (
                              <SelectItem
                                key={reviewer.publicAddress}
                                value={reviewer.publicAddress}
                              >
                                <span className="flex items-center gap-2">
                                  <span className="truncate">
                                    {reviewer.name || reviewer.email}
                                  </span>
                                  <span className="shrink-0 font-mono text-xs text-gray-400">
                                    {shortAddress(reviewer.publicAddress)}
                                  </span>
                                </span>
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        )}
                        {communityReviewerOptions.length > 0 && (
                          <SelectGroup>
                            <SelectLabel>Community reviewers</SelectLabel>
                            {communityReviewerOptions.map((reviewer) => (
                              <SelectItem
                                key={reviewer.publicAddress}
                                value={reviewer.publicAddress}
                              >
                                <span className="flex items-center gap-2">
                                  <span className="truncate">
                                    {reviewer.name || reviewer.email}
                                  </span>
                                  <span className="shrink-0 font-mono text-xs text-gray-400">
                                    {shortAddress(reviewer.publicAddress)}
                                  </span>
                                </span>
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        )}
                        <SelectItem value={CUSTOM_ADDRESS_VALUE}>Custom address…</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                  {isCustomAddress && (
                    <Input
                      type="text"
                      value={address}
                      onChange={(event) => {
                        setAddress(event.target.value);
                        if (formError) setFormError(null);
                      }}
                      placeholder="0x…"
                      spellCheck={false}
                      aria-label="Reviewer address"
                      className="font-mono"
                    />
                  )}
                </>
              ) : (
                <Input
                  type="text"
                  value={viewerAddress ?? ""}
                  disabled
                  placeholder="0x…"
                  spellCheck={false}
                  aria-label="Reviewer address"
                  title="Reviewers can only link sims to their own address"
                  className="font-mono"
                />
              )}
            </div>
            <div className="flex-1 space-y-2">
              {(canManage || unlinkedSims.length > 0) && (
                <Select
                  value={selectedSim}
                  onValueChange={(value) => {
                    setSelectedSim(value);
                    if (formError) setFormError(null);
                  }}
                >
                  <SelectTrigger aria-label="Select a sim">
                    <SelectValue
                      placeholder={
                        unlinkedSims.length > 0
                          ? `Select a sim — ${unlinkedSims.length} unlinked`
                          : "Select a sim — all linked"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {unlinkedSims.map((sim) => (
                      <SelectItem key={sim.simUri} value={sim.simUri}>
                        <span className="flex items-center gap-2">
                          {sim.avatar ? (
                            <ProfilePicture
                              imageURL={sim.avatar}
                              name={sim.simName ?? sim.simUri}
                              size="20"
                              className="h-5 w-5 rounded [image-rendering:pixelated]"
                              alt=""
                            />
                          ) : (
                            <CpuChipIcon className="h-4 w-4 text-gray-400" />
                          )}
                          {sim.simName ?? truncateMiddle(sim.simUri, 16, 8)}
                        </span>
                      </SelectItem>
                    ))}
                    <SelectItem value={CUSTOM_SIM_VALUE}>Custom AT-URI…</SelectItem>
                  </SelectContent>
                </Select>
              )}
              {isCustom && (
                <Input
                  type="text"
                  value={customSimUri}
                  onChange={(event) => {
                    setCustomSimUri(event.target.value);
                    if (formError) setFormError(null);
                  }}
                  placeholder="at://did:plc:…/org.simocracy.sim/…"
                  spellCheck={false}
                  aria-label="Sim AT-URI"
                  className="font-mono"
                />
              )}
            </div>
            <Button
              variant="primary"
              onClick={handleAdd}
              disabled={isAdding}
              isLoading={isAdding}
              className="shrink-0"
            >
              Add link
            </Button>
          </div>
          {formError ? (
            <p className="mt-1.5 text-xs text-red-600 dark:text-red-400" role="alert">
              {formError}
            </p>
          ) : (
            !canManage && (
              <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                As a reviewer you can only link a sim to your own connected address.
              </p>
            )
          )}
        </div>
      )}
    </div>
  );
};
