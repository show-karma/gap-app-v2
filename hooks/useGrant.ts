"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";
import { useAccount } from "wagmi";
import { useGrantFormStore } from "@/components/Pages/GrantMilestonesAndUpdates/screens/NewGrant/store";
import { errorManager } from "@/components/Utilities/errorManager";
import { useProjectGrants } from "@/hooks/v2/useProjectGrants";
import { getProjectGrants } from "@/services/project-grants.service";
import { useProjectStore } from "@/store";
import { useProgressModal } from "@/store/modals/progressModal";
import type { Grant } from "@/types/v2/grant";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";
import { MESSAGES } from "@/utilities/messages";
import { PAGES } from "@/utilities/pages";
import { sanitizeObject } from "@/utilities/sanitize";
import { getProjectById } from "@/utilities/sdk";
import { useGap } from "./useGap";
import { useSetupChainAndWallet } from "./useSetupChainAndWallet";
import { useWallet } from "./useWallet";

export function useGrant() {
  const [isLoading, setIsLoading] = useState(false);
  const { gap } = useGap();
  const { address, chain } = useAccount();
  const { switchChainAsync } = useWallet();
  const { setupChainAndWallet } = useSetupChainAndWallet();
  const { showLoading, showSuccess, close: closeProgressModal } = useProgressModal();
  const selectedProject = useProjectStore((state) => state.project);
  const { refetch: refetchGrants } = useProjectGrants(selectedProject?.uid || "");
  const router = useRouter();
  const {
    clearMilestonesForms,
    resetFormData,
    setFormPriorities,
    setCurrentStep,
    setFlowType,
    formData,
    communityNetworkId,
  } = useGrantFormStore();

  /**
   * Updates an existing grant
   * @param oldGrant The grant to update
   * @param data The updated data
   */
  const updateGrant = async (oldGrant: Grant, data: Partial<typeof formData>) => {
    if (!address || !oldGrant?.refUID || !selectedProject) return;
    try {
      setIsLoading(true);

      const setup = await setupChainAndWallet({
        targetChainId: oldGrant.chainID,
        currentChainId: chain?.id,
        switchChainAsync,
      });

      if (!setup) {
        setIsLoading(false);
        return;
      }

      const { gapClient, walletSigner } = setup;

      const projectInstance = await getProjectById(oldGrant.refUID);
      const oldGrantInstance = projectInstance?.grants?.find(
        (item) => item?.uid?.toLowerCase() === oldGrant?.uid?.toLowerCase()
      );
      if (!oldGrantInstance) return;

      oldGrantInstance.setValues({
        communityUID: data.community,
      });

      const grantData = sanitizeObject({
        ...oldGrantInstance.details?.data,
        ...data,
        proposalURL: data.linkToProposal,
        payoutAddress: address,
        startDate: data.startDate
          ? new Date(data.startDate).getTime() / 1000
          : oldGrantInstance.details?.startDate,
        selectedTrackIds: data.selectedTrackIds || formData.selectedTrackIds || [],
      });

      oldGrantInstance.details?.setValues(grantData);

      const oldGrants = await getProjectGrants(oldGrant.refUID).catch(() => []);
      const oldGrantData = oldGrants?.find(
        (item) => item.uid.toLowerCase() === oldGrant.uid.toLowerCase()
      );

      await oldGrantInstance.details?.attest(walletSigner as any).then(async (res) => {
        let retries = 1000;
        const txHash = res?.tx[0]?.hash;
        if (txHash) {
          await fetchData(INDEXER.ATTESTATION_LISTENER(txHash, oldGrant.chainID), "POST", {});
        }
        showLoading("Indexing grant...");
        while (retries > 0) {
          const fetchedGrants = await getProjectGrants(
            oldGrant.refUID || oldGrant.projectUID || ""
          ).catch(() => []);
          const fetchedGrant = fetchedGrants?.find(
            (item) => item.uid.toLowerCase() === oldGrant.uid.toLowerCase()
          );

          if (new Date(fetchedGrant?.updatedAt || 0) > new Date(oldGrantData?.updatedAt || 0)) {
            clearMilestonesForms();
            // Reset form data and go back to step 1 for a new grant
            resetFormData();
            setFormPriorities([]);
            setCurrentStep(1);
            setFlowType("grant"); // Reset to default flow type
            retries = 0;
            toast.success(MESSAGES.GRANT.UPDATE.SUCCESS);
            showSuccess("Grant updated!");
            await refetchGrants().then(() => {
              setTimeout(() => {
                closeProgressModal();
                router.push(
                  PAGES.PROJECT.GRANT(
                    selectedProject.details?.slug || selectedProject.uid,
                    oldGrant.uid
                  )
                );
                router.refresh();
              }, 1500);
            });
          }
          retries -= 1;
          // eslint-disable-next-line no-await-in-loop, no-promise-executor-return
          await new Promise((resolve) => setTimeout(resolve, 1500));
        }
      });
    } catch (error: any) {
      closeProgressModal();
      errorManager(
        MESSAGES.GRANT.UPDATE.ERROR,
        error,
        {
          grantUID: oldGrant.uid,
          projectUID: selectedProject.uid,
          address,
        },
        { error: MESSAGES.GRANT.UPDATE.ERROR }
      );
    } finally {
      setIsLoading(false);
    }
  };

  return {
    updateGrant,
    isLoading,
  };
}
