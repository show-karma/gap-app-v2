import { Milestone } from "@show-karma/karma-gap-sdk";
import { useRouter } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";
import { useAccount } from "wagmi";
import { errorManager } from "@/components/Utilities/errorManager";
import { useGap } from "@/hooks/useGap";
import { useProjectGrants } from "@/hooks/v2/useProjectGrants";
import { getProjectGrants } from "@/services/project-grants.service";
import { useOwnerStore, useProjectStore } from "@/store";
import { useProgressModal } from "@/store/modals/progressModal";
import { useSetupChainAndWallet } from "@/hooks/useSetupChainAndWallet";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";
import { MESSAGES } from "@/utilities/messages";
import { sanitizeObject } from "@/utilities/sanitize";
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
  const { project } = useProjectStore();
  const projectIdOrSlug = project?.details?.slug || project?.uid || "";
  const { switchChainAsync } = useWallet();
  const { setupChainAndWallet, smartWalletAddress } = useSetupChainAndWallet();
  const _isOwner = useOwnerStore((state) => state.isOwner);

  const { gap } = useGap();
  const [isLoading, setIsLoading] = useState(false);
  const { showLoading, showSuccess, close: closeProgressModal } = useProgressModal();
  const router = useRouter();

  // Fetch grants using dedicated hook
  const { grants, refetch: refetchGrants } = useProjectGrants(projectIdOrSlug);

  const createMilestoneForGrants = async (data: GrantMilestoneFormData, grantUIDs: string[]) => {
    if (!gap || !address || grantUIDs.length === 0) return;
    setIsLoading(true);

    try {
      // Process each grant UID
      for (const grantUID of grantUIDs) {
        // Get the current grant's chain ID from the project's grants
        const grant = grants.find((g) => g.uid === grantUID);
        if (!grant) continue;

        const chainID = grant.chainID;

        // Setup chain and get gasless signer
        const setup = await setupChainAndWallet({
          targetChainId: chainID,
          currentChainId: chain?.id,
          switchChainAsync,
        });

        if (!setup) {
          setIsLoading(false);
          return;
        }

        const { walletSigner, gapClient, chainId: actualChainId } = setup;

        // Prepare milestone data
        const milestone = sanitizeObject({
          title: data.title,
          description: data.description || "",
          endsAt: data.dates.endsAt.getTime() / 1000,
          startsAt: data.dates.startsAt ? data.dates.startsAt.getTime() / 1000 : undefined,
          priority: data.priority,
        });

        const milestoneToAttest = new Milestone({
          refUID: grantUID as `0x${string}`,
          schema: gapClient.findSchema("Milestone"),
          recipient: (smartWalletAddress || address) as `0x${string}`,
          data: milestone,
        });

        // Attest the milestone
        await milestoneToAttest.attest(walletSigner as any).then(async (res) => {
          let retries = 1000;
          const txHash = res?.tx[0]?.hash;

          if (txHash) {
            await fetchData(
              INDEXER.ATTESTATION_LISTENER(txHash, milestoneToAttest.chainID),
              "POST",
              {}
            );
          }

          showLoading("Indexing milestone...");

          while (retries > 0) {
            try {
              const fetchedGrants = await getProjectGrants(projectIdOrSlug);
              const fetchedGrant = fetchedGrants.find((g) => g.uid === grantUID);

              const milestoneExists = fetchedGrant?.milestones?.find(
                (m) => m.uid === milestoneToAttest.uid
              );

              if (milestoneExists) {
                retries = 0;
                await refetchGrants();
                showSuccess("Milestone created!");
                toast.success(MESSAGES.MILESTONES.CREATE.SUCCESS);

                // Only navigate on the last grant milestone creation
                if (grantUID === grantUIDs[grantUIDs.length - 1] && destinationPath) {
                  setTimeout(() => {
                    closeProgressModal();
                    router.push(destinationPath);
                    router.refresh();
                  }, 1500);
                }
              }
            } catch {
              // Ignore polling errors, continue retrying
            }
            retries -= 1;
            // eslint-disable-next-line no-await-in-loop, no-promise-executor-return
            await new Promise((resolve) => setTimeout(resolve, 1500));
          }
        });
      }

      // Call onSuccess after all grant milestones are created
      onSuccess?.();
    } catch (error) {
      closeProgressModal();
      errorManager(MESSAGES.MILESTONES.CREATE.ERROR(data.title), error, {
        data,
        address,
        grantUIDs,
      });
      toast.error(MESSAGES.MILESTONES.CREATE.ERROR(data.title));
    } finally {
      setIsLoading(false);
    }
  };

  // Simplified version for single grant
  const createMilestone = async (data: GrantMilestoneFormData, grantUID: string) => {
    return createMilestoneForGrants(data, [grantUID]);
  };

  return {
    createMilestone,
    createMilestoneForGrants,
    isLoading,
  };
}
