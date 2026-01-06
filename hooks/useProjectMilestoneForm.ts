import { ProjectMilestone } from "@show-karma/karma-gap-sdk/core/class/entities/ProjectMilestone";
import type { IProjectMilestoneResponse } from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";
import { useAccount } from "wagmi";
import { errorManager } from "@/components/Utilities/errorManager";
import { useGap } from "@/hooks/useGap";
import { useProjectStore } from "@/store";
import { useStepper } from "@/store/modals/txStepper";
import { walletClientToSigner } from "@/utilities/eas-wagmi-utils";
import { ensureCorrectChain } from "@/utilities/ensureCorrectChain";
import fetchData from "@/utilities/fetchData";
import { getProjectObjectives } from "@/utilities/gapIndexerApi/getProjectObjectives";
import { INDEXER } from "@/utilities/indexer";
import { MESSAGES } from "@/utilities/messages";
import { sanitizeInput, sanitizeObject } from "@/utilities/sanitize";
import { safeGetWalletClient } from "@/utilities/wallet-helpers";
import { useWallet } from "./useWallet";

export interface ProjectMilestoneFormData {
  title: string;
  text: string;
}

interface UseProjectMilestoneFormProps {
  previousMilestone?: IProjectMilestoneResponse;
  onSuccess?: () => void;
}

