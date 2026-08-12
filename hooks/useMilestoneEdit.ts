import * as Sentry from "@sentry/nextjs";
import type { IMilestone } from "@show-karma/karma-gap-sdk/core/class/entities/Milestone";
import { useState } from "react";
import toast from "react-hot-toast";
import { useAccount } from "wagmi";
import { errorManager } from "@/components/Utilities/errorManager";
import { useAttestationToast } from "@/hooks/useAttestationToast";
import { useAuth } from "@/hooks/useAuth";
import { useMixpanel } from "@/hooks/useMixpanel";
import { useProjectStore } from "@/store";
import type { UnifiedMilestone } from "@/types/v2/roadmap";
import { api } from "@/utilities/api/client";
import { createAuthenticatedApiClient } from "@/utilities/auth/api-client";
import { chainNameDictionary } from "@/utilities/chainNameDictionary";
import { envVars } from "@/utilities/enviromentVars";
import { INDEXER } from "@/utilities/indexer";
import { queryClient } from "@/utilities/query-client";
import { createProjectQueryPredicate, QUERY_KEYS } from "@/utilities/queryKeys";
import { retryUntilConditionMet } from "@/utilities/retries";
import { sanitizeObject } from "@/utilities/sanitize";
import { getProjectById } from "@/utilities/sdk";
import { useSetupChainAndWallet } from "./useSetupChainAndWallet";
import { useWallet } from "./useWallet";
import { useProjectGrants } from "./v2/useProjectGrants";

export type MilestoneEditData = Partial<
  Pick<IMilestone, "title" | "description" | "startsAt" | "endsAt" | "priority">
>;

/**
 * Progress of a single SDK `milestone.edit()` call. The SDK revokes the old
 * attestation first and re-attests second, so a failure between those two
 * transactions can leave the milestone destroyed on-chain. Once `edit()` has
 * resolved both transactions landed and later failures are not data loss.
 *
 * `revokeSubmitted` is submission-level knowledge only: the SDK's callback
 * emits "confirmed" when the revoke transaction is broadcast (it does not
 * await the receipt), so a dropped or reverted revoke is indistinguishable
 * from a mined one here. Failure handling must therefore report the
 * milestone's state as uncertain, never as definitely removed.
 */
interface EditProgress {
  step: number;
  revokeSubmitted: boolean;
  sdkEditCompleted: boolean;
  revokedMilestoneUID?: string;
  grantUID?: string;
  chainID?: number;
}

const newEditProgress = (): EditProgress => ({
  step: 0,
  revokeSubmitted: false,
  sdkEditCompleted: false,
});

const MILESTONE_GONE_MESSAGE =
  "This milestone no longer exists. Refresh the page to see the latest data.";
const EDIT_HALF_APPLIED_MESSAGE =
  "The milestone edit did not complete: the updated version may not have been saved, and the original may have been removed. Refresh the page to check whether the milestone still exists before re-creating it.";
/**
 * Captured instead of the raw failure. The trigger is almost always a wallet
 * rejection, and `sentryIgnoreErrors` drops any event whose message contains
 * "rejected the request" — including manual `captureException` calls — so
 * reporting the original error would silently lose the event. This sentinel
 * matches no entry in that list; the original error is preserved in `extra`.
 */
const EDIT_HALF_APPLIED_SENTINEL =
  "Milestone edit may be half-applied: revoke submitted, re-attest failed";
const MERGED_NOT_EDITABLE_MESSAGE =
  "This milestone can't be edited because one of the grants it is shared with has already completed or verified it. Edit that grant's milestone individually instead.";

interface UseMilestoneEditOptions {
  /** Override project UID when not on a project page (e.g. admin review page) */
  projectUid?: string;
  /** Override project slug for query invalidation */
  projectSlug?: string;
  /** Program ID for admin edits — required when using the backend on-chain edit API */
  programId?: string;
}

