"use client";
import { Milestone } from "@show-karma/karma-gap-sdk";
import { GapContract } from "@show-karma/karma-gap-sdk/core/class/contract/GapContract";
import { ProjectMilestone } from "@show-karma/karma-gap-sdk/core/class/entities/ProjectMilestone";
import type { Transaction } from "ethers";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Controller, type SubmitHandler, useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { useAccount } from "wagmi";
import { ProjectObjectiveForm } from "@/components/Forms/ProjectObjective";
import { Button } from "@/components/Utilities/Button";
import { DatePicker } from "@/components/Utilities/DatePicker";
import { MarkdownEditor } from "@/components/Utilities/MarkdownEditor";
import { AttestationSubmit } from "@/components/ui/AttestationSubmit";
import { useAttestation } from "@/hooks/useAttestation";
import { useAttestationToast } from "@/hooks/useAttestationToast";
import { useAuth } from "@/hooks/useAuth";
import { useSetupChainAndWallet } from "@/hooks/useSetupChainAndWallet";
import { useWallet } from "@/hooks/useWallet";
import { useProjectGrants } from "@/hooks/v2/useProjectGrants";
import { useProjectUpdates } from "@/hooks/v2/useProjectUpdates";
import { useProjectStore } from "@/store";
import { useProgressModalStore } from "@/store/modals/progress";
import type { Grant } from "@/types/v2/grant";
import { chainNameDictionary } from "@/utilities/chainNameDictionary";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";
import { PAGES } from "@/utilities/pages";
import { sanitizeInput, sanitizeObject } from "@/utilities/sanitize";
import { zodResolver } from "@/utilities/zodResolver";
import { MultiSelect } from "../../../components/Utilities/MultiSelect";
import { type MilestoneFormData, milestoneSchema } from "./milestoneSchema";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const UnifiedMilestoneScreen = () => {
  const project = useProjectStore((state) => state.project);
  const { closeProgressModal, preSelectedGrantId, setPreSelectedGrantId } = useProgressModalStore();
  const [selectedGrantIds, setSelectedGrantIds] = useState<string[]>([]);
  const [hasInitializedSelection, setHasInitializedSelection] = useState(false);

  // Fetch grants using dedicated hook
  const { grants, refetch: refetchGrants } = useProjectGrants(project?.uid || "");

  // Pre-select grant if provided via store (e.g., from "Add a new milestone" button on milestones page)
  useEffect(() => {
    if (preSelectedGrantId && grants.length > 0 && !hasInitializedSelection) {
      // Check if the pre-selected grant exists in the available grants
      const grantExists = grants.some((g) => g.uid === preSelectedGrantId);
      if (grantExists) {
        setSelectedGrantIds([preSelectedGrantId]);
      }
      setHasInitializedSelection(true);
      // Clear the pre-selected grant ID from the store to avoid re-applying on subsequent opens
      setPreSelectedGrantId(null);
    }
  }, [preSelectedGrantId, grants, hasInitializedSelection, setPreSelectedGrantId]);
  // wagmi address is DISPLAY/recipient-only — never gate signing on it (#1821).
  // The signing identity comes from useSetupChainAndWallet (Privy signer).
  const { address, chain } = useAccount();
  const { switchChainAsync } = useWallet();
  const { setupChainAndWallet, smartWalletAddress } = useSetupChainAndWallet();
  const { connectWallet } = useAuth();
  const { startAttestation, showSuccess, showError, dismiss, changeStepperStep } =
    useAttestationToast();
  const { projectId } = useParams();
  const { refetch: refetchUpdates } = useProjectUpdates(projectId as string);
  const router = useRouter();

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isValid },
    watch,
  } = useForm<MilestoneFormData>({
    resolver: zodResolver(milestoneSchema),
    mode: "onChange",
    defaultValues: {
      title: "",
      description: "",
      priority: undefined,
    },
  });

  const grantOptions = grants.map((grant) => ({
    value: grant.uid,
    label: `${grant.details?.title || "Untitled Grant"}`,
    chainId: grant.chainID,
  }));

  const handleGrantSelectionChange = (selectedIds: string[]) => {
    setSelectedGrantIds(selectedIds);
  };

  // Create a roadmap milestone. Readiness is gated upstream by useAttestation;
  // thrown errors route to useAttestation.onError (errorManager + toast).
  const createRoadmapMilestone = async (data: MilestoneFormData) => {
    if (!project) return;
    startAttestation("Creating roadmap milestone...");

    const setup = await setupChainAndWallet({
      targetChainId: project.chainID,
      currentChainId: chain?.id,
      switchChainAsync,
    });

    if (!setup?.gapClient) {
      dismiss();
      showError("Couldn't prepare your wallet for this network. Please try again.");
      return;
    }

    {
      const { gapClient, walletSigner } = setup;

      const newObjective = new ProjectMilestone({
        data: sanitizeObject({
          title: data.title,
          text: data.description,
          type: "project-milestone",
        }),
        schema: gapClient.findSchema("ProjectMilestone"),
        refUID: project.uid,
        recipient: ((smartWalletAddress || address) as `0x${string}`) || "0x00",
      });
      const sanitizedData = {
        title: sanitizeInput(data.title),
        text: sanitizeInput(data.description),
      };

      await newObjective
        .attest(walletSigner as any, sanitizedData, changeStepperStep)
        .then(async (res) => {
          const txHash = res?.tx[0]?.hash;
          if (txHash) {
            await fetchData(INDEXER.ATTESTATION_LISTENER(txHash, project.chainID), "POST", {});
          } else {
            await fetchData(
              INDEXER.ATTESTATION_LISTENER(newObjective.uid, project.chainID),
              "POST",
              {}
            );
          }

          changeStepperStep("indexing");

          // Poll until milestone is indexed
          const indexed = await pollForRoadmapMilestone(newObjective.uid);

          if (indexed) {
            changeStepperStep("indexed");
            showSuccess("Roadmap milestone created!");
          } else {
            // Fallback: show success anyway but warn that it may take longer
            showSuccess("Milestone created! It may take a moment to appear.");
          }

          setTimeout(() => {
            dismiss();
            closeProgressModal();
          }, 1500);
        });
    }
  };

  // Poll until roadmap milestone (project objective) is indexed
  const pollForRoadmapMilestone = async (
    objectiveUid: string,
    maxRetries = 30,
    delayMs = 1500
  ): Promise<boolean> => {
    for (let i = 0; i < maxRetries; i++) {
      const { data: updatesResponse } = await refetchUpdates();

      // Check if the objective exists in project milestones
      const found = updatesResponse?.projectMilestones?.some(
        (milestone) => milestone.uid === objectiveUid
      );

      if (found) {
        await refetchGrants();
        return true;
      }

      await sleep(delayMs);
    }
    return false;
  };

  // Create grant milestone(s). Readiness gated upstream by useAttestation; we
  // track whether anything attested so a zero-attestation run never shows a
  // success toast (#1821 false-success).
  const createGrantMilestones = async (data: MilestoneFormData) => {
    if (!project || selectedGrantIds.length === 0) return;

    startAttestation("Creating grant milestone(s)...");

    const toastsToRemove: string[] = [];
    const failedChains: string[] = [];
    let anyAttested = false;

    try {
      // Group grants by chain ID to process each network separately
      const grantsByChain: Record<number, { grant: Grant; index: number }[]> = {};

      // Build the groups by chain
      selectedGrantIds.forEach((grantId, index) => {
        const grant = grants.find((g) => g.uid === grantId);
        if (!grant) return;

        if (!grantsByChain[grant.chainID]) {
          grantsByChain[grant.chainID] = [];
        }

        grantsByChain[grant.chainID].push({ grant, index });
      });

      // Sort chain IDs to prioritize the user's current chain
      const sortedChainIds = Object.keys(grantsByChain).sort((a, b) => {
        const aId = Number(a);
        const bId = Number(b);

        // If user is on chain A, prioritize A
        if (chain?.id === aId) return -1;
        // If user is on chain B, prioritize B
        if (chain?.id === bId) return 1;
        // Otherwise, just sort numerically as fallback
        return aId - bId;
      });

      // Process each chain group in the prioritized order
      for (const chainIdStr of sortedChainIds) {
        const chainId = Number(chainIdStr);
        const chainGrants = grantsByChain[chainId];
        const chainName = chainNameDictionary(chainId);

        // Notify user we're processing grants on this chain
        toast.loading(`Creating milestone`, {
          id: `chain-${chainId}`,
        });
        toastsToRemove.push(`chain-${chainId}`);

        // Switch chain if needed
        const setup = await setupChainAndWallet({
          targetChainId: chainId,
          currentChainId: chain?.id,
          switchChainAsync,
        });

        if (!setup?.gapClient) {
          // Don't silently skip — record the failure and clear this chain's
          // loading toast. A durable partial-failure notice is surfaced after
          // the loop; we must NOT rely on a per-chain toast here because the
          // `finally` sweep would remove it, masking the failure behind the
          // success toast when other chains succeed (#1821).
          toast.remove(`chain-${chainId}`);
          failedChains.push(chainName);
          continue;
        }

        const { gapClient, walletSigner } = setup;

        // If there's only one grant on this chain, process it normally
        if (chainGrants.length === 1) {
          const { grant } = chainGrants[0];

          const milestone = sanitizeObject({
            title: data.title,
            description: data.description,
            endsAt: data.dates?.endsAt ? data.dates.endsAt.getTime() / 1000 : undefined,
            startsAt: data.dates?.startsAt ? data.dates.startsAt.getTime() / 1000 : undefined,
            priority:
              data.priority !== undefined && data.priority !== null ? data.priority : undefined,
          });

          const milestoneToAttest = new Milestone({
            refUID: grant.uid as `0x${string}`,
            schema: gapClient.findSchema("Milestone"),
            recipient: (smartWalletAddress || address) as `0x${string}`,
            data: milestone,
          });

          const result = await milestoneToAttest.attest(walletSigner as any, changeStepperStep);
          anyAttested = true;

          // Handle indexer notification
          const txHash = result?.tx[0]?.hash;
          if (txHash) {
            await fetchData(
              INDEXER.ATTESTATION_LISTENER(txHash, milestoneToAttest.chainID),
              "POST",
              {}
            );
          }
        } else {
          // Multiple grants on the same chain - use attestToMultipleGrants
          // Get the first grant as reference
          const firstGrant = chainGrants[0].grant;

          const milestone = sanitizeObject({
            title: data.title,
            description: data.description,
            endsAt: data.dates?.endsAt ? data.dates.endsAt.getTime() / 1000 : undefined,
            startsAt: data.dates?.startsAt ? data.dates.startsAt.getTime() / 1000 : undefined,
            priority:
              data.priority !== undefined && data.priority !== null ? data.priority : undefined,
          });

          const milestoneToAttest = new Milestone({
            // We'll use the first grant as reference, but it will be attested to all selected grants
            refUID: firstGrant.uid as `0x${string}`,
            schema: gapClient.findSchema("Milestone"),
            recipient: (smartWalletAddress || address) as `0x${string}`,
            data: milestone,
          });

          // Instead of using indices, directly use grant UIDs
          const grantUIDs = chainGrants.map((item) => item.grant.uid as `0x${string}`);

          // Create separate milestone objects for each grant
          const allPayloads: any[] = [];

          for (const grantUID of grantUIDs) {
            // Create a new milestone for each grant with direct reference
            const grantMilestone = new Milestone({
              schema: milestoneToAttest.schema,
              recipient: milestoneToAttest.recipient,
              data: milestoneToAttest.data,
              refUID: grantUID, // Direct reference to the grant UID
            });

            // Generate payload for this grant
            const payload = await grantMilestone.multiAttestPayload();
            // Add each item from payload to allPayloads
            payload.forEach((item) => {
              allPayloads.push(item);
            });
          }

          // Use the GapContract to submit all attestations in a single transaction
          const result = await GapContract.multiAttest(
            walletSigner as any,
            allPayloads.map((p) => p[1])
          );
          anyAttested = true;

          // Handle indexer notification for each tx
          if (result.tx.length > 0) {
            const txPromises = result.tx.map((tx: Transaction) =>
              tx.hash
                ? fetchData(
                    INDEXER.ATTESTATION_LISTENER(tx.hash as `0x${string}`, chainId),
                    "POST",
                    {}
                  )
                : Promise.resolve()
            );
            await Promise.all(txPromises);
          }
        }
      }

      // Nothing attested across any chain — surface guidance, never a false
      // "Milestones created!" success (#1821 sibling bug).
      if (!anyAttested) {
        dismiss();
        showError("No milestone was created — your wallet wasn't ready. Please try again.");
        return;
      }

      changeStepperStep("indexing");

      // Poll until at least one milestone is indexed (indicates indexing is working)
      let indexed = false;
      for (let i = 0; i < 30; i++) {
        const { data: updatedGrants } = await refetchGrants();

        // Check if any of the selected grants now have a milestone with the title we just created
        const foundNewMilestone = updatedGrants?.some((grant) => {
          if (!selectedGrantIds.includes(grant.uid)) return false;
          return grant.milestones?.some((m) => m.title === data.title);
        });

        if (foundNewMilestone) {
          indexed = true;
          break;
        }

        await sleep(1500);
      }

      await refetchUpdates();

      // Partial success — surface a DURABLE notice so the success toast below
      // doesn't mask chains that failed to prepare (#1821).
      if (failedChains.length > 0) {
        toast.error(
          `Couldn't prepare ${failedChains.join(", ")} — no milestone was created there. Please try again.`,
          { duration: 8000 }
        );
      }

      if (indexed) {
        changeStepperStep("indexed");
        showSuccess("Milestones created!");
      } else {
        showSuccess("Milestones created! They may take a moment to appear.");
      }

      setTimeout(() => {
        dismiss();
        router.push(PAGES.PROJECT.OVERVIEW(project?.details?.slug || project?.uid || ""));
        closeProgressModal();
      }, 1500);
    } finally {
      // Always clear the per-chain progress toasts (success, early return, throw).
      toastsToRemove.forEach((toastId) => {
        toast.remove(toastId);
      });
    }
  };

  // Single attestation mutation (CLAUDE.md "always useMutation"): gates submit on
  // signerStatus, throws a typed SignerUnavailableError when the wallet isn't
  // ready, and routes feedback centrally — killing the silent no-op (#1821).
  const {
    mutate: submitMilestone,
    isPending,
    signerStatus,
  } = useAttestation<MilestoneFormData, void>({
    attest: async (data) => {
      if (selectedGrantIds.length === 0) {
        await createRoadmapMilestone(data);
      } else {
        await createGrantMilestones(data);
      }
    },
    action: "create milestone",
    // Dismiss the in-flight attestation toast before surfacing the error.
    showError: (message) => {
      dismiss();
      showError(message);
    },
  });

  const onSubmit: SubmitHandler<MilestoneFormData> = (data) => {
    // For grant milestones, validate that endsAt is provided
    if (selectedGrantIds.length > 0 && !data.dates?.endsAt) {
      showError("End date is required for grant milestones");
      return;
    }

    // Validate dates relationship if both exist
    if (data.dates?.startsAt && data.dates?.endsAt) {
      if (data.dates.startsAt > data.dates.endsAt) {
        showError("Start date must be before the end date");
        return;
      }
    }

    submitMilestone(data);
  };

  // If no grants exist - simpler UI for roadmap milestones only
  if (!grants.length && project) {
    return (
      <div className="flex flex-col gap-6">
        <ProjectObjectiveForm
          stateHandler={(state) => {
            if (!state) closeProgressModal();
          }}
        />
      </div>
    );
  }

  // Group grants by chain for better display
  const grantsByChain = selectedGrantIds.reduce(
    (acc, grantId) => {
      const grant = grants.find((g) => g.uid === grantId);
      if (!grant) return acc;

      const chainId = grant.chainID;
      if (!acc[chainId]) {
        acc[chainId] = {
          chainId,
          chainName: chainNameDictionary(chainId),
          grants: [],
        };
      }

      acc[chainId].grants.push(grant);
      return acc;
    },
    {} as Record<number, { chainId: number; chainName: string; grants: Grant[] }>
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4">
        <div className="text-sm font-bold text-black dark:text-zinc-100">
          Select Grant(s) (Optional)
        </div>

        <MultiSelect
          options={grantOptions}
          onChange={handleGrantSelectionChange}
          value={selectedGrantIds}
          placeholder="Search and select grants..."
        />
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        {/* Title Field - For Both Types */}
        <div className="flex flex-col gap-2">
          <label
            htmlFor="milestone-title"
            className="text-sm font-bold text-black dark:text-zinc-100"
          >
            Title *
          </label>
          <input
            id="milestone-title"
            className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-gray-900 placeholder:text-gray-300 dark:bg-zinc-800 dark:border-zinc-700 dark:text-white"
            placeholder="Milestone title"
            {...register("title")}
          />
          {errors.title && <p className="text-red-500 text-sm">{errors.title.message}</p>}
        </div>

        {/* Description Field - For Both Types */}
        <div className="flex flex-col gap-2">
          <div className="text-sm font-bold text-black dark:text-zinc-100">Description *</div>
          <Controller
            name="description"
            control={control}
            render={({ field }) => (
              <MarkdownEditor
                value={field.value || ""}
                onChange={(value: string) => field.onChange(value)}
                placeholderText="Describe this milestone..."
              />
            )}
          />
          {errors.description && (
            <p className="text-red-500 text-sm">{errors.description.message}</p>
          )}
        </div>

        {/* Grant-specific Fields - Only Show If Grants Selected */}
        {selectedGrantIds.length > 0 && (
          <>
            <div className="flex flex-col gap-2">
              <label
                htmlFor="milestone-priority"
                className="text-sm font-bold text-black dark:text-zinc-100"
              >
                Priority (Optional)
              </label>
              <select
                id="milestone-priority"
                className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-gray-900 placeholder:text-gray-300 dark:bg-zinc-800 dark:border-zinc-700 dark:text-white"
                {...register("priority", {
                  // The "Select priority" placeholder is value 0 — map it to
                  // undefined so re-selecting it clears the priority instead
                  // of attesting an out-of-range priority 0
                  setValueAs: (value) => {
                    const parsed = parseInt(value, 10);
                    return Number.isNaN(parsed) || parsed === 0 ? undefined : parsed;
                  },
                  required: false,
                })}
              >
                <option value={0}>Select priority</option>
                {[1, 2, 3, 4, 5].map((priority) => (
                  <option key={priority} value={priority}>
                    {priority}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-row gap-8">
              <div className="flex flex-col gap-2">
                <div className="text-sm font-bold text-black dark:text-zinc-100">
                  Start Date (Optional)
                </div>
                <Controller
                  control={control}
                  name="dates.startsAt"
                  render={({ field }) => (
                    <DatePicker
                      selected={field.value}
                      onSelect={(date: Date) => {
                        field.onChange(date);
                      }}
                      maxDate={watch("dates.endsAt")}
                      placeholder="Select start date"
                      className="w-full"
                    />
                  )}
                />
              </div>
              <div className="flex flex-col gap-2">
                <div className="text-sm font-bold text-black dark:text-zinc-100">End Date *</div>
                <Controller
                  control={control}
                  name="dates.endsAt"
                  render={({ field }) => (
                    <DatePicker
                      selected={field.value}
                      onSelect={(date: Date) => {
                        field.onChange(date);
                      }}
                      minDate={watch("dates.startsAt") || new Date()}
                      placeholder="Select end date"
                      className="w-full"
                    />
                  )}
                />
                {errors.dates?.endsAt && (
                  <p className="text-red-500 text-sm">{errors.dates?.endsAt.message}</p>
                )}
              </div>
            </div>
          </>
        )}

        {/* Display warning if grants are on multiple chains */}
        {selectedGrantIds.length > 0 && Object.keys(grantsByChain).length > 1 && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
            <p className="text-sm text-yellow-700 dark:text-yellow-300">
              You are creating milestones across multiple chains. You will need to approve
              transactions for each chain separately.
            </p>
          </div>
        )}

        <div className="flex flex-row gap-2 justify-end mt-4">
          <Button
            type="button"
            onClick={closeProgressModal}
            className="px-4 py-2 border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:bg-zinc-800 dark:border-zinc-600 dark:text-white"
          >
            Cancel
          </Button>
          <AttestationSubmit
            signerStatus={signerStatus}
            disabled={!isValid}
            isLoading={isPending}
            onConnectWallet={connectWallet}
            label="Create Milestone"
            className="px-4 py-2 rounded-md bg-brand-blue text-white hover:bg-brand-blue/90 disabled:opacity-50 flex flex-row items-center justify-center gap-2 font-medium"
          />
        </div>
      </form>
    </div>
  );
};