export function useProjectMilestoneForm({
  previousMilestone,
  onSuccess,
}: UseProjectMilestoneFormProps = {}) {
  const { address, chain } = useAccount();
  const { project } = useProjectStore();
  const { switchChainAsync } = useWallet();
  const params = useParams();
  const projectId = params.projectId as string;
  const isEditing = !!previousMilestone;

  const { gap } = useGap();
  const [isLoading, setIsLoading] = useState(false);
  const { changeStepperStep, setIsStepper } = useStepper();

  const { refetch } = useQuery<IProjectMilestoneResponse[]>({
    queryKey: ["projectMilestones"],
    queryFn: () => getProjectObjectives(projectId),
  });

  const createMilestone = async (data: ProjectMilestoneFormData) => {
    if (!gap) return;
    let gapClient = gap;
    setIsLoading(true);
    try {
      const {
        success,
        chainId: actualChainId,
        gapClient: newGapClient,
      } = await ensureCorrectChain({
        targetChainId: project?.chainID as number,
        currentChainId: chain?.id,
        switchChainAsync,
      });

      if (!success) {
        setIsLoading(false);
        return;
      }

      gapClient = newGapClient;

      const newMilestone = new ProjectMilestone({
        data: sanitizeObject({
          title: data.title,
          text: data.text,
          type: "project-milestone",
        }),
        schema: gapClient.findSchema("ProjectMilestone"),
        refUID: project?.uid,
        recipient: (address as `0x${string}`) || "0x00",
      });

      const { walletClient, error } = await safeGetWalletClient(actualChainId);

      if (error || !walletClient || !gapClient) {
        throw new Error("Failed to connect to wallet", { cause: error });
      }

      const walletSigner = await walletClientToSigner(walletClient);
      const sanitizedData = {
        title: sanitizeInput(data.title),
        text: sanitizeInput(data.text),
      };

      await newMilestone
        .attest(walletSigner as any, sanitizedData, changeStepperStep)
        .then(async (res) => {
          const _fetchedMilestones = null;
          const txHash = res?.tx[0]?.hash;
          if (txHash) {
            await fetchData(
              INDEXER.ATTESTATION_LISTENER(txHash, project?.chainID as number),
              "POST",
              {}
            );
          } else {
            await fetchData(
              INDEXER.ATTESTATION_LISTENER(newMilestone.uid, project?.chainID as number),
              "POST",
              {}
            );
          }

          let retries = 5;
          changeStepperStep("indexing");

          while (retries > 0) {
            await getProjectObjectives(projectId)
              .then(async (fetchedMilestones) => {
                const attestUID = newMilestone.uid;
                const alreadyExists = fetchedMilestones.find((m) => m.uid === attestUID);

                if (alreadyExists) {
                  retries = 0;
                  changeStepperStep("indexed");
                  toast.success(MESSAGES.PROJECT_OBJECTIVE_FORM.SUCCESS);
                  await refetch();
                  onSuccess?.();
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
    } catch (error) {
      errorManager(MESSAGES.PROJECT_OBJECTIVE_FORM.ERROR, error, {
        data,
        address,
        project: project?.uid,
      });
      toast.error(MESSAGES.PROJECT_OBJECTIVE_FORM.ERROR);
    } finally {
      setIsLoading(false);
      setIsStepper(false);
    }
  };

  const updateMilestone = async (data: ProjectMilestoneFormData) => {
    if (!gap || !previousMilestone) return;
    let gapClient = gap;
    setIsLoading(true);

    try {
      const {
        success,
        chainId: actualChainId,
        gapClient: newGapClient,
      } = await ensureCorrectChain({
        targetChainId: project?.chainID as number,
        currentChainId: chain?.id,
        switchChainAsync,
      });

      if (!success) {
        setIsLoading(false);
        return;
      }

      gapClient = newGapClient;

      const { walletClient, error } = await safeGetWalletClient(actualChainId);

      if (error || !walletClient || !gapClient) {
        throw new Error("Failed to connect to wallet", { cause: error });
      }

      const walletSigner = await walletClientToSigner(walletClient);
      const sanitizedData = {
        title: sanitizeInput(data.title),
        text: sanitizeInput(data.text),
      };

      const fetchedMilestones = await getProjectObjectives(projectId);

      if (!fetchedMilestones || !gapClient?.network) return;

      const milestonesInstances = ProjectMilestone.from(fetchedMilestones, gapClient?.network);

      const milestoneInstance = milestonesInstances.find(
        (item) => item.uid.toLowerCase() === previousMilestone?.uid.toLowerCase()
      );

      if (!milestoneInstance) return;

      milestoneInstance.setValues(sanitizedData);

      await milestoneInstance
        .attest(walletSigner as any, sanitizedData, changeStepperStep)
        .then(async (res) => {
          const _fetchedMilestones = null;
          const txHash = res?.tx[0]?.hash;

          if (txHash) {
            await fetchData(
              INDEXER.ATTESTATION_LISTENER(txHash, project?.chainID as number),
              "POST",
              {}
            );
          } else {
            await fetchData(
              INDEXER.ATTESTATION_LISTENER(milestoneInstance.uid, project?.chainID as number),
              "POST",
              {}
            );
          }

          let retries = 5;
          changeStepperStep("indexing");

          while (retries > 0) {
            await getProjectObjectives(projectId)
              .then(async (fetchedMilestones) => {
                const attestUID = milestoneInstance.uid;
                const alreadyExists = fetchedMilestones.find((m) => m.uid === attestUID);

                if (alreadyExists) {
                  retries = 0;
                  changeStepperStep("indexed");
                  toast.success(MESSAGES.PROJECT_OBJECTIVE_FORM.EDIT.SUCCESS);
                  await refetch();
                  onSuccess?.();
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
    } catch (error) {
      errorManager(MESSAGES.PROJECT_OBJECTIVE_FORM.EDIT.ERROR, error, {
        data,
        address,
        project: project?.uid,
      });
      toast.error(MESSAGES.PROJECT_OBJECTIVE_FORM.EDIT.ERROR);
    } finally {
      setIsLoading(false);
      setIsStepper(false);
    }
  };

  const submitMilestone = async (data: ProjectMilestoneFormData) => {
    if (isEditing) {
      await updateMilestone(data);
    } else {
      await createMilestone(data);
    }
  };

  return {
    submitMilestone,
    createMilestone,
    updateMilestone,
    isLoading,
    isEditing,
  };
}
