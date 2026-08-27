"use client";

import {
  ArrowPathIcon,
  ClipboardDocumentIcon,
  CpuChipIcon,
  LinkIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { type FC, memo, useMemo, useState } from "react";
import { z } from "zod";
import { DeleteDialog } from "@/components/DeleteDialog";
import { Button } from "@/components/Utilities/Button";
import { ProfilePicture } from "@/components/Utilities/ProfilePicture";
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
import { useCopyToClipboard } from "@/hooks/useCopyToClipboard";
import { useProgramReviewers } from "@/hooks/useProgramReviewers";
import type {
  SimocracyCouncilSim,
  SimocracySimLink,
} from "@/services/fundingApplicationIntegrations.service";
import { shortAddress } from "@/utilities/shortAddress";

const simUriSchema = z
  .string()
  .trim()
  .min(1, "Sim AT-URI is required")
  .max(512, "AT-URI is too long")
  .regex(/^at:\/\//, "Must be an AT-URI starting with at://");

const addressSchema = z
  .string()
  .trim()
  .regex(/^0x[0-9a-fA-F]{40}$/, "Must be a valid Ethereum address (0x…)");

const CUSTOM_SIM_VALUE = "__custom__";
const CUSTOM_ADDRESS_VALUE = "__custom__";

interface ReviewerOption {
  publicAddress: string;
  name: string;
  email: string;
}

function truncateMiddle(value: string, head = 24, tail = 12): string {
  if (value.length <= head + tail + 1) return value;
  return `${value.slice(0, head)}…${value.slice(-tail)}`;
}

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

interface SimLinkRowProps {
  link: SimocracySimLink;
  sim?: SimocracyCouncilSim;
  reviewerName?: string;
  canDelete: boolean;
  isDeleting: boolean;
  onDelete: (simUri: string) => Promise<void>;
}

const SimLinkRow: FC<SimLinkRowProps> = memo(function SimLinkRow({
  link,
  sim,
  reviewerName,
  canDelete,
  isDeleting,
  onDelete,
}) {
  const [, copy] = useCopyToClipboard();
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const name = sim?.simName ?? null;

  return (
    <li className="flex items-center gap-3 px-5 py-3">
      {sim?.avatar ? (
        <ProfilePicture
          imageURL={sim.avatar}
          name={name ?? link.simUri}
          size="28"
          className="h-7 w-7 rounded-md [image-rendering:pixelated]"
          alt=""
        />
      ) : (
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-gray-100 text-gray-500 dark:bg-zinc-700 dark:text-gray-400">
          <CpuChipIcon className="h-4 w-4" />
        </span>
      )}

      <div className="min-w-0 flex-1">
        {name && (
          <p className="truncate text-sm font-medium text-gray-900 dark:text-white">{name}</p>
        )}
        <div className="flex items-center gap-1.5">
          <span
            className="truncate font-mono text-xs text-gray-500 dark:text-gray-400"
            title={link.simUri}
          >
            {truncateMiddle(link.simUri)}
          </span>
          <button
            type="button"
            aria-label="Copy sim AT-URI"
            onClick={() => copy(link.simUri, "Sim AT-URI copied")}
            className="shrink-0 rounded p-0.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:text-gray-500 dark:hover:bg-zinc-700 dark:hover:text-gray-300"
          >
            <ClipboardDocumentIcon className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
        {reviewerName ? (
          <span className="flex items-baseline gap-1.5">
            <span className="text-sm text-gray-900 dark:text-white">{reviewerName}</span>
            <span
              className="font-mono text-xs text-gray-500 dark:text-gray-400"
              title={link.publicAddress}
            >
              {shortAddress(link.publicAddress)}
            </span>
          </span>
        ) : (
          <span
            className="font-mono text-xs text-gray-600 dark:text-gray-300"
            title={link.publicAddress}
          >
            {shortAddress(link.publicAddress)}
          </span>
        )}
        <button
          type="button"
          aria-label="Copy address"
          onClick={() => copy(link.publicAddress, "Address copied")}
          className="rounded p-0.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:text-gray-500 dark:hover:bg-zinc-700 dark:hover:text-gray-300"
        >
          <ClipboardDocumentIcon className="h-3.5 w-3.5" />
        </button>
      </div>

      {canDelete && (
        <>
          <button
            type="button"
            aria-label={`Remove link for ${name ?? link.simUri}`}
            onClick={() => setIsDeleteOpen(true)}
            disabled={isDeleting}
            className="shrink-0 rounded p-1 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40 dark:text-gray-500 dark:hover:bg-red-900/20 dark:hover:text-red-400"
          >
            <TrashIcon className="h-4 w-4" />
          </button>
          <DeleteDialog
            title={`Remove the link between ${name ?? truncateMiddle(link.simUri)} and ${shortAddress(link.publicAddress)}?`}
            deleteFunction={() => onDelete(link.simUri)}
            isLoading={isDeleting}
            buttonElement={null}
            externalIsOpen={isDeleteOpen}
            externalSetIsOpen={setIsDeleteOpen}
          />
        </>
      )}
    </li>
  );
});

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
  const { addSimLinkAsync, isAdding, deleteSimLinkAsync, isDeleting, deletingSimUri } =
    useSimocracySimLinkMutations(programId);

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

  const unlinkedSims = useMemo(() => {
    const linked = new Set((links ?? []).map((link) => link.simUri));
    return [...simsByUri.values()].filter((sim) => !linked.has(sim.simUri));
  }, [simsByUri, links]);

  const isCustom = selectedSim === CUSTOM_SIM_VALUE || unlinkedSims.length === 0;

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

  const reviewerNameByAddress = useMemo(() => {
    const map = new Map<string, string>();
    for (const reviewer of [...communityReviewerOptions, ...programReviewerOptions]) {
      if (reviewer.name) map.set(reviewer.publicAddress.toLowerCase(), reviewer.name);
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
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-zinc-800">
      <div className="px-5 pt-5">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Sim links</h2>
        <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
          Which reviewer each Sim represents. Only sims linked to a reviewer or admin are surfaced
          in evaluations.
        </p>
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
              link={link}
              sim={simsByUri.get(link.simUri)}
              reviewerName={reviewerNameByAddress.get(link.publicAddress.toLowerCase())}
              canDelete={
                canManage ||
                (isReviewer &&
                  !!normalizedViewer &&
                  link.publicAddress.toLowerCase() === normalizedViewer)
              }
              isDeleting={isDeleting && deletingSimUri === link.simUri}
              onDelete={async (simUri) => {
                await deleteSimLinkAsync(simUri);
              }}
            />
          ))}
        </ul>
      )}

      {canAdd && (
        <div className="border-t border-gray-100 px-5 py-4 dark:border-gray-700">
          <p className="text-xs font-medium text-gray-700 dark:text-gray-300">Add a link</p>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            <div className="flex-1 space-y-2">
              {unlinkedSims.length > 0 && (
                <Select
                  value={selectedSim}
                  onValueChange={(value) => {
                    setSelectedSim(value);
                    if (formError) setFormError(null);
                  }}
                >
                  <SelectTrigger aria-label="Select a sim">
                    <SelectValue placeholder="Select a sim" />
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
                <input
                  type="text"
                  value={customSimUri}
                  onChange={(event) => {
                    setCustomSimUri(event.target.value);
                    if (formError) setFormError(null);
                  }}
                  placeholder="at://did:plc:…/org.simocracy.sim/…"
                  spellCheck={false}
                  aria-label="Sim AT-URI"
                  className="block w-full rounded-md border border-gray-200 bg-white px-3 py-2 font-mono text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40 dark:border-gray-700 dark:bg-zinc-900 dark:text-gray-100 dark:placeholder:text-gray-500"
                />
              )}
            </div>
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
                    <input
                      type="text"
                      value={address}
                      onChange={(event) => {
                        setAddress(event.target.value);
                        if (formError) setFormError(null);
                      }}
                      placeholder="0x…"
                      spellCheck={false}
                      aria-label="Reviewer address"
                      className="block w-full rounded-md border border-gray-200 bg-white px-3 py-2 font-mono text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40 dark:border-gray-700 dark:bg-zinc-900 dark:text-gray-100 dark:placeholder:text-gray-500"
                    />
                  )}
                </>
              ) : (
                <input
                  type="text"
                  value={viewerAddress ?? ""}
                  disabled
                  placeholder="0x…"
                  spellCheck={false}
                  aria-label="Reviewer address"
                  title="Reviewers can only link sims to their own address"
                  className="block w-full cursor-not-allowed rounded-md border border-gray-200 bg-white px-3 py-2 font-mono text-sm text-gray-900 opacity-60 placeholder:text-gray-400 dark:border-gray-700 dark:bg-zinc-900 dark:text-gray-100 dark:placeholder:text-gray-500"
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
