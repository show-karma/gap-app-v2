import { TrashIcon } from "@heroicons/react/24/outline";
import { ProjectMilestone } from "@show-karma/karma-gap-sdk/core/class/entities/ProjectMilestone";
import type { IProjectMilestoneResponse } from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";
import { useQuery } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import { useParams } from "next/navigation";
import { useAccount } from "wagmi";
import { Button } from "@/components/Utilities/Button";
import { ExternalLink } from "@/components/Utilities/ExternalLink";
import { errorManager } from "@/components/Utilities/errorManager";
import { useAttestationToast } from "@/hooks/useAttestationToast";
import { useOffChainRevoke } from "@/hooks/useOffChainRevoke";
import { useSetupChainAndWallet } from "@/hooks/useSetupChainAndWallet";
import { useWallet } from "@/hooks/useWallet";
import { useOwnerStore, useProjectStore } from "@/store";
import fetchData from "@/utilities/fetchData";
import { getProjectObjectives } from "@/utilities/gapIndexerApi/getProjectObjectives";
import { INDEXER } from "@/utilities/indexer";
import { MESSAGES } from "@/utilities/messages";
import { ReadMore } from "@/utilities/ReadMore";
import { retryUntilConditionMet } from "@/utilities/retries";
import { getProjectById } from "@/utilities/sdk";

const ProjectObjectiveCompletion = dynamic(
  () =>
    import("@/components/Forms/ProjectObjectiveCompletion").then(
      (mod) => mod.ProjectObjectiveCompletionForm
    ),
  {
    ssr: false,
  }
);

