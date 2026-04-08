import type { IMilestone } from "@show-karma/karma-gap-sdk/core/class/entities/Milestone";
import { useState } from "react";
import { useAccount } from "wagmi";

import { errorManager } from "@/components/Utilities/errorManager";
import { useAttestationToast } from "@/hooks/useAttestationToast";
import { useProjectStore } from "@/store";
import type { UnifiedMilestone } from "@/types/v2/roadmap";
import { createAuthenticatedApiClient } from "@/utilities/auth/api-client";
import { chainNameDictionary } from "@/utilities/chainNameDictionary";
import { envVars } from "@/utilities/enviromentVars";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";
import { queryClient } from "@/utilities/query-client";
import { createProjectQueryPredicate } from "@/utilities/queryKeys";
import { retryUntilConditionMet } from "@/utilities/retries";
import { sanitizeObject } from "@/utilities/sanitize";
import { getProjectById } from "@/utilities/sdk";
import { useSetupChainAndWallet } from "./useSetupChainAndWallet";
import { useWallet } from "./useWallet";
import { useProjectGrants } from "./v2/useProjectGrants";

export type MilestoneEditData = Partial<
  Pick<IMilestone, "title" | "description" | "endsAt" | "startsAt" | "priority">
>;

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

  const invalidateAllProjectQueries = async () => {
    // refetchGrants invalidates by UID; also invalidate by slug
    // so the Updates tab (which uses slug from URL) gets fresh data
    if (projectSlug) {
      await queryClient.invalidateQueries({
        predicate: createProjectQueryPredicate(projectSlug),
      });
    }
  };

  const { setupChainAndWallet } = useSetupChainAndWallet();

  const editStepCallbackRef = { current: 0 };

  const createEditStepCallback = () => {
    editStepCallbackRef.current = 0;
    return (status: string) => {
      if (status === "preparing") {
        editStepCallbackRef.current++;
        const step = editStepCallbackRef.current;
        if (step === 1) {
          changeStepperStep("Step 1/2: Creating updated milestone...");
        } else if (step === 2) {
          changeStepperStep("Step 2/2: Revoking old milestone...");
        }
        return;
      }
      if (status === "confirmed" && editStepCallbackRef.current === 1) {
        changeStepperStep("Step 1/2: Milestone created, awaiting confirmation...");
        return;
      }
      if (status === "confirmed" && editStepCallbackRef.current === 2) {
        changeStepperStep("Step 2/2: Revoking old milestone...");
        return;
      }
      changeStepperStep(status);
    };
  };

  const editMilestoneViaApi = async (milestone: UnifiedMilestone, newData: MilestoneEditData) => {
    setIsEditing(true);
    showLoading("Editing milestone...");

    try {
      const apiClient = createAuthenticatedApiClient(envVars.NEXT_PUBLIC_GAP_INDEXER_URL, 60000);

      const response = await apiClient.put<{
        txHash: string;
        newMilestoneUID: string;
        revokedMilestoneUID: string;
        revocationSuccess: boolean;
      }>(INDEXER.MILESTONE.ON_CHAIN_EDIT(milestone.uid), {
        chainID: milestone.chainID,
        programId: options!.programId,
        ...sanitizeObject(newData),
      });

      if (!response.data.revocationSuccess) {
        throw new Error(
          "Milestone was re-attested, but the previous attestation could not be revoked"
        );
      }

      changeStepperStep("indexing");

      if (response.data.txHash) {
        await fetchData(
          INDEXER.ATTESTATION_LISTENER(response.data.txHash, milestone.chainID),
          "POST",
          {}
        );
      }

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
      showSuccess("Milestone edited successfully!");
    } catch (error) {
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
      return editMilestoneViaApi(milestone, newData);
    }

    setIsEditing(true);
    startAttestation("Step 1/2: Creating updated milestone...");

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
            const editCallback = createEditStepCallback();
            const result = await milestoneInstance.edit(walletSigner, sanitizedData, editCallback);

            if (result?.uids?.length) {
              editedUIDs.push(...result.uids);
            }

            changeStepperStep("indexing");
            const txHash = result?.tx?.[0]?.hash;
            if (txHash) {
              await fetchData(INDEXER.ATTESTATION_LISTENER(txHash, chainId), "POST", {});
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
        showLoading("Step 1/2: Creating updated milestone...");

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

        if (!milestoneInstance) {
          throw new Error("Milestone not found");
        }

        const sanitizedData = sanitizeObject(newData);

        if (!("edit" in milestoneInstance) || typeof milestoneInstance.edit !== "function") {
          throw new Error("Milestone instance does not support editing");
        }

        const editCallback = createEditStepCallback();
        const result = await milestoneInstance.edit(walletSigner, sanitizedData, editCallback);

        const editedUIDs: string[] = result?.uids?.length ? [...result.uids] : [];

        changeStepperStep("indexing");

        const txHash = result?.tx?.[0]?.hash;
        if (txHash) {
          await fetchData(INDEXER.ATTESTATION_LISTENER(txHash, milestone.chainID), "POST", {});
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

  return {
    isEditing,
    editMilestone,
  };
};
