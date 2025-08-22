"use client";
import { useState } from "react";
import { IGrantResponse } from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";
import { getGapClient, useGap } from "./useGap";
import { useAccount } from "wagmi";
import { getProjectById } from "@/utilities/sdk";
import { sanitizeObject } from "@/utilities/sanitize";
import { safeGetWalletClient } from "@/utilities/wallet-helpers";
import { walletClientToSigner } from "@/utilities/eas-wagmi-utils";
import { INDEXER } from "@/utilities/indexer";
import fetchData from "@/utilities/fetchData";
import { gapIndexerApi } from "@/utilities/gapIndexerApi";
import { MESSAGES } from "@/utilities/messages";
import toast from "react-hot-toast";
import { errorManager } from "@/components/Utilities/errorManager";
import { useStepper } from "@/store/modals/txStepper";
import { useProjectStore } from "@/store";
import { useRouter } from "next/navigation";
import { PAGES } from "@/utilities/pages";
import { useGrantFormStore } from "@/components/Pages/GrantMilestonesAndUpdates/screens/NewGrant/store";
import { useWallet } from "./useWallet";
import { ensureCorrectChain } from "@/utilities/ensureCorrectChain";

export function useGrant() {
  const [isLoading, setIsLoading] = useState(false);
  const { gap } = useGap();
  const { address, chain } = useAccount();
  const { switchChainAsync } = useWallet();
  const { changeStepperStep, setIsStepper } = useStepper();
  const selectedProject = useProjectStore((state) => state.project);
  const refreshProject = useProjectStore((state) => state.refreshProject);
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
  const updateGrant = async (
    oldGrant: IGrantResponse,
    data: Partial<typeof formData>
  ) => {
    if (!address || !oldGrant?.refUID || !selectedProject) return;
    let gapClient = gap;
    try {
      setIsLoading(true);
      setIsStepper(true);

      const { success, chainId: actualChainId, gapClient } = await ensureCorrectChain({
        targetChainId: oldGrant.chainID,
        currentChainId: chain?.id,
        switchChainAsync,
      });

      if (!success || !gapClient) {
        setIsLoading(false);
        return;
      }

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
        selectedTrackIds:
          data.selectedTrackIds || formData.selectedTrackIds || [],
      });

      oldGrantInstance.details?.setValues(grantData);

      const { walletClient, error } = await safeGetWalletClient(
        actualChainId
      );

      if (error || !walletClient || !gapClient) {
        throw new Error("Failed to connect to wallet", { cause: error });
      }
      if (!walletClient) return;

      const walletSigner = await walletClientToSigner(walletClient);
      const oldProjectData = await gapIndexerApi
        .projectBySlug(oldGrant.refUID)
        .then((res) => res.data);
      const oldGrantData = oldProjectData?.grants?.find(
        (item) => item.uid.toLowerCase() === oldGrant.uid.toLowerCase()
      );

      await oldGrantInstance.details
        ?.attest(walletSigner as any, changeStepperStep)
        .then(async (res) => {
          let retries = 1000;
          changeStepperStep("indexing");
          const txHash = res?.tx[0]?.hash;
          if (txHash) {
            await fetchData(
              INDEXER.ATTESTATION_LISTENER(txHash, oldGrant.chainID),
              "POST",
              {}
            );
          }
          while (retries > 0) {
            const fetchedProject = await gapIndexerApi
              .projectBySlug(oldGrant.refUID)
              .then((res) => res.data)
              .catch(() => null);
            const fetchedGrant = fetchedProject?.grants.find(
              (item) => item.uid.toLowerCase() === oldGrant.uid.toLowerCase()
            );

            if (
              new Date(fetchedGrant?.details?.updatedAt) >
              new Date(oldGrantData?.details?.updatedAt)
            ) {
              clearMilestonesForms();
              // Reset form data and go back to step 1 for a new grant
              resetFormData();
              setFormPriorities([]);
              setCurrentStep(1);
              setFlowType("grant"); // Reset to default flow type
              retries = 0;
              toast.success(MESSAGES.GRANT.UPDATE.SUCCESS);
              changeStepperStep("indexed");
              await refreshProject().then(() => {
                router.push(
                  PAGES.PROJECT.GRANT(
                    selectedProject.details?.data?.slug || selectedProject.uid,
                    oldGrant.uid
                  )
                );
                router.refresh();
              });
            }
            retries -= 1;
            // eslint-disable-next-line no-await-in-loop, no-promise-executor-return
            await new Promise((resolve) => setTimeout(resolve, 1500));
          }
        });
    } catch (error: any) {
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
      setIsStepper(false);
    }
  };

  return {
    updateGrant,
    isLoading,
  };
}