export const ObjectiveCardComplete = ({
  objective,
  isCompleting,
  handleCompleting,
}: {
  objective: IProjectMilestoneResponse;
  isCompleting: boolean;
  handleCompleting: (isCompleting: boolean) => void;
}) => {
  const isProjectAdmin = useProjectStore((state) => state.isProjectAdmin);
  const isContractOwner = useOwnerStore((state) => state.isOwner);
  const isAuthorized = isProjectAdmin || isContractOwner;
  const { isProjectOwner } = useProjectStore();
  const isOnChainAuthorized = isProjectOwner || isContractOwner;

  const { startAttestation, showSuccess, showError, changeStepperStep, setIsStepper } =
    useAttestationToast();
  const { chain, address } = useAccount();
  const { switchChainAsync } = useWallet();
  const { setupChainAndWallet } = useSetupChainAndWallet();
  const { performOffChainRevoke } = useOffChainRevoke();

  const params = useParams();
  const projectId = params.projectId as string;

  const { refetch } = useQuery<IProjectMilestoneResponse[]>({
    queryKey: ["projectMilestones"],
    queryFn: () => getProjectObjectives(projectId),
  });

  const deleteObjectiveCompletion = async () => {
    startAttestation("Removing milestone completion...");
    try {
      const setup = await setupChainAndWallet({
        targetChainId: objective.chainID,
        currentChainId: chain?.id,
        switchChainAsync,
      });

      if (!setup) {
        return;
      }

      const { gapClient, walletSigner } = setup;
      const fetchedProject = await getProjectById(projectId);
      if (!fetchedProject) return;
      const fetchedMilestones = await getProjectObjectives(projectId);
      if (!fetchedMilestones || !gapClient?.network) return;
      const objectivesInstances = ProjectMilestone.from(fetchedMilestones, gapClient?.network);
      const objectiveInstance = objectivesInstances.find(
        (item) => item.uid.toLowerCase() === objective.uid.toLowerCase()
      );
      if (!objectiveInstance) return;

      const checkIfAttestationExists = async (callbackFn?: () => void) => {
        await retryUntilConditionMet(
          async () => {
            const fetchedObjectives = await getProjectObjectives(projectId);
            const stillExists = fetchedObjectives.find(
              (item) => item.uid.toLowerCase() === objective.uid.toLowerCase()
            )?.completed;

            return !stillExists;
          },
          async () => {
            callbackFn?.();
            await refetch();
          }
        );
      };

      if (!isOnChainAuthorized) {
        await performOffChainRevoke({
          uid: objectiveInstance.completed?.uid as `0x${string}`,
          chainID: objectiveInstance.chainID,
          checkIfExists: checkIfAttestationExists,
          toastMessages: {
            success: MESSAGES.PROJECT_OBJECTIVE_FORM.COMPLETE.DELETE.SUCCESS,
            loading: MESSAGES.PROJECT_OBJECTIVE_FORM.COMPLETE.DELETE.LOADING,
          },
        });
      } else {
        try {
          const res = await objectiveInstance.revokeCompletion(
            walletSigner as any,
            changeStepperStep
          );
          changeStepperStep("indexing");
          const txHash = res?.tx[0]?.hash;
          if (txHash) {
            await fetchData(
              INDEXER.ATTESTATION_LISTENER(txHash, objectiveInstance.chainID),
              "POST",
              {}
            );
          }
          await checkIfAttestationExists(() => {
            changeStepperStep("indexed");
          });
          showSuccess(MESSAGES.PROJECT_OBJECTIVE_FORM.COMPLETE.DELETE.SUCCESS);
        } catch (onChainError: any) {
          // Silently fallback to off-chain revoke
          setIsStepper(false); // Reset stepper since we're falling back

          const success = await performOffChainRevoke({
            uid: objectiveInstance.completed?.uid as `0x${string}`,
            chainID: objectiveInstance.chainID,
            checkIfExists: checkIfAttestationExists,
            toastMessages: {
              success: MESSAGES.PROJECT_OBJECTIVE_FORM.COMPLETE.DELETE.SUCCESS,
              loading: MESSAGES.PROJECT_OBJECTIVE_FORM.COMPLETE.DELETE.LOADING,
            },
          });

          if (!success) {
            // Both methods failed - throw the original error to maintain expected behavior
            throw onChainError;
          }
        }
      }
    } catch (error: any) {
      showError(MESSAGES.PROJECT_OBJECTIVE_FORM.COMPLETE.DELETE.ERROR);
      errorManager(
        MESSAGES.PROJECT_OBJECTIVE_FORM.COMPLETE.DELETE.ERROR,
        error,
        {
          objectiveUID: objective.uid,
          projectUID: objective.refUID,
          address,
        },
        { error: MESSAGES.PROJECT_OBJECTIVE_FORM.COMPLETE.DELETE.ERROR }
      );
    } finally {
      setIsStepper(false);
    }
  };

  if (objective.completed) {
    return (
      <div className="rounded-xl gap-6 flex flex-col items-start justify-start w-full">
        <div className="flex flex-col items-start w-full gap-6" data-color-mode="light">
          <ReadMore readLessText="Read less" readMoreText="Read more" side="left">
            {objective.completed.data?.reason || ""}
          </ReadMore>

          <div className="flex w-full flex-row items-center justify-between max-lg:flex-wrap max-lg:flex-col max-lg:items-start max-lg:gap-2">
            <div className="flex flex-row items-center gap-1 flex-1 max-w-full max-lg:flex-wrap">
              <p className="text-sm w-full min-w-max max-w-max font-semibold text-gray-500 dark:text-zinc-300 max-sm:text-xs">
                Proof of work:
              </p>
              {objective?.completed?.data.proofOfWork ? (
                <ExternalLink
                  href={
                    objective?.completed?.data.proofOfWork.includes("http")
                      ? objective?.completed?.data.proofOfWork
                      : `https://${objective?.completed?.data.proofOfWork}`
                  }
                  className="flex flex-row w-max max-w-full gap-2 bg-transparent text-sm font-semibold text-blue-600 underline dark:text-blue-100 hover:bg-transparent break-all line-clamp-3"
                >
                  {objective?.completed?.data.proofOfWork.includes("http")
                    ? `${objective?.completed?.data.proofOfWork.slice(0, 80)}${
                        objective?.completed?.data.proofOfWork.slice(0, 80).length >= 80
                          ? "..."
                          : ""
                      }`
                    : `https://${objective?.completed?.data.proofOfWork.slice(0, 80)}${
                        objective?.completed?.data.proofOfWork.slice(0, 80).length >= 80
                          ? "..."
                          : ""
                      }`}
                </ExternalLink>
              ) : (
                <p className="text-sm font-medium text-gray-500 dark:text-zinc-300 max-sm:text-xs">
                  There is no proof for this milestone.
                </p>
              )}
            </div>

            <div className="flex flex-1 flex-row items-center justify-end">
              {isAuthorized ? (
                <div className="flex w-max flex-row items-center gap-2">
                  <Button
                    type="button"
                    className="flex flex-row gap-2 bg-transparent text-sm font-semibold text-gray-600 dark:text-zinc-100 hover:bg-transparent max-lg:px-0"
                    onClick={() => deleteObjectiveCompletion()}
                  >
                    <TrashIcon className="h-5 w-5" />
                    Remove
                  </Button>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    );
  }
  if (isCompleting) {
    return (
      <ProjectObjectiveCompletion
        objectiveUID={objective.uid}
        handleCompleting={handleCompleting}
      />
    );
  }
  return null;
};
