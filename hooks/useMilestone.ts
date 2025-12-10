import { ProjectMilestone } from "@show-karma/karma-gap-sdk/core/class/entities/ProjectMilestone";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";
import { useAccount } from "wagmi";
import type { MilestoneCompletedFormData } from "@/components/Forms/GrantMilestoneCompletion";
import { errorManager } from "@/components/Utilities/errorManager";
import { getProjectGrants } from "@/services/project-grants.service";
import { useOwnerStore, useProjectStore } from "@/store";
import { useStepper } from "@/store/modals/txStepper";
import type { UnifiedMilestone } from "@/types/roadmap";
import { chainNameDictionary } from "@/utilities/chainNameDictionary";
import { walletClientToSigner } from "@/utilities/eas-wagmi-utils";
import { ensureCorrectChain } from "@/utilities/ensureCorrectChain";
import fetchData from "@/utilities/fetchData";
import { getProjectObjectives } from "@/utilities/gapIndexerApi/getProjectObjectives";
import { sendMilestoneImpactAnswers } from "@/utilities/impact/milestoneImpactAnswers";
import { INDEXER } from "@/utilities/indexer";
import { MESSAGES } from "@/utilities/messages";
import { PAGES } from "@/utilities/pages";
import { retryUntilConditionMet } from "@/utilities/retries";
import { sanitizeInput, sanitizeObject } from "@/utilities/sanitize";
import { getProjectById } from "@/utilities/sdk";
import { safeGetWalletClient } from "@/utilities/wallet-helpers";
import { useGap } from "./useGap";
import { useOffChainRevoke } from "./useOffChainRevoke";
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
  const { changeStepperStep, setIsStepper } = useStepper();
  const project = useProjectStore((state) => state.project);
  const { projectId } = useParams();
  const { refetch } = useProjectUpdates(projectId as string);
  const { refetch: refetchGrants } = useProjectGrants(project?.uid || "");
  const router = useRouter();
  const { isProjectOwner } = useProjectStore();
  const { isOwner: isContractOwner } = useOwnerStore();
  const _isOnChainAuthorized = isProjectOwner || isContractOwner;
  const { performOffChainRevoke } = useOffChainRevoke();

  const multiGrantDelete = async (milestone: UnifiedMilestone) => {
    setIsDeleting(true);
    setIsStepper(true);

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

        for (const chainId of arrayOfMilestonesByChains) {
          const milestoneOfChain = milestonesByChainID?.[chainId];
          const chainName = chainNameDictionary(chainId);
          toast.loading(`Deleting ${milestoneOfChain?.length} milestone(s) on ${chainName}...`, {
            id: `chain-${chainId}`,
          });

          // Switch chain if needed
          const {
            success,
            chainId: actualChainId,
            gapClient,
          } = await ensureCorrectChain({
            targetChainId: chainId,
            currentChainId: chain?.id,
            switchChainAsync,
          });

          if (!success || !gapClient) {
            throw new Error("Failed to switch chain or get GAP client");
          }

          const { walletClient, error } = await safeGetWalletClient(actualChainId);
          if (error || !walletClient) {
            throw new Error("Failed to connect to wallet", { cause: error });
          }

          const walletSigner = await walletClientToSigner(walletClient);
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
                toast.success(
                  `Deleted successfully ${milestoneOfChain?.length} milestone(s) on ${chainName}...`,
                  {
                    id: `chain-${chainId}`,
                  }
                );
                // Use our new force refresh function
                refetch();
              });
            })
            .catch(() => {
              toast.remove(`chain-${chainId}`);
            });
        }
      } else {
        // Handle single milestone deletion
        let gapClient = gap;

        const loadingToast = toast.loading(`Deleting milestone...`, {
          id: `milestone-${milestone.uid}`,
        });

        const {
          success,
          chainId: actualChainId,
          gapClient: newGapClient,
        } = await ensureCorrectChain({
          targetChainId: milestone.chainID,
          currentChainId: chain?.id,
          switchChainAsync,
        });

        if (!success) {
          throw new Error("Failed to switch chain");
        }

        gapClient = newGapClient;

        const { walletClient, error } = await safeGetWalletClient(actualChainId);
        if (error || !walletClient || !gapClient) {
          throw new Error("Failed to connect to wallet", { cause: error });
        }

        const walletSigner = await walletClientToSigner(walletClient);
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
              toast.success("Milestone deleted successfully", {
                id: loadingToast,
              });
              // Use our new force refresh function
              refetch();
            });
          })
          .catch(() => {
            toast.remove(loadingToast);
          });
      }
    } catch (error) {
      console.error("Error during deletion:", error);
      toast.error("There was an error deleting the milestone");
      errorManager("Error deleting milestone", error, {
        milestoneData: milestone,
      });
    } finally {
      setIsDeleting(false);
      setIsStepper(false);
    }
  };

  // Function to revoke milestone completion for multiple grants and chains
  const multiGrantUndoCompletion = async (milestone: UnifiedMilestone) => {
    setIsStepper(true);

    const chains = [];

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

        for (const chainId of arrayOfMilestonesByChains) {
          const milestoneOfChain = milestonesByChainID?.[chainId];
          const chainName = chainNameDictionary(chainId);
          toast.loading(
            `Undoing completion for ${milestoneOfChain?.length} milestone(s) on ${chainName}...`,
            {
              id: `chain-${chainId}`,
            }
          );
          chains.push(chainId);

          // Switch chain if needed
          const {
            success,
            chainId: actualChainId,
            gapClient,
          } = await ensureCorrectChain({
            targetChainId: chainId,
            currentChainId: chain?.id,
            switchChainAsync,
          });

          if (!success || !gapClient) {
            throw new Error("Failed to switch chain or get GAP client");
          }

          const { walletClient, error } = await safeGetWalletClient(actualChainId);
          if (error || !walletClient) {
            throw new Error("Failed to connect to wallet", { cause: error });
          }

          const _walletSigner = await walletClientToSigner(walletClient);
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
            toast.success(
              `Undid completion for ${milestoneOfChain?.length} milestone(s) successfully!`,
              {
                id: `chain-${chainId}`,
              }
            );
            refetch();
          });
        }
      } else {
        // Handle single milestone completion revocation
        let gapClient = gap;

        const loadingToast = toast.loading(`Undoing milestone completion...`, {
          id: `milestone-${milestone.uid}`,
        });

        const {
          success,
          chainId: actualChainId,
          gapClient: newGapClient,
        } = await ensureCorrectChain({
          targetChainId: milestone.chainID,
          currentChainId: chain?.id,
          switchChainAsync,
        });

        if (!success) {
          throw new Error("Failed to switch chain");
        }

        gapClient = newGapClient;

        const { walletClient, error } = await safeGetWalletClient(actualChainId);
        if (error || !walletClient || !gapClient) {
          throw new Error("Failed to connect to wallet", { cause: error });
        }

        const _walletSigner = await walletClientToSigner(walletClient);
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
          toast.success(MESSAGES.MILESTONES.COMPLETE.UNDO.SUCCESS, {
            id: loadingToast,
          });
          refetch();
        });
      }
    } catch (error) {
      console.error("Error during completion revocation:", error);
      toast.error(MESSAGES.MILESTONES.COMPLETE.UNDO.ERROR);
      errorManager("Error revoking milestone completion", error, {
        milestoneData: milestone,
      });
    } finally {
      setIsStepper(false);
      chains.forEach((chainId) => {
        toast.remove(`chain-${chainId}`);
      });
    }
  };

  // Function to complete a single grant milestone
  const completeSingleMilestone = async (
    milestone: UnifiedMilestone,
    data: MilestoneCompletedFormData & { noProofCheckbox: boolean }
  ) => {
    let gapClient = gap;

    try {
      const {
        success,
        chainId: actualChainId,
        gapClient: updatedGapClient,
      } = await ensureCorrectChain({
        targetChainId: milestone.chainID,
        currentChainId: chain?.id,
        switchChainAsync,
      });

      if (!success) {
        return;
      }

      gapClient = updatedGapClient;

      const { walletClient, error } = await safeGetWalletClient(actualChainId);

      if (error || !walletClient || !gapClient) {
        throw new Error("Failed to connect to wallet", { cause: error });
      }

      const walletSigner = await walletClientToSigner(walletClient);
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

      toast.loading(`Marking milestone as complete`, {
        id: `milestone-${milestone.uid}`,
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
            toast.success(`Completed ${milestone.title} milestone successfully!`, {
              id: `milestone-${milestone.uid}`,
            });

            // Send outputs and deliverables data
            await sendOutputsAndDeliverables(milestone.uid, data);

            refetch();
            router.push(PAGES.PROJECT.UPDATES(project?.details?.slug || project?.uid || ""));
          });
        })
        .catch(() => {
          toast.remove(`milestone-${milestone.uid}`);
        });
    } catch (error) {
      toast.error("There was an error completing the milestone");
      errorManager("Error completing milestone.", error, {
        milestoneData: milestone,
      });
    } finally {
      setIsStepper(false);
    }
  };

  // Function to complete multiple grant milestones
  const completeMilestone = async (
    milestone: UnifiedMilestone,
    data: MilestoneCompletedFormData & { noProofCheckbox: boolean }
  ) => {
    setIsStepper(true);

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

      for (const chainId of arrayOfMilestonesByChains) {
        const milestonesOfChain = milestonesByChainID[chainId];
        const chainName = chainNameDictionary(chainId);

        toast.loading(`Completing ${milestonesOfChain.length} milestone(s) on ${chainName}...`, {
          id: `chain-${chainId}`,
        });

        // Switch chain if needed
        const {
          success,
          chainId: actualChainId,
          gapClient,
        } = await ensureCorrectChain({
          targetChainId: chainId,
          currentChainId: chain?.id,
          switchChainAsync,
        });

        if (!success || !gapClient) {
          throw new Error("Failed to switch chain or get GAP client");
        }

        const { walletClient, error } = await safeGetWalletClient(actualChainId);
        if (error || !walletClient) {
          throw new Error("Failed to connect to wallet", { cause: error });
        }

        const walletSigner = await walletClientToSigner(walletClient);
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
              toast.success(
                `Completed ${milestonesOfChain.length} milestone(s) on ${chainName} successfully!`,
                {
                  id: `chain-${chainId}`,
                }
              );

              // Send outputs and deliverables for each milestone
              for (const milestoneUID of milestonesOfChain) {
                await sendOutputsAndDeliverables(milestoneUID, data);
              }

              refetch();
              router.push(PAGES.PROJECT.UPDATES(project?.details?.slug || project?.uid || ""));
            });
          })
          .catch(() => {
            toast.remove(`chain-${chainId}`);
          });
      }
    } catch (error) {
      toast.error("There was an error completing the milestone");
      errorManager("Error completing milestone", error, {
        milestoneData: milestone,
      });
    } finally {
      setIsStepper(false);
    }
  };

  // Function to edit milestone completion for multiple grants and chains
  const multiGrantEditCompletion = async (
    milestone: UnifiedMilestone,
    data: MilestoneCompletedFormData & { noProofCheckbox: boolean }
  ) => {
    setIsStepper(true);

    const chains: number[] = [];

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

        for (const chainId of arrayOfMilestonesByChains) {
          const milestoneOfChain = milestonesByChainID?.[chainId];
          const chainName = chainNameDictionary(chainId);
          toast.loading(
            `Editing completion for ${milestoneOfChain?.length} milestone(s) on ${chainName}...`,
            {
              id: `chain-${chainId}`,
            }
          );
          chains.push(chainId);

          // Switch chain if needed
          const {
            success,
            chainId: actualChainId,
            gapClient,
          } = await ensureCorrectChain({
            targetChainId: chainId,
            currentChainId: chain?.id,
            switchChainAsync,
          });

          if (!success || !gapClient) {
            throw new Error("Failed to switch chain or get GAP client");
          }

          const { walletClient, error } = await safeGetWalletClient(actualChainId);
          if (error || !walletClient) {
            throw new Error("Failed to connect to wallet", { cause: error });
          }

          const walletSigner = await walletClientToSigner(walletClient);
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
            toast.success(
              `Edited completion for ${milestoneOfChain?.length} milestone(s) on ${chainName} successfully!`,
              {
                id: `chain-${chainId}`,
              }
            );
            refetch();
          });
        }
      } else {
        // Handle single milestone completion editing
        let gapClient = gap;

        const loadingToast = toast.loading(`Editing milestone completion...`, {
          id: `milestone-${milestone.uid}`,
        });

        const {
          success,
          chainId: actualChainId,
          gapClient: newGapClient,
        } = await ensureCorrectChain({
          targetChainId: milestone.chainID,
          currentChainId: chain?.id,
          switchChainAsync,
        });

        if (!success) {
          throw new Error("Failed to switch chain");
        }

        gapClient = newGapClient;

        const { walletClient, error } = await safeGetWalletClient(actualChainId);
        if (error || !walletClient || !gapClient) {
          throw new Error("Failed to connect to wallet", { cause: error });
        }

        const walletSigner = await walletClientToSigner(walletClient);

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
                toast.success(MESSAGES.MILESTONES.UPDATE_COMPLETION.SUCCESS, {
                  id: loadingToast,
                });
                refetch();
              });
            })
            .catch(() => {
              toast.remove(loadingToast);
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
                toast.success(MESSAGES.PROJECT_OBJECTIVE_FORM.COMPLETE.SUCCESS, {
                  id: loadingToast,
                });
                refetch();
              });
            })
            .catch(() => {
              toast.remove(loadingToast);
            });
        }
      }
    } catch (error) {
      console.error("Error during completion editing:", error);
      toast.error("There was an error editing the milestone completion");
      errorManager("Error editing milestone completion", error, {
        milestoneData: milestone,
      });
    } finally {
      setIsStepper(false);
      chains.forEach((chainId) => {
        toast.remove(`chain-${chainId}`);
      });
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
