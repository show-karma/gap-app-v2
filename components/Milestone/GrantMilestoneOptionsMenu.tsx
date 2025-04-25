"use client";
import { useState } from "react";
import { Menu, Transition } from "@headlessui/react";
import { Fragment } from "react";
import {
  CheckCircleIcon,
  EllipsisVerticalIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { Button } from "@/components/Utilities/Button";
import { cn } from "@/utilities/tailwind";
import { DeleteDialog } from "@/components/DeleteDialog";
import { MergedMilestone } from "./MilestoneCard";
import { useAccount, useSwitchChain } from "wagmi";
import { checkNetworkIsValid } from "@/utilities/checkNetworkIsValid";
import { getGapClient, useGap } from "@/hooks";
import { safeGetWalletClient } from "@/utilities/wallet-helpers";
import { walletClientToSigner } from "@/utilities/eas-wagmi-utils";
import toast from "react-hot-toast";
import { useStepper } from "@/store/modals/txStepper";
import { errorManager } from "@/components/Utilities/errorManager";
import { MESSAGES } from "@/utilities/messages";
import { useProjectStore } from "@/store";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";
import { useRouter } from "next/navigation";
import { UnifiedMilestone } from "@/utilities/gapIndexerApi/getAllMilestones";

// Common button styling
const buttonClassName = `group border-none ring-none font-normal bg-transparent dark:bg-transparent text-gray-900 dark:text-zinc-100 hover:bg-white dark:hover:bg-zinc-800 dark:hover:opacity-75 hover:opacity-75 flex w-full items-start justify-start rounded-md px-2 py-2 text-sm flex-row gap-2`;

// Extend the MergedMilestone interface to include missing properties
interface ExtendedMergedMilestone extends MergedMilestone {
  chainID: number;
  refUID: string;
  id: string;
}

interface GrantMilestoneOptionsMenuProps {
  milestone: ExtendedMergedMilestone;
  completeFn: (completeState: boolean) => void;
  alreadyCompleted: boolean;
}

export const GrantMilestoneOptionsMenu = ({
  milestone,
  completeFn,
  alreadyCompleted,
}: GrantMilestoneOptionsMenuProps) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const { chain } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const { gap } = useGap();
  const { changeStepperStep, setIsStepper } = useStepper();
  const refreshProject = useProjectStore((state) => state.refreshProject);
  const project = useProjectStore((state) => state.project);
  const router = useRouter();

  const handleDelete = async () => {
    setIsDeleting(true);
    setIsStepper(true);

    try {
      changeStepperStep("preparing");

      // Check if we're dealing with multiple grants
      const isMultiGrant =
        milestone.mergedGrants && milestone.mergedGrants.length > 1;

      if (isMultiGrant) {
        // Group milestones by chain ID
        const milestonesByChain: Record<
          number,
          {
            grantId: string;
            milestoneId: string;
          }[]
        > = {};

        // Add the primary milestone
        if (!milestonesByChain[milestone.chainID]) {
          milestonesByChain[milestone.chainID] = [];
        }
        milestonesByChain[milestone.chainID].push({
          grantId: milestone.refUID,
          milestoneId: milestone.id,
        });

        // Add all merged grant milestones
        if (milestone.mergedGrants) {
          milestone.mergedGrants.forEach((grant) => {
            const grantMilestone = milestone.source.grantMilestone;
            if (!grantMilestone) return;

            const chainId = grantMilestone.grant.chainID;
            if (!milestonesByChain[chainId]) {
              milestonesByChain[chainId] = [];
            }

            milestonesByChain[chainId].push({
              grantId: grant.grantId,
              milestoneId: milestone.id,
            });
          });
        }

        // Process each chain's milestones separately
        for (const [chainIdStr, chainMilestones] of Object.entries(
          milestonesByChain
        )) {
          const chainId = Number(chainIdStr);

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
          const fetchedProject = await gapClient.fetch.projectById(
            project?.uid
          );
          if (!fetchedProject) continue;

          // Process the milestones in this chain
          const attestationsToRevoke = [];

          for (const { grantId, milestoneId } of chainMilestones) {
            const grantInstance = fetchedProject.grants.find(
              (g) => g.uid.toLowerCase() === grantId.toLowerCase()
            );

            if (!grantInstance) continue;

            const milestoneInstance = grantInstance.milestones.find(
              (u) => u.uid.toLowerCase() === milestoneId.toLowerCase()
            );

            if (!milestoneInstance) continue;

            // Add the milestone to the revocation list
            attestationsToRevoke.push({
              schemaId: milestoneInstance.schema.uid,
              uid: milestoneInstance.uid,
            });

            // If milestone is completed, also revoke the completion
            if (milestoneInstance.completed) {
              attestationsToRevoke.push({
                schemaId: milestoneInstance.completed.schema.uid,
                uid: milestoneInstance.completed.uid,
              });
            }
          }

          if (attestationsToRevoke.length > 0) {
            // Use the first milestone's schema to revoke all attestations
            const milestoneInstance = fetchedProject.grants
              .find(
                (g) =>
                  g.uid.toLowerCase() ===
                  chainMilestones[0].grantId.toLowerCase()
              )
              ?.milestones.find(
                (u) =>
                  u.uid.toLowerCase() ===
                  chainMilestones[0].milestoneId.toLowerCase()
              );

            if (milestoneInstance) {
              // Revoke all attestations in a single transaction
              const result = await milestoneInstance.revokeMultipleAttestations(
                walletSigner,
                attestationsToRevoke,
                changeStepperStep
              );

              // Notify indexer for each transaction
              if (result.tx.length > 0) {
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
            }
          }
        }

        // Poll for indexing completion
        changeStepperStep("indexing");

        // Wait for the indexer to catch up
        await new Promise((resolve) => setTimeout(resolve, 5000));

        // Refresh the project to see the changes
        await refreshProject();

        toast.success("All milestone instances deleted successfully");
        changeStepperStep("indexed");

        // Reload the page to reflect the changes
        router.refresh();
      } else {
        // Handle single milestone deletion
        let gapClient = gap;

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
          (u) => u.uid.toLowerCase() === milestone.id.toLowerCase()
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

        // If the milestone is completed, also revoke the completion
        if (milestoneInstance.completed) {
          attestationsToRevoke.push({
            schemaId: milestoneInstance.completed.schema.uid,
            uid: milestoneInstance.completed.uid,
          });
        }

        // Revoke the milestone
        const result = await milestoneInstance.revokeMultipleAttestations(
          walletSigner,
          attestationsToRevoke,
          changeStepperStep
        );

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

        // Wait for the indexer to catch up
        await new Promise((resolve) => setTimeout(resolve, 5000));

        // Refresh the project to see the changes
        await refreshProject();

        toast.success("Milestone deleted successfully");
        changeStepperStep("indexed");

        // Reload the page to reflect the changes
        router.refresh();
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

  return (
    <>
      <Menu as="div" className="relative inline-block text-left">
        <div>
          <Menu.Button className="w-max bg-transparent hover:bg-zinc-100 hover:dark:bg-zinc-800 text-black dark:text-white p-0 rounded-lg">
            <EllipsisVerticalIcon
              className="h-6 w-6 text-zinc-500"
              aria-hidden="true"
            />
          </Menu.Button>
        </div>
        <Transition
          as={Fragment}
          enter="transition ease-out duration-100"
          enterFrom="transform opacity-0 scale-95"
          enterTo="transform opacity-100 scale-100"
          leave="transition ease-in duration-75"
          leaveFrom="transform opacity-100 scale-100"
          leaveTo="transform opacity-0 scale-95"
        >
          <Menu.Items
            modal
            className="absolute right-0 mt-2 w-48 origin-top-right divide-y divide-gray-100 rounded-md bg-white dark:bg-zinc-800 shadow-lg ring-1 ring-black/5 focus:outline-none z-50"
          >
            <div className="flex flex-col gap-1 px-1 py-1">
              <Menu.Item>
                <Button
                  className={buttonClassName}
                  onClick={() => completeFn(true)}
                  disabled={alreadyCompleted}
                >
                  <CheckCircleIcon className="w-5 h-5" />
                  Mark as Complete
                </Button>
              </Menu.Item>
              <Menu.Item>
                <DeleteDialog
                  title={
                    milestone.mergedGrants && milestone.mergedGrants.length > 1
                      ? "Are you sure you want to delete all instances of this milestone?"
                      : "Are you sure you want to delete this milestone?"
                  }
                  deleteFunction={handleDelete}
                  isLoading={isDeleting}
                  buttonElement={{
                    icon: (
                      <TrashIcon
                        className={"h-5 w-5 text-[#D92D20] dark:text-red-500"}
                        aria-hidden="true"
                      />
                    ),
                    text:
                      milestone.mergedGrants &&
                      milestone.mergedGrants.length > 1
                        ? "Delete All Instances"
                        : "Delete",
                    styleClass: cn(
                      buttonClassName,
                      "text-[#D92D20] dark:text-red-500"
                    ),
                  }}
                />
              </Menu.Item>
            </div>
          </Menu.Items>
        </Transition>
      </Menu>
    </>
  );
};
