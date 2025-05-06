import { useState } from "react";
import { useAccount, useSwitchChain } from "wagmi";
import { checkNetworkIsValid } from "@/utilities/checkNetworkIsValid";
import { safeGetWalletClient } from "@/utilities/wallet-helpers";
import { walletClientToSigner } from "@/utilities/eas-wagmi-utils";
import { useStepper } from "@/store/modals/txStepper";
import { useProjectStore } from "@/store";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";
import { useParams, useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { errorManager } from "@/components/Utilities/errorManager";
import { getGapClient, useGap } from "./useGap";
import { UnifiedMilestone } from "@/types/roadmap";
import { getProjectById } from "@/utilities/sdk";
import { retryUntilConditionMet } from "@/utilities/retries";
import { useAllMilestones } from "./useAllMilestones";
import { chainNameDictionary } from "@/utilities/chainNameDictionary";
import { sanitizeObject } from "@/utilities/sanitize";
import { MilestoneCompletedFormData } from "@/components/Forms/GrantMilestoneCompletion";
import { PAGES } from "@/utilities/pages";

export const useMilestone = () => {
  const [isDeleting, setIsDeleting] = useState(false);
  const { chain } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const { gap } = useGap();
  const { changeStepperStep, setIsStepper } = useStepper();
  const refreshProject = useProjectStore((state) => state.refreshProject);
  const project = useProjectStore((state) => state.project);
  const { projectId } = useParams();
  const { refetch } = useAllMilestones(projectId as string);
  const router = useRouter();

  const multiGrantDelete = async (milestone: UnifiedMilestone) => {
    setIsDeleting(true);
    setIsStepper(true);

    try {
      changeStepperStep("preparing");

      // Check if we're dealing with multiple grants
      const isMultiGrant =
        milestone.mergedGrants && milestone.mergedGrants.length > 1;

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
            `Deleting ${milestoneOfChain?.length} milestone(s) on ${chainName}...`,
            {
              id: `chain-${chainId}`,
            }
          );

          // Switch chain if needed
          if (chain?.id !== chainId) {
            await switchChainAsync?.({ chainId });
          }
          const gapClient = getGapClient(chainId);

          if (!gapClient) {
            throw new Error("Failed to get GAP client");
          }

          const { walletClient, error } = await safeGetWalletClient(chainId);
          if (error || !walletClient) {
            throw new Error("Failed to connect to wallet", { cause: error });
          }

          const walletSigner = await walletClientToSigner(walletClient);
          const fetchedProject = await getProjectById(
            project!.details?.data.slug || ""
          );
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
                const projectInstance = await refreshProject();
                const isMilestoneExists = projectInstance?.grants.some(
                  (grant) =>
                    grant.milestones.some((milestone) =>
                      milestoneUIDs.includes(milestone.uid)
                    )
                );

                return !isMilestoneExists || false;
              },
              async () => {
                callbackFn?.();
              }
            );
          };

          await milestoneInstances[0]
            .revokeMultipleAttestations(
              walletSigner,
              revocationArgs,
              changeStepperStep
            )
            .then(async (res) => {
              if (res.tx.length > 0) {
                const txPromises = res.tx.map((tx: any) =>
                  tx.hash
                    ? fetchData(
                        INDEXER.ATTESTATION_LISTENER(tx.hash, chainId),
                        "POST",
                        {}
                      )
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

        toast.loading(`Deleting milestone...`, {
          id: `milestone-${milestone.uid}`,
        });

        if (
          !checkNetworkIsValid(chain?.id) ||
          chain?.id !== milestone.chainID
        ) {
          await switchChainAsync?.({ chainId: milestone.chainID });
          gapClient = getGapClient(milestone.chainID);
        }

        const { walletClient, error } = await safeGetWalletClient(
          milestone.chainID
        );
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
              const projectInstance = await refreshProject();
              const isMilestoneExists = projectInstance?.grants.some((grant) =>
                grant.milestones.some(
                  (milestone) =>
                    milestone.uid.toLowerCase() ===
                    milestoneInstance.uid.toLowerCase()
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
          .revokeMultipleAttestations(
            walletSigner,
            attestationsToRevoke,
            changeStepperStep
          )
          .then(async (result) => {
            // Notify indexer
            const txHash = result?.tx[0]?.hash;
            if (txHash) {
              await fetchData(
                INDEXER.ATTESTATION_LISTENER(txHash, milestone.chainID),
                "POST",
                {}
              );
            }

            // Poll for indexing completion
            changeStepperStep("indexing");

            await checkIfMilestoneExists(() => {
              changeStepperStep("indexed");
            }).then(() => {
              toast.success("Milestone deleted successfully");
              // Use our new force refresh function
              refetch();
            });
          })
          .catch(() => {
            toast.remove(`milestone-${milestone.uid}`);
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

  // Function to complete a single grant milestone
  const completeSingleMilestone = async (
    milestone: UnifiedMilestone,
    data: MilestoneCompletedFormData & { noProofCheckbox: boolean }
  ) => {
    let gapClient = gap;

    try {
      if (!checkNetworkIsValid(chain?.id) || chain?.id !== milestone.chainID) {
        await switchChainAsync?.({ chainId: milestone.chainID });
      }

      const { walletClient, error } = await safeGetWalletClient(
        milestone.chainID
      );

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
        proofOfWork: data.noProofCheckbox ? "" : data.proofOfWork,
        completionPercentage: data.completionPercentage,
        type: "completed",
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
              INDEXER.ATTESTATION_LISTENER(
                txHash,
                milestoneInstance?.chainID as number
              ),
              "POST",
              {}
            );
          }

          // Wait for indexer to process
          await retryUntilConditionMet(
            async () => {
              const projectInstance = await refreshProject();
              // Check if any of the milestones have been completed
              const areMilestonesCompleted = projectInstance?.grants.some(
                (grant) =>
                  grant.milestones.some(
                    (m) =>
                      m.uid.toLowerCase() ===
                        milestoneInstance.uid.toLowerCase() && !!m.completed
                  )
              );
              return areMilestonesCompleted || false;
            },
            async () => {
              changeStepperStep("indexed");
            }
          ).then(() => {
            toast.success(
              `Completed ${milestone.title} milestone successfully!`,
              {
                id: `milestone-${milestone.uid}`,
              }
            );
            refetch();
            router.push(
              PAGES.PROJECT.UPDATES(
                project?.details?.data.slug || project?.uid || ""
              )
            );
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

        toast.loading(
          `Completing ${milestonesOfChain.length} milestone(s) on ${chainName}...`,
          {
            id: `chain-${chainId}`,
          }
        );

        // Switch chain if needed
        if (chain?.id !== chainId) {
          await switchChainAsync?.({ chainId });
        }
        const gapClient = getGapClient(chainId);

        if (!gapClient) {
          throw new Error("Failed to get GAP client");
        }

        const { walletClient, error } = await safeGetWalletClient(chainId);
        if (error || !walletClient) {
          throw new Error("Failed to connect to wallet", { cause: error });
        }

        const walletSigner = await walletClientToSigner(walletClient);
        const fetchedProject = await getProjectById(
          project!.details?.data.slug || ""
        );

        if (!fetchedProject) {
          throw new Error("Failed to fetch project data");
        }

        const completionData = sanitizeObject({
          reason: data.description,
          proofOfWork: data.noProofCheckbox ? "" : data.proofOfWork,
          completionPercentage: data.completionPercentage,
          type: "completed",
        });

        if (!milestonesOfChain?.length) {
          throw new Error("No milestones found for this chain");
        }

        // Find milestone instances for this chain
        const milestoneInstances = fetchedProject.grants
          .filter((grant) => grant.milestones.length > 0)
          .flatMap((grant) => grant.milestones)
          .filter((m) =>
            milestonesOfChain.includes((m as any)?._uid || m?.uid)
          );

        if (!milestoneInstances?.length) {
          throw new Error(
            "Milestone instances couldn't be found for this chain"
          );
        }

        const milestoneUIDs = milestonesOfChain.map((m) => m as `0x${string}`);

        await milestoneInstances[0]
          .completeForMultipleGrants(
            walletSigner,
            milestoneUIDs,
            completionData,
            changeStepperStep
          )
          .then(async (result) => {
            if (result.tx?.length > 0) {
              const txPromises = result.tx.map((tx: any) =>
                tx.hash
                  ? fetchData(
                      INDEXER.ATTESTATION_LISTENER(tx.hash, chainId),
                      "POST",
                      {}
                    )
                  : Promise.resolve()
              );
              await Promise.all(txPromises);
            }

            changeStepperStep("indexing");

            // Wait for indexer to process
            await retryUntilConditionMet(
              async () => {
                const projectInstance = await refreshProject();
                // Check if any of the milestones have been completed
                const areMilestonesCompleted = projectInstance?.grants.some(
                  (grant) =>
                    grant.milestones.some(
                      (m) => milestoneUIDs.includes(m.uid) && !!m.completed
                    )
                );
                return areMilestonesCompleted || false;
              },
              async () => {
                changeStepperStep("indexed");
              }
            ).then(() => {
              toast.success(
                `Completed ${milestonesOfChain.length} milestone(s) on ${chainName} successfully!`,
                {
                  id: `chain-${chainId}`,
                }
              );
              refetch();
              router.push(
                PAGES.PROJECT.UPDATES(
                  project?.details?.data.slug || project?.uid || ""
                )
              );
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

  return {
    isDeleting,
    multiGrantDelete,
    completeMilestone,
  };
};
