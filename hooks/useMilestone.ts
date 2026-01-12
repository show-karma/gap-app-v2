import { ProjectMilestone } from "@show-karma/karma-gap-sdk/core/class/entities/ProjectMilestone";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { useAccount } from "wagmi";
import type { MilestoneCompletedFormData } from "@/components/Forms/GrantMilestoneCompletion";
import { errorManager } from "@/components/Utilities/errorManager";
import { useAttestationToast } from "@/hooks/useAttestationToast";
import { getProjectGrants } from "@/services/project-grants.service";
import { useOwnerStore, useProjectStore } from "@/store";
import type { UnifiedMilestone } from "@/types/v2/roadmap";
import { chainNameDictionary } from "@/utilities/chainNameDictionary";
import fetchData from "@/utilities/fetchData";
import { getProjectObjectives } from "@/utilities/gapIndexerApi/getProjectObjectives";
import { sendMilestoneImpactAnswers } from "@/utilities/impact/milestoneImpactAnswers";
import { INDEXER } from "@/utilities/indexer";
import { MESSAGES } from "@/utilities/messages";
import { PAGES } from "@/utilities/pages";
import { retryUntilConditionMet } from "@/utilities/retries";
import { sanitizeInput, sanitizeObject } from "@/utilities/sanitize";
import { getProjectById } from "@/utilities/sdk";
import { useGap } from "./useGap";
import { useOffChainRevoke } from "./useOffChainRevoke";
import { useSetupChainAndWallet } from "./useSetupChainAndWallet";
import { useWallet } from "./useWallet";
import { useProjectGrants } from "./v2/useProjectGrants";
import { useProjectUpdates } from "./v2/useProjectUpdates";

// Helper function to send outputs and deliverables data
const sendOutputsAndDeliverables = async (
  milestoneUID: string,
  data: MilestoneCompletedFormData
) => {
  try {
    // Send outputs (metrics) data if any
    if (data.outputs && data.outputs.length > 0) {
      for (const output of data.outputs) {
        if (output.outputId && output.value !== undefined && output.value !== "") {
          // Default to today's date if not specified (matching project behavior)
          const today = new Date().toISOString().split("T")[0];

          const datapoints = [
            {
              value: output.value,
              proof: output.proof || "",
              startDate: output.startDate || today,
              endDate: output.endDate || today,
            },
          ];

          await sendMilestoneImpactAnswers(
            milestoneUID,
            output.outputId,
            datapoints,
            () => {},
            (error) => {
              console.error(`Error sending output data for indicator ${output.outputId}:`, error);
            }
          );
        }
      }
    }

    // Send deliverables data if any
    if (data.deliverables && data.deliverables.length > 0) {
    }
  } catch (error) {
    console.error("Error sending outputs and deliverables:", error);
    // Don't throw - we don't want to fail the milestone completion if outputs fail
  }
};