export const useMilestoneEdit = (options?: UseMilestoneEditOptions) => {
  const [isEditing, setIsEditing] = useState(false);
  const { chain } = useAccount();
  const { switchChainAsync } = useWallet();
  const {
    startAttestation,
    showLoading,
    showSuccess,
    showError,
    changeStepperStep,
    dismiss,
    showChainProgress,
  } = useAttestationToast();
  const storeProject = useProjectStore((state) => state.project);
  const projectUid = options?.projectUid || storeProject?.uid || "";
  const projectSlug = options?.projectSlug || storeProject?.details?.slug || "";
  const { refetch: refetchGrants } = useProjectGrants(projectUid);
  const { address: authAddress } = useAuth();
  const { mixpanel } = useMixpanel();

  const invalidateAllProjectQueries = async () => {
    const invalidations: Promise<void>[] = [];

    // Project caches are keyed by slug in some places and by UID in others
    // (`useProjectGrants` uses the UID), so both identifiers have to be swept
    // or the revoked milestone stays actionable until a hard reload.
    const projectIdentifiers = Array.from(new Set([projectSlug, projectUid].filter(Boolean)));
    for (const identifier of projectIdentifiers) {
      invalidations.push(
        queryClient.invalidateQueries({
          predicate: createProjectQueryPredicate(identifier),
        })
      );
    }

    if (options?.programId) {
      const reportKey = QUERY_KEYS.COMMUNITY.REPORT_MILESTONES("", 0, "", "", [])[0];
      const pendingKey = QUERY_KEYS.COMMUNITY.PENDING_VERIFICATION("", 0, [])[0];
      const grantMilestonesKey = QUERY_KEYS.MILESTONES.PROJECT_GRANT_MILESTONES("", "")[0];

      invalidations.push(
        queryClient.invalidateQueries({
          predicate: (query) => {
            const key = query.queryKey[0];
            return key === reportKey || key === pendingKey || key === grantMilestonesKey;
          },
        })
      );
    }

    await Promise.all(invalidations);
  };

  const { setupChainAndWallet } = useSetupChainAndWallet();

  const createEditStepCallback = (progress: EditProgress) => {
    progress.step = 0;
    progress.revokeSubmitted = false;
    progress.sdkEditCompleted = false;
    return (status: string) => {
      if (status === "preparing") {
        progress.step++;
        if (progress.step === 1) {
          changeStepperStep("Step 1/2: Revoking old milestone...");
        } else if (progress.step === 2) {
          // The SDK only starts the re-attestation once the revoke call
          // resolved — which proves submission, not that the tx was mined.
          progress.revokeSubmitted = true;
          changeStepperStep("Step 2/2: Saving updated milestone...");
        }
        return;
      }
      if (status === "confirmed" && progress.step === 1) {
        progress.revokeSubmitted = true;
        changeStepperStep("Step 1/2: Old milestone revocation submitted...");
        return;
      }
      if (status === "confirmed" && progress.step === 2) {
        changeStepperStep("Step 2/2: Updated milestone saved, awaiting confirmation...");
        return;
      }
      changeStepperStep(status);
    };
  };

  const editMilestoneViaApi = async (
    milestone: UnifiedMilestone,
    newData: MilestoneEditData,
    programId: string
  ) => {
    setIsEditing(true);
    showLoading("Editing milestone...");

    // The on-chain attester for the new+revoke attestations is the Karma
    // admin wallet, so audit of who *requested* the edit lives in analytics.
    mixpanel.reportEvent({
      event: "milestone:edit:requested",
      properties: {
        requestedBy: authAddress,
        milestoneUID: milestone.uid,
        milestoneTitle: milestone.title,
        programId,
        chainID: milestone.chainID,
      },
    });

    try {
      const apiClient = createAuthenticatedApiClient(envVars.NEXT_PUBLIC_GAP_INDEXER_URL, 60000);

      const response = await apiClient.put<{
        txHash: string;
        newMilestoneUID: string;
        revokedMilestoneUID: string;
        revocationSuccess: boolean;
      }>(INDEXER.MILESTONE.ON_CHAIN_EDIT(milestone.uid), {
        chainID: milestone.chainID,
        programId,
        ...sanitizeObject(newData),
      });

      if (!response.data.revocationSuccess) {
        toast("Milestone updated, but the old attestation could not be revoked.", {
          icon: "\u26A0\uFE0F",
          duration: 6000,
        });
        errorManager(
          "Old milestone attestation revocation failed (non-fatal)",
          new Error("revocationSuccess was false"),
          { milestoneUid: milestone.uid, newUid: response.data.newMilestoneUID }
        );
      }

      changeStepperStep("indexing");

      // Backend already re-indexes both the creation and revocation txs
      // in triggerReindexing — no need to call attestation listener again.
      await retryUntilConditionMet(
        async () => {
          const { data: fetchedGrants } = await refetchGrants();
          if (!fetchedGrants?.length) return false;
          const found = fetchedGrants
            .flatMap((g) => g.milestones || [])
            .find((m) => m.uid === response.data.newMilestoneUID);
          return !!found;
        },
        async () => {
          changeStepperStep("indexed");
        }
      );

      await invalidateAllProjectQueries();
      mixpanel.reportEvent({
        event: "milestone:edit:success",
        properties: {
          requestedBy: authAddress,
          milestoneUID: milestone.uid,
          newMilestoneUID: response.data.newMilestoneUID,
          programId,
          chainID: milestone.chainID,
          txHash: response.data.txHash,
          revocationSuccess: response.data.revocationSuccess,
        },
      });
      showSuccess("Milestone edited successfully!");
    } catch (error) {
      mixpanel.reportEvent({
        event: "milestone:edit:failed",
        properties: {
          requestedBy: authAddress,
          milestoneUID: milestone.uid,
          programId,
          chainID: milestone.chainID,
          error: error instanceof Error ? error.message : String(error),
        },
      });
      showError("There was an error editing the milestone");
      errorManager("Error editing milestone", error, {
        milestoneData: milestone,
      });
      throw error;
    } finally {
      setIsEditing(false);
      dismiss();
    }
  };

  const editMilestone = async (milestone: UnifiedMilestone, newData: MilestoneEditData) => {
    if (options?.programId) {
      return editMilestoneViaApi(milestone, newData, options.programId);
    }

    setIsEditing(true);
    startAttestation("Step 1/2: Revoking old milestone...");

    const editProgress = newEditProgress();

    try {
      const isMultiGrant = milestone.mergedGrants && milestone.mergedGrants.length > 1;

      if (isMultiGrant) {
        const milestonesByChainID = milestone.mergedGrants!.reduce(
          (acc, grant) => {
            const chainId = grant.chainID;
            if (!acc[chainId]) {
              acc[chainId] = [];
            }
            acc[chainId].push(grant.milestoneUID);
            return acc;
          },
          {} as Record<number, string[]>
        );

        const arrayOfMilestonesByChains = Object.keys(milestonesByChainID)
          .map(Number)
          .sort((a, b) => {
            if (a === chain?.id) return -1;
            if (b === chain?.id) return 1;
            return a - b;
          });

        if (!projectUid) {
          throw new Error("Missing project UID for milestone edit");
        }

        // Milestones are merged on content alone, so siblings can sit in
        // different lifecycle states. The SDK refuses to edit a completed,
        // approved or verified milestone, and it would do so only once the
        // earlier siblings had already spent their revoke+re-attest pair —
        // leaving a half-applied edit. Abort before the first transaction.
        const preflightProject = await getProjectById(projectUid);
        if (!preflightProject) {
          throw new Error("Failed to fetch project data");
        }
        const mergedUIDs = milestone.mergedGrants!.map((g) => g.milestoneUID);
        const nonEditable = preflightProject.grants
          .flatMap((grant) => grant.milestones)
          .filter((m) => mergedUIDs.includes(m.uid))
          .filter((m) => m.completed || m.approved || m.verified?.length);

        if (nonEditable.length) {
          showError(MERGED_NOT_EDITABLE_MESSAGE);
          await invalidateAllProjectQueries();
          return;
        }

        for (let i = 0; i < arrayOfMilestonesByChains.length; i++) {
          const chainId = arrayOfMilestonesByChains[i];
          const milestoneOfChain = milestonesByChainID[chainId];
          const chainName = chainNameDictionary(chainId);
          const itemCount = milestoneOfChain?.length || 1;
          showChainProgress(
            "Editing",
            chainName,
            i + 1,
            arrayOfMilestonesByChains.length,
            itemCount
          );

          const setup = await setupChainAndWallet({
            targetChainId: chainId,
            currentChainId: chain?.id,
            switchChainAsync,
          });

          if (!setup) {
            throw new Error("Failed to switch chain or connect wallet");
          }

          const { walletSigner } = setup;
          if (!projectUid) {
            throw new Error("Missing project UID for milestone edit");
          }
          const fetchedProject = await getProjectById(projectUid);
          if (!fetchedProject) {
            throw new Error("Failed to fetch project data");
          }

          const milestoneUIDs = milestoneOfChain?.map((m) => m);
          if (!milestoneUIDs?.length) {
            throw new Error("No milestones found for this chain");
          }

          const milestoneInstances = fetchedProject.grants
            .filter((grant) => grant.milestones.length > 0)
            .flatMap((grant) => grant.milestones)
            .filter((m) => milestoneUIDs.includes((m as any)?._uid || m?.uid));

          if (!milestoneInstances?.length) {
            throw new Error("Milestone instances couldn't be found for this chain");
          }

          const sanitizedData = sanitizeObject(newData);
          const editedUIDs: string[] = [];

          for (const milestoneInstance of milestoneInstances) {
            if (!("edit" in milestoneInstance) || typeof milestoneInstance.edit !== "function") {
              throw new Error("Milestone instance does not support editing");
            }
            const editCallback = createEditStepCallback(editProgress);
            editProgress.revokedMilestoneUID = milestoneInstance.uid;
            editProgress.grantUID = milestoneInstance.refUID;
            editProgress.chainID = chainId;
            const result = await milestoneInstance.edit(walletSigner, sanitizedData, editCallback);
            editProgress.sdkEditCompleted = true;

            if (result?.uids?.length) {
              editedUIDs.push(...result.uids);
            }

            changeStepperStep("indexing");
            const txHash = result?.tx?.[0]?.hash;
            if (txHash) {
              await api.post(INDEXER.ATTESTATION_LISTENER(txHash, chainId), {});
            }
          }

          await retryUntilConditionMet(
            async () => {
              const { data: fetchedGrants } = await refetchGrants();
              if (!fetchedGrants?.length) return false;
              const foundMilestones = fetchedGrants
                .flatMap((g) => g.milestones || [])
                .filter((m) => editedUIDs.includes(m.uid));
              return foundMilestones.some(
                (m) => m.title === sanitizedData.title || !sanitizedData.title
              );
            },
            async () => {
              changeStepperStep("indexed");
            }
          );
        }

        await invalidateAllProjectQueries();
        showSuccess("Milestone edited successfully!");
      } else {
        showLoading("Step 1/2: Revoking old milestone...");

        const setup = await setupChainAndWallet({
          targetChainId: milestone.chainID,
          currentChainId: chain?.id,
          switchChainAsync,
        });

        if (!setup) {
          throw new Error("Failed to switch chain or connect wallet");
        }

        const { gapClient, walletSigner } = setup;
        const fetchedProject = await gapClient.fetch.projectById(projectUid);

        if (!fetchedProject) {
          throw new Error("Failed to fetch project data");
        }

        const grantInstance = fetchedProject.grants.find(
          (g) => g.uid.toLowerCase() === milestone.refUID.toLowerCase()
        );

        if (!grantInstance) {
          throw new Error("Grant not found");
        }

        const milestoneInstance = grantInstance.milestones.find(
          (u) => u.uid.toLowerCase() === milestone.uid.toLowerCase()
        );

        // The milestone is gone from the freshly fetched project — usually a
        // stale row left behind by an earlier edit that revoked but never
        // re-attested. Not an engineering error, so it never reaches Sentry.
        if (!milestoneInstance) {
          showError(MILESTONE_GONE_MESSAGE);
          await invalidateAllProjectQueries();
          return;
        }

        const sanitizedData = sanitizeObject(newData);

        if (!("edit" in milestoneInstance) || typeof milestoneInstance.edit !== "function") {
          throw new Error("Milestone instance does not support editing");
        }

        const editCallback = createEditStepCallback(editProgress);
        editProgress.revokedMilestoneUID = milestoneInstance.uid;
        editProgress.grantUID = milestoneInstance.refUID;
        editProgress.chainID = milestone.chainID;
        const result = await milestoneInstance.edit(walletSigner, sanitizedData, editCallback);
        editProgress.sdkEditCompleted = true;

        const editedUIDs: string[] = result?.uids?.length ? [...result.uids] : [];

        changeStepperStep("indexing");

        const txHash = result?.tx?.[0]?.hash;
        if (txHash) {
          await api.post(INDEXER.ATTESTATION_LISTENER(txHash, milestone.chainID), {});
        }

        await retryUntilConditionMet(
          async () => {
            const { data: fetchedGrants } = await refetchGrants();
            if (!fetchedGrants?.length) return false;
            const foundGrant = fetchedGrants.find((g) => g.uid === milestone.refUID);
            if (!foundGrant) return false;
            const fetchedMilestone = editedUIDs.length
              ? foundGrant.milestones?.find((m) => editedUIDs.includes(m.uid))
              : foundGrant.milestones?.find(
                  (m) => m.title === (sanitizedData.title || milestone.title)
                );
            return !!fetchedMilestone;
          },
          async () => {
            changeStepperStep("indexed");
          }
        );

        await invalidateAllProjectQueries();
        showSuccess("Milestone edited successfully!");
      }
    } catch (error) {
      // Only a failure *between* the revoke and the re-attest can destroy the
      // milestone. Once `edit()` resolved both transactions landed, so a later
      // indexing or cache failure must not tell the user to re-create it.
      // The revoke signal is submission-level (the SDK never awaits the
      // receipt), so the copy and the Sentry event both report the original
      // milestone's state as uncertain rather than definitely removed.
      if (editProgress.revokeSubmitted && !editProgress.sdkEditCompleted) {
        // Reported straight to Sentry because errorManager drops anything that
        // looks like a wallet rejection, which is the common trigger here.
        showError(EDIT_HALF_APPLIED_MESSAGE);
        const originalError = error instanceof Error ? error : undefined;
        Sentry.captureException(new Error(EDIT_HALF_APPLIED_SENTINEL), {
          extra: {
            errorMessage:
              "Milestone edit failed after the revoke was submitted; re-attest did not complete. Revoke receipt was not verified, so the original milestone may or may not still exist on-chain.",
            originalErrorName: originalError?.name,
            originalErrorMessage: originalError?.message,
            originalErrorString: String(error),
            originalErrorStack: originalError?.stack,
            revokedMilestoneUID: editProgress.revokedMilestoneUID || milestone.uid,
            newMilestoneData: newData,
            grantUID: editProgress.grantUID || milestone.refUID,
            projectUID: projectUid,
            chainID: editProgress.chainID ?? milestone.chainID,
          },
        });
      } else {
        showError("There was an error editing the milestone");
        errorManager("Error editing milestone", error, {
          milestoneData: milestone,
        });
      }
      await invalidateAllProjectQueries();
      throw error;
    } finally {
      setIsEditing(false);
      dismiss();
    }
  };

  return {
    isEditing,
    editMilestone,
  };
};
