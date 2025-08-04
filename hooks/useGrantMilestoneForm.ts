import { useState } from "react";
import { useAccount } from "wagmi";
import { useOwnerStore, useProjectStore } from "@/store";
import { getGapClient, useGap } from "@/hooks/useGap";
import { Milestone } from "@show-karma/karma-gap-sdk";
import { walletClientToSigner } from "@/utilities/eas-wagmi-utils";
import { useStepper } from "@/store/modals/txStepper";
import { sanitizeObject } from "@/utilities/sanitize";
import toast from "react-hot-toast";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";
import { useRouter } from "next/navigation";
import { PAGES } from "@/utilities/pages";
import { checkNetworkIsValid } from "@/utilities/checkNetworkIsValid";
import { Hex } from "viem";
import { errorManager } from "@/components/Utilities/errorManager";
import { MESSAGES } from "@/utilities/messages";
import { safeGetWalletClient } from "@/utilities/wallet-helpers";
import { useWallet } from "./useWallet";

export interface GrantMilestoneFormData {
  title: string;
  description?: string;
  priority?: number;
  dates: {
    endsAt: Date;
    startsAt?: Date;
  };
}

interface UseGrantMilestoneFormProps {
  onSuccess?: () => void;
  destinationPath?: string; // Where to redirect after success
}

export function useGrantMilestoneForm({
  onSuccess,
  destinationPath,
}: UseGrantMilestoneFormProps = {}) {
  const { address, chain } = useAccount();
  const { project, refreshProject } = useProjectStore();
  const { switchChainAsync } = useWallet();
  const isOwner = useOwnerStore((state) => state.isOwner);

  const { gap } = useGap();
  const [isLoading, setIsLoading] = useState(false);
  const { changeStepperStep, setIsStepper } = useStepper();
  const router = useRouter();

  const createMilestoneForGrants = async (
    data: GrantMilestoneFormData,
    grantUIDs: string[]
  ) => {
    if (!gap || !address || grantUIDs.length === 0) return;
    setIsLoading(true);

    try {
      // Process each grant UID
      for (const grantUID of grantUIDs) {
        // Get the current grant's chain ID from the project's grants
        const grant = project?.grants.find((g) => g.uid === grantUID);
        if (!grant) continue;

        const chainID = grant.chainID;

        let gapClient = gap;

        // Switch chain if needed
        if (!checkNetworkIsValid(chain?.id) || chain?.id !== chainID) {
          await switchChainAsync?.({ chainId: chainID });
          gapClient = getGapClient(chainID);
        }

        // Prepare milestone data
        const milestone = sanitizeObject({
          title: data.title,
          description: data.description || "",
          endsAt: data.dates.endsAt.getTime() / 1000,
          startsAt: data.dates.startsAt
            ? data.dates.startsAt.getTime() / 1000
            : undefined,
          priority: data.priority,
        });

        const milestoneToAttest = new Milestone({
          refUID: grantUID as `0x${string}`,
          schema: gapClient.findSchema("Milestone"),
          recipient: address as `0x${string}`,
          data: milestone,
        });

        // Get wallet client safely
        const { walletClient, error } = await safeGetWalletClient(chainID);

        if (error || !walletClient || !gapClient) {
          throw new Error("Failed to connect to wallet", { cause: error });
        }

        const walletSigner = await walletClientToSigner(walletClient);

        // Attest the milestone
        await milestoneToAttest
          .attest(walletSigner as any, changeStepperStep)
          .then(async (res) => {
            let retries = 1000;
            const txHash = res?.tx[0]?.hash;

            if (txHash) {
              await fetchData(
                INDEXER.ATTESTATION_LISTENER(txHash, milestoneToAttest.chainID),
                "POST",
                {}
              );
            }

            changeStepperStep("indexing");

            while (retries > 0) {
              await refreshProject()
                .then(async (fetchedProject) => {
                  const fetchedGrant = fetchedProject?.grants.find(
                    (g) => g.uid === grantUID
                  );

                  const milestoneExists = fetchedGrant?.milestones.find(
                    (g: any) => g.uid === milestoneToAttest.uid
                  );

                  if (milestoneExists) {
                    retries = 0;
                    changeStepperStep("indexed");
                    toast.success(MESSAGES.MILESTONES.CREATE.SUCCESS);

                    // Only navigate on the last grant milestone creation
                    if (
                      grantUID === grantUIDs[grantUIDs.length - 1] &&
                      destinationPath
                    ) {
                      router.push(destinationPath);
                      router.refresh();
                    }
                  }

                  retries -= 1;
                  // eslint-disable-next-line no-await-in-loop, no-promise-executor-return
                  await new Promise((resolve) => setTimeout(resolve, 1500));
                })
                .catch(async () => {
                  retries -= 1;
                  // eslint-disable-next-line no-await-in-loop, no-promise-executor-return
                  await new Promise((resolve) => setTimeout(resolve, 1500));
                });
            }
          });
      }

      // Call onSuccess after all grant milestones are created
      onSuccess?.();
    } catch (error) {
      errorManager(MESSAGES.MILESTONES.CREATE.ERROR(data.title), error, {
        data,
        address,
        grantUIDs,
      });
      toast.error(MESSAGES.MILESTONES.CREATE.ERROR(data.title));
    } finally {
      setIsLoading(false);
      setIsStepper(false);
    }
  };

  // Simplified version for single grant
  const createMilestone = async (
    data: GrantMilestoneFormData,
    grantUID: string
  ) => {
    return createMilestoneForGrants(data, [grantUID]);
  };

  return {
    createMilestone,
    createMilestoneForGrants,
    isLoading,
  };
}