export const useMilestone = () => {
  const [isDeleting, setIsDeleting] = useState(false);
  const { chain } = useAccount();
  const { switchChainAsync } = useWallet();
  const { gap } = useGap();
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
  const { projectId } = useParams();
  const { refetch } = useProjectUpdates(projectId as string);
  const { refetch: refetchGrants } = useProjectGrants(project?.uid || "");
  const router = useRouter();
  const { isProjectOwner } = useProjectStore();
  const { isOwner: isContractOwner } = useOwnerStore();
  const _isOnChainAuthorized = isProjectOwner || isContractOwner;
  const { performOffChainRevoke } = useOffChainRevoke();
  const { setupChainAndWallet } = useSetupChainAndWallet();

  const multiGrantDelete = async (milestone: UnifiedMilestone) => {
    setIsDeleting(true);
    startAttestation("Deleting milestone...");

    try {
      changeStepperStep("preparing");

      // Check if we're dealing with multiple grants
      const isMultiGrant = milestone.mergedGrants && milestone.mergedGrants.length > 1;

      if (isMultiGrant) {
        // group milestones by chainID
        const milestonesByChainID = milestone.mergedGrants?.reduce(
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

        // Sort chains to prioritize current chain first
        const arrayOfMilestonesByChains = Object.keys(milestonesByChainID || {})
          .map(Number)
          .sort((a, b) => {
            if (a === chain?.id) return -1;
            if (b === chain?.id) return 1;
            return a - b; // Otherwise sort numerically
          });

        for (let i = 0; i < arrayOfMilestonesByChains.length; i++) {
          const chainId = arrayOfMilestonesByChains[i];
          const milestoneOfChain = milestonesByChainID?.[chainId];
          const chainName = chainNameDictionary(chainId);
          const itemCount = milestoneOfChain?.length || 1;
          showChainProgress(
            "Deleting",
            chainName,
            i + 1,
            arrayOfMilestonesByChains.length,
            itemCount
          );

          // Switch chain if needed
          const setup = await setupChainAndWallet({
            targetChainId: chainId,
            currentChainId: chain?.id,
            switchChainAsync,
          });

          if (!setup) {
            throw new Error("Failed to switch chain or connect wallet");
          }

          const { gapClient, walletSigner } = setup;
          const fetchedProject = await getProjectById(project!.details?.slug || "");
          if (!fetchedProject) {
            throw new Error("Failed to fetch project data");
          }

          const milestoneUIDs = milestoneOfChain?.map((milestone) => milestone);
          if (!milestoneUIDs?.length) {
            throw new Error("No milestones found for this chain");
          }

          const milestoneSchema = gapClient.findSchema("Milestone");

          const milestoneInstances = fetchedProject.grants
            .filter((grant) => grant.milestones.length > 0)
            .flatMap((grant) => grant.milestones)
            .filter((milestone) =>
              milestoneUIDs.includes((milestone as any)?._uid || milestone?.uid)
            );

          if (!milestoneInstances) {
            throw new Error("Milestone UIDs couldn't be found for this chain");
          }

          const revocationArgs = milestoneUIDs.map((uid) => ({
            schemaId: milestoneSchema.uid as `0x${string}`,
            uid: uid as `0x${string}`,
          }));

          const checkIfMilestonesExists = async (callbackFn?: () => void) => {
            await retryUntilConditionMet(
              async () => {
                const { data: fetchedGrants } = await refetchGrants();
                const isMilestoneExists = (fetchedGrants || []).some((grant) =>
                  grant.milestones?.some((milestone) => milestoneUIDs.includes(milestone.uid))
                );

                return !isMilestoneExists || false;
              },
              async () => {
                callbackFn?.();
              }
            );
          };

          await milestoneInstances[0]
            .revokeMultipleAttestations(walletSigner, revocationArgs, changeStepperStep)
            .then(async (res) => {
              if (res.tx.length > 0) {
                const txPromises = res.tx.map((tx: any) =>
                  tx.hash
                    ? fetchData(INDEXER.ATTESTATION_LISTENER(tx.hash, chainId), "POST", {})
                    : Promise.resolve()
                );
                await Promise.all(txPromises);
              }

              // Poll for indexing completion
              changeStepperStep("indexing");

              await checkIfMilestonesExists(() => {
                changeStepperStep("indexed");
              }).then(() => {
                // Use our new force refresh function
                refetch();
              });
            });
        }
      } else {
        // Handle single milestone deletion
        showLoading("Deleting milestone...");

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

        const attestationsToRevoke = [
          {
            schemaId: milestoneInstance.schema.uid,
            uid: milestoneInstance.uid,
          },
        ];

        const checkIfMilestoneExists = async (callbackFn?: () => void) => {
          await retryUntilConditionMet(
            async () => {
              const { data: fetchedGrants } = await refetchGrants();
              const isMilestoneExists = (fetchedGrants || []).some((grant) =>
                grant.milestones?.some(
                  (milestone) => milestone.uid.toLowerCase() === milestoneInstance.uid.toLowerCase()
                )
              );

              return !isMilestoneExists || false;
            },
            async () => {
              callbackFn?.();
            }
          );
        };

        // Revoke the milestone
        await milestoneInstance
          .revokeMultipleAttestations(walletSigner, attestationsToRevoke, changeStepperStep)
          .then(async (result) => {
            // Notify indexer
            const txHash = result?.tx[0]?.hash;
            if (txHash) {
              await fetchData(INDEXER.ATTESTATION_LISTENER(txHash, milestone.chainID), "POST", {});
            }

            // Poll for indexing completion
            changeStepperStep("indexing");

            await checkIfMilestoneExists(() => {
              changeStepperStep("indexed");
            }).then(() => {
              showSuccess("Milestone deleted successfully");
              // Use our new force refresh function
              refetch();
            });
          });
      }
    } catch (error) {
      console.error("Error during deletion:", error);
      showError("There was an error deleting the milestone");
      errorManager("Error deleting milestone", error, {
        milestoneData: milestone,
      });
    } finally {
      setIsDeleting(false);
      dismiss();
    }
  };

  // Function to revoke milestone completion for multiple grants and chains
  const multiGrantUndoCompletion = async (milestone: UnifiedMilestone) => {
    startAttestation("Undoing milestone completion...");

    try {
      changeStepperStep("preparing");

      // Check if we're dealing with multiple grants
      const isMultiGrant = milestone.mergedGrants && milestone.mergedGrants.length > 1;

      if (isMultiGrant) {
        // group milestones by chainID
        const milestonesByChainID = milestone.mergedGrants?.reduce(
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

        // Sort chains to prioritize current chain first
        const arrayOfMilestonesByChains = Object.keys(milestonesByChainID || {})
          .map(Number)
          .sort((a, b) => {
            if (a === chain?.id) return -1;
            if (b === chain?.id) return 1;
            return a - b; // Otherwise sort numerically
          });

        for (let i = 0; i < arrayOfMilestonesByChains.length; i++) {
          const chainId = arrayOfMilestonesByChains[i];
          const milestoneOfChain = milestonesByChainID?.[chainId];
          const chainName = chainNameDictionary(chainId);
          const itemCount = milestoneOfChain?.length || 1;
          showChainProgress(
            "Undoing completion",
            chainName,
            i + 1,
            arrayOfMilestonesByChains.length,
            itemCount
          );

          // Switch chain if needed
          const setup = await setupChainAndWallet({
            targetChainId: chainId,
            currentChainId: chain?.id,
            switchChainAsync,
          });

          if (!setup) {
            throw new Error("Failed to switch chain or connect wallet");
          }

          const fetchedProject = await getProjectById(project!.details?.slug || "");
          if (!fetchedProject) {
            throw new Error("Failed to fetch project data");
          }

          const milestoneUIDs = milestoneOfChain?.map((milestone) => milestone);
          if (!milestoneUIDs?.length) {
            throw new Error("No milestones found for this chain");
          }

          const milestoneInstances = fetchedProject.grants
            .filter((grant) => grant.milestones.length > 0)
            .flatMap((grant) => grant.milestones)
            .filter((milestone) =>
              milestoneUIDs.includes((milestone as any)?._uid || milestone?.uid)
            );

          if (!milestoneInstances?.length) {
            throw new Error("Milestone UIDs couldn't be found for this chain");
          }

          const checkIfCompletionExists = async (callbackFn?: () => void) => {
            await retryUntilConditionMet(
              async () => {
                const { data: fetchedGrants } = await refetchGrants();
                const areCompletionsRemoved = (fetchedGrants || []).every((grant) =>
                  grant.milestones
                    ?.filter((milestone) => milestoneUIDs.includes(milestone.uid))
                    .every((milestone) => !milestone.completed)
                );

                return areCompletionsRemoved || false;
              },
              async () => {
                callbackFn?.();
              }
            );
          };

          // if (!isOnChainAuthorized) {
          // Use off-chain revocation for each completion
          for (const milestoneInstance of milestoneInstances) {
            if (milestoneInstance.completed?.uid) {
              await performOffChainRevoke({
                uid: milestoneInstance.completed.uid as `0x${string}`,
                chainID: milestoneInstance.chainID,
              });
            }
          }

          await checkIfCompletionExists(() => {
            changeStepperStep("indexed");
          }).then(() => {
            refetch();
          });
        }
        // Show final success message after all chains processed
        showSuccess("Milestone completion undone successfully!");
      } else {
        // Handle single milestone completion revocation
        showLoading("Undoing milestone completion...");

        const setup = await setupChainAndWallet({
          targetChainId: milestone.chainID,
          currentChainId: chain?.id,
          switchChainAsync,
        });

        if (!setup) {
          throw new Error("Failed to switch chain or connect wallet");
        }

        const { gapClient } = setup;
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

        if (!milestoneInstance.completed) {
          throw new Error("Milestone is not completed");
        }

        const checkIfCompletionExists = async (callbackFn?: () => void) => {
          await retryUntilConditionMet(
            async () => {
              const { data: fetchedGrants } = await refetchGrants();
              const foundGrant = (fetchedGrants || []).find((g) => g.uid === milestone.refUID);
              const fetchedMilestone = foundGrant?.milestones?.find((u) => u.uid === milestone.uid);
              return !fetchedMilestone?.completed;
            },
            async () => {
              callbackFn?.();
            }
          );
        };

        await performOffChainRevoke({
          uid: milestoneInstance.completed.uid as `0x${string}`,
          chainID: milestoneInstance.chainID,
        });

        await checkIfCompletionExists(() => {
          changeStepperStep("indexed");
        }).then(() => {
          showSuccess(MESSAGES.MILESTONES.COMPLETE.UNDO.SUCCESS);
          refetch();
        });
      }
    } catch (error) {
      console.error("Error during completion revocation:", error);
      showError(MESSAGES.MILESTONES.COMPLETE.UNDO.ERROR);
      errorManager("Error revoking milestone completion", error, {
        milestoneData: milestone,
      });
    } finally {
      dismiss();
    }
  };

  // Function to complete a single grant milestone
  const completeSingleMilestone = async (
    milestone: UnifiedMilestone,
    data: MilestoneCompletedFormData & { noProofCheckbox: boolean }
  ) => {
    startAttestation("Completing milestone...");
    try {
      const setup = await setupChainAndWallet({
        targetChainId: milestone.chainID,
        currentChainId: chain?.id,
        switchChainAsync,
      });

      if (!setup) {
        return;
      }

      const { gapClient, walletSigner } = setup;
      const fetchedProject = await gapClient.fetch.projectById(project?.uid);

      if (!fetchedProject) return;

      const grantInstance = fetchedProject.grants.find(
        (g) => g.uid.toLowerCase() === milestone.refUID.toLowerCase()
      );

      if (!grantInstance) return;

      const milestoneInstance = grantInstance.milestones.find(
        (u) => u.uid.toLowerCase() === milestone.uid.toLowerCase()
      );

      if (!milestoneInstance) return;

      const completionData = sanitizeObject({
        reason: data.description,
        proofOfWork: "",
        completionPercentage: data.completionPercentage,
        type: "completed",
        deliverables: data.deliverables || [],
      });

      await milestoneInstance
        .complete(walletSigner, completionData, changeStepperStep)
        .then(async (result) => {
          changeStepperStep("indexing");
          // Notify indexer
          const txHash = result?.tx[0]?.hash;
          if (txHash) {
            await fetchData(
              INDEXER.ATTESTATION_LISTENER(txHash, milestoneInstance?.chainID as number),
              "POST",
              {}
            );
          }

          // Wait for indexer to process
          await retryUntilConditionMet(
            async () => {
              const { data: fetchedGrants } = await refetchGrants();
              // Check if any of the milestones have been completed
              const areMilestonesCompleted = (fetchedGrants || []).some((grant) =>
                grant.milestones?.some(
                  (m) =>
                    m.uid.toLowerCase() === milestoneInstance.uid.toLowerCase() && !!m.completed
                )
              );
              return areMilestonesCompleted || false;
            },
            async () => {
              changeStepperStep("indexed");
            }
          ).then(async () => {
            showSuccess(`Completed ${milestone.title} milestone successfully!`);

            // Send outputs and deliverables data
            await sendOutputsAndDeliverables(milestone.uid, data);

            refetch();
            router.push(PAGES.PROJECT.UPDATES(project?.details?.slug || project?.uid || ""));
          });
        });
    } catch (error) {
      showError("There was an error completing the milestone");
      errorManager("Error completing milestone.", error, {
        milestoneData: milestone,
      });
    } finally {
      dismiss();
    }
  };

  // Function to complete multiple grant milestones
  const completeMilestone = async (
    milestone: UnifiedMilestone,
    data: MilestoneCompletedFormData & { noProofCheckbox: boolean }
  ) => {
    startAttestation("Completing milestone...");
    try {
      changeStepperStep("preparing");

      if (!milestone.mergedGrants || milestone.mergedGrants.length <= 1) {
        // If no merged grants or just one, use the single milestone completion
        return completeSingleMilestone(milestone, data);
      }

      const milestonesByChainID = milestone.mergedGrants?.reduce(
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

      // Sort chains to prioritize current chain first
      const arrayOfMilestonesByChains = Object.keys(milestonesByChainID || {})
        .map(Number)
        .sort((a, b) => {
          if (a === chain?.id) return -1;
          if (b === chain?.id) return 1;
          return a - b; // Otherwise sort numerically
        });

      for (let i = 0; i < arrayOfMilestonesByChains.length; i++) {
        const chainId = arrayOfMilestonesByChains[i];
        const milestonesOfChain = milestonesByChainID[chainId];
        const chainName = chainNameDictionary(chainId);
        const itemCount = milestonesOfChain.length;
        showChainProgress(
          "Completing",
          chainName,
          i + 1,
          arrayOfMilestonesByChains.length,
          itemCount
        );

        // Switch chain if needed
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

        const completionData = sanitizeObject({
          reason: data.description,
          proofOfWork: "",
          completionPercentage: data.completionPercentage,
          type: "completed",
          deliverables: data.deliverables || [],
        });

        if (!milestonesOfChain?.length) {
          throw new Error("No milestones found for this chain");
        }

        // Find milestone instances for this chain
        const milestoneInstances = fetchedProject.grants
          .filter((grant) => grant.milestones.length > 0)
          .flatMap((grant) => grant.milestones)
          .filter((m) => milestonesOfChain.includes((m as any)?._uid || m?.uid));

        if (!milestoneInstances?.length) {
          throw new Error("Milestone instances couldn't be found for this chain");
        }

        const milestoneUIDs = milestonesOfChain.map((m) => m as `0x${string}`);

        await milestoneInstances[0]
          .completeForMultipleGrants(walletSigner, milestoneUIDs, completionData, changeStepperStep)
          .then(async (result) => {
            if (result.tx?.length > 0) {
              const txPromises = result.tx.map((tx: any) =>
                tx.hash
                  ? fetchData(INDEXER.ATTESTATION_LISTENER(tx.hash, chainId), "POST", {})
                  : Promise.resolve()
              );
              await Promise.all(txPromises);
            }

            changeStepperStep("indexing");

            // Wait for indexer to process
            await retryUntilConditionMet(
              async () => {
                const { data: fetchedGrants } = await refetchGrants();
                if (!fetchedGrants?.length) return false;
                // Check if any of the milestones have been completed
                const areMilestonesCompleted = fetchedGrants.some((grant) =>
                  grant.milestones?.some(
                    (m) => milestoneUIDs.includes(m.uid as `0x${string}`) && !!m.completed
                  )
                );
                return areMilestonesCompleted || false;
              },
              async () => {
                changeStepperStep("indexed");
              }
            ).then(async () => {
              // Send outputs and deliverables for each milestone
              for (const milestoneUID of milestonesOfChain) {
                await sendOutputsAndDeliverables(milestoneUID, data);
              }

              refetch();
            });
          });
      }
      // Show final success message after all chains processed
      showSuccess("Milestone completed successfully!");
      router.push(PAGES.PROJECT.UPDATES(project?.details?.slug || project?.uid || ""));
    } catch (error) {
      showError("There was an error completing the milestone");
      errorManager("Error completing milestone", error, {
        milestoneData: milestone,
      });
    } finally {
      dismiss();
    }
  };

  // Function to edit milestone completion for multiple grants and chains
  const multiGrantEditCompletion = async (
    milestone: UnifiedMilestone,
    data: MilestoneCompletedFormData & { noProofCheckbox: boolean }
  ) => {
    startAttestation("Editing milestone completion...");

    try {
      changeStepperStep("preparing");

      // Check if we're dealing with multiple grants
      const isMultiGrant = milestone.mergedGrants && milestone.mergedGrants.length > 1;

      if (isMultiGrant) {
        // group milestones by chainID
        const milestonesByChainID = milestone.mergedGrants?.reduce(
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

        // Sort chains to prioritize current chain first
        const arrayOfMilestonesByChains = Object.keys(milestonesByChainID || {})
          .map(Number)
          .sort((a, b) => {
            if (a === chain?.id) return -1;
            if (b === chain?.id) return 1;
            return a - b;
          });

        for (let i = 0; i < arrayOfMilestonesByChains.length; i++) {
          const chainId = arrayOfMilestonesByChains[i];
          const milestoneOfChain = milestonesByChainID?.[chainId];
          const chainName = chainNameDictionary(chainId);
          const itemCount = milestoneOfChain?.length || 1;
          showChainProgress(
            "Editing completion",
            chainName,
            i + 1,
            arrayOfMilestonesByChains.length,
            itemCount
          );

          // Switch chain if needed
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

          const milestoneUIDs = milestoneOfChain?.map((milestone) => milestone);
          if (!milestoneUIDs?.length) {
            throw new Error("No milestones found for this chain");
          }

          const milestoneInstances = fetchedProject.grants
            .filter((grant) => grant.milestones.length > 0)
            .flatMap((grant) => grant.milestones)
            .filter((milestone) =>
              milestoneUIDs.includes((milestone as any)?._uid || milestone?.uid)
            );

          if (!milestoneInstances?.length) {
            throw new Error("Milestone UIDs couldn't be found for this chain");
          }

          const completionData = sanitizeObject({
            reason: data.description,
            proofOfWork: "",
            completionPercentage: data.completionPercentage,
            type: "completed",
            deliverables: data.deliverables || [],
          });

          const checkIfCompletionUpdated = async (callbackFn?: () => void) => {
            await retryUntilConditionMet(
              async () => {
                const { data: fetchedGrants } = await refetchGrants();
                if (!fetchedGrants?.length) return false;
                const areCompletionsUpdated = fetchedGrants.some((grant) =>
                  (grant.milestones || [])
                    .filter((milestone) => milestoneUIDs.includes(milestone.uid))
                    .some((milestone) => {
                      if (!milestone.completed) return false;

                      const originalCompletion = milestoneInstances.find(
                        (m) => m.uid === milestone.uid
                      )?.completed;

                      return !!(
                        originalCompletion &&
                        milestone.completed &&
                        originalCompletion.createdAt &&
                        milestone.completed.createdAt &&
                        new Date(originalCompletion.createdAt) <
                          new Date(milestone.completed.createdAt)
                      );
                    })
                );

                return !!areCompletionsUpdated;
              },
              async () => {
                callbackFn?.();
              }
            );
          };

          // Edit each milestone's completion
          for (const milestoneInstance of milestoneInstances) {
            if (milestoneInstance.completed) {
              await milestoneInstance
                .complete(walletSigner, completionData, changeStepperStep)
                .then(async (res) => {
                  changeStepperStep("indexing");
                  const txHash = res?.tx[0]?.hash;
                  if (txHash) {
                    await fetchData(
                      INDEXER.ATTESTATION_LISTENER(txHash, milestoneInstance.chainID),
                      "POST",
                      {}
                    );
                  }
                });
            }
          }

          await checkIfCompletionUpdated(() => {
            changeStepperStep("indexed");
          }).then(() => {
            refetch();
          });
        }
        // Show final success message after all chains processed
        showSuccess("Milestone completion edited successfully!");
      } else {
        // Handle single milestone completion editing
        showLoading("Editing milestone completion...");

        const setup = await setupChainAndWallet({
          targetChainId: milestone.chainID,
          currentChainId: chain?.id,
          switchChainAsync,
        });

        if (!setup) {
          throw new Error("Failed to switch chain or connect wallet");
        }

        const { gapClient, walletSigner } = setup;

        if (milestone.type === "grant") {
          // Grant milestone editing
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

          if (!milestoneInstance.completed) {
            throw new Error("Milestone is not completed");
          }

          const completionData = sanitizeObject({
            reason: data.description,
            proofOfWork: "",
            completionPercentage: data.completionPercentage,
            type: "completed",
            deliverables: data.deliverables || [],
          });

          const originalCreatedAt = milestoneInstance.completed.createdAt;

          const checkIfCompletionUpdated = async (callbackFn?: () => void) => {
            await retryUntilConditionMet(
              async () => {
                const { data: fetchedGrants } = await refetchGrants();
                if (!fetchedGrants?.length) return false;
                const foundGrant = fetchedGrants.find((g) => g.uid === milestone.refUID);
                const fetchedMilestone = foundGrant?.milestones?.find(
                  (u) => u.uid === milestone.uid
                );
                return !!(
                  fetchedMilestone?.completed &&
                  new Date(originalCreatedAt || 0).getTime() <
                    new Date(fetchedMilestone.completed.createdAt || 0).getTime()
                );
              },
              async () => {
                callbackFn?.();
              }
            );
          };

          await milestoneInstance
            .complete(walletSigner, completionData, changeStepperStep)
            .then(async (res) => {
              changeStepperStep("indexing");
              const txHash = res?.tx[0]?.hash;
              if (txHash) {
                await fetchData(
                  INDEXER.ATTESTATION_LISTENER(txHash, milestoneInstance.chainID),
                  "POST",
                  {}
                );
              }

              await checkIfCompletionUpdated(() => {
                changeStepperStep("indexed");
              }).then(() => {
                showSuccess(MESSAGES.MILESTONES.UPDATE_COMPLETION.SUCCESS);
                refetch();
              });
            });
        } else if (milestone.type === "project") {
          // Project milestone editing
          const fetchedProject = await getProjectById(project?.uid as string);
          if (!fetchedProject) return;
          const fetchedMilestones = await getProjectObjectives(project?.uid as string);
          if (!fetchedMilestones || !gapClient?.network) return;
          const objectivesInstances = ProjectMilestone.from(fetchedMilestones, gapClient?.network);
          const objectiveInstance = objectivesInstances.find(
            (item: any) => item.uid.toLowerCase() === milestone.uid.toLowerCase()
          );
          if (!objectiveInstance) return;

          if (!objectiveInstance.completed) {
            throw new Error("Project milestone is not completed");
          }

          const originalCreatedAt = objectiveInstance.completed.createdAt;

          const checkIfCompletionUpdated = async (callbackFn?: () => void) => {
            await retryUntilConditionMet(
              async () => {
                const fetchedObjectives = await getProjectObjectives(project?.uid as string);
                const stillExists = fetchedObjectives.find(
                  (item: any) => item.uid.toLowerCase() === milestone.uid.toLowerCase()
                );

                return !!(
                  stillExists?.completed &&
                  new Date(originalCreatedAt) < new Date(stillExists.completed.createdAt)
                );
              },
              async () => {
                callbackFn?.();
              }
            );
          };

          await objectiveInstance
            .complete(
              walletSigner,
              {
                proofOfWork: "",
                reason: sanitizeInput(data.description),
                type: `project-milestone-completed`,
              },
              changeStepperStep
            )
            .then(async (res: any) => {
              changeStepperStep("indexing");
              const txHash = res?.tx[0]?.hash;
              if (txHash) {
                await fetchData(
                  INDEXER.ATTESTATION_LISTENER(txHash, objectiveInstance.chainID),
                  "POST",
                  {}
                );
              }

              await checkIfCompletionUpdated(() => {
                changeStepperStep("indexed");
              }).then(() => {
                showSuccess(MESSAGES.PROJECT_OBJECTIVE_FORM.COMPLETE.SUCCESS);
                refetch();
              });
            });
        }
      }
    } catch (error) {
      console.error("Error during completion editing:", error);
      showError("There was an error editing the milestone completion");
      errorManager("Error editing milestone completion", error, {
        milestoneData: milestone,
      });
    } finally {
      dismiss();
    }
  };

  return {
    isDeleting,
    multiGrantDelete,
    multiGrantUndoCompletion,
    multiGrantEditCompletion,
    completeMilestone,
  };
};
