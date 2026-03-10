import type { IMilestone } from "@show-karma/karma-gap-sdk/core/class/entities/Milestone";
import { useState } from "react";
import { useAccount } from "wagmi";

import { errorManager } from "@/components/Utilities/errorManager";
import { useAttestationToast } from "@/hooks/useAttestationToast";
import { useProjectStore } from "@/store";
import type { UnifiedMilestone } from "@/types/v2/roadmap";
import { chainNameDictionary } from "@/utilities/chainNameDictionary";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";
import { retryUntilConditionMet } from "@/utilities/retries";
import { sanitizeObject } from "@/utilities/sanitize";
import { getProjectById } from "@/utilities/sdk";
import { useSetupChainAndWallet } from "./useSetupChainAndWallet";
import { useWallet } from "./useWallet";
import { useProjectGrants } from "./v2/useProjectGrants";

export type MilestoneEditData = Partial<
  Pick<IMilestone, "title" | "description" | "endsAt" | "startsAt" | "priority">
>;

export const useMilestoneEdit = () => {
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
  const project = useProjectStore((state) => state.project);
  const { refetch: refetchGrants } = useProjectGrants(project?.uid || "");

  const { setupChainAndWallet } = useSetupChainAndWallet();

  const editMilestone = async (milestone: UnifiedMilestone, newData: MilestoneEditData) => {
    setIsEditing(true);
    startAttestation("Editing milestone...");

    try {
      changeStepperStep("preparing");

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
          const fetchedProject = await getProjectById(project!.details?.slug || "");
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

          for (const milestoneInstance of milestoneInstances) {
            const result = await milestoneInstance.edit(
              walletSigner,
              sanitizedData,
              changeStepperStep
            );

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
                .filter((m) => milestoneUIDs.includes(m.uid));
              return foundMilestones.some(
                (m) => m.title === sanitizedData.title || !sanitizedData.title
              );
            },
            async () => {
              changeStepperStep("indexed");
            }
          );
        }

        showSuccess("Milestone edited successfully!");
      } else {
        showLoading("Editing milestone...");

        const setup = await setupChainAndWallet({
          targetChainId: milestone.chainID,
          currentChainId: chain?.id,
          switchChainAsync,
        });

        if (!setup) {
          throw new Error("Failed to switch chain or connect wallet");
        }

        const { gapClient, walletSigner } = setup;
        const fetchedProject = await gapClient.fetch.projectById(project?.uid);

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

        const result = await milestoneInstance.edit(walletSigner, sanitizedData, changeStepperStep);

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
            const fetchedMilestone = foundGrant?.milestones?.find(
              (m) => m.title === (sanitizedData.title || milestone.title)
            );
            return !!fetchedMilestone;
          },
          async () => {
            changeStepperStep("indexed");
          }
        );

        showSuccess("Milestone edited successfully!");
      }
    } catch (error) {
      showError("There was an error editing the milestone");
      errorManager("Error editing milestone", error, {
        milestoneData: milestone,
      });
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
