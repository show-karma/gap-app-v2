import { Button } from "@/components/Utilities/Button";
import { errorManager } from "@/components/Utilities/errorManager";
import { ExternalLink } from "@/components/Utilities/ExternalLink";
import { getGapClient, useGap } from "@/hooks";
import { useOwnerStore, useProjectStore } from "@/store";
import { useStepper } from "@/store/modals/txStepper";
import { checkNetworkIsValid } from "@/utilities/checkNetworkIsValid";
import { walletClientToSigner } from "@/utilities/eas-wagmi-utils";
import fetchData from "@/utilities/fetchData";
import { gapIndexerApi } from "@/utilities/gapIndexerApi";
import { getProjectObjectives } from "@/utilities/gapIndexerApi/getProjectObjectives";
import { INDEXER } from "@/utilities/indexer";
import { MESSAGES } from "@/utilities/messages";
import { ReadMore } from "@/utilities/ReadMore";
import { getProjectById } from "@/utilities/sdk";
import { config } from "@/utilities/wagmi/config";
import { TrashIcon } from "@heroicons/react/24/outline";
import { ProjectMilestone } from "@show-karma/karma-gap-sdk/core/class/entities/ProjectMilestone";
import { IProjectMilestoneResponse } from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";
import { useQuery } from "@tanstack/react-query";
import { getWalletClient } from "@wagmi/core";
import dynamic from "next/dynamic";
import { useParams } from "next/navigation";
import toast from "react-hot-toast";
import { useAccount, useSwitchChain } from "wagmi";

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

  const { changeStepperStep, setIsStepper } = useStepper();
  const { gap } = useGap();
  const { chain } = useAccount();
  const { switchChainAsync } = useSwitchChain();

  const params = useParams();
  const projectId = params.projectId as string;

  const { refetch } = useQuery<IProjectMilestoneResponse[]>({
    queryKey: ["projectMilestones"],
    queryFn: () => getProjectObjectives(projectId),
  });

  const deleteObjectiveCompletion = async () => {
    let gapClient = gap;
    try {
      if (!checkNetworkIsValid(chain?.id) || chain?.id !== objective.chainID) {
        await switchChainAsync?.({ chainId: objective.chainID });
        gapClient = getGapClient(objective.chainID);
      }
      const walletClient = await getWalletClient(config, {
        chainId: objective.chainID,
      });
      if (!walletClient || !gapClient) return;
      const walletSigner = await walletClientToSigner(walletClient);
      const fetchedProject = await getProjectById(projectId);
      if (!fetchedProject) return;
      const fetchedMilestones = await gapIndexerApi
        .projectMilestones(projectId)
        .then((res) => res.data);
      if (!fetchedMilestones || !gapClient?.network) return;
      const objectivesInstances = ProjectMilestone.from(
        fetchedMilestones,
        gapClient?.network
      );
      const objectiveInstance = objectivesInstances.find(
        (item) => item.uid.toLowerCase() === objective.uid.toLowerCase()
      );
      if (!objectiveInstance) return;
      await objectiveInstance
        .revokeCompletion(walletSigner as any, changeStepperStep)
        .then(async (res) => {
          let retries = 1000;
          changeStepperStep("indexing");
          const txHash = res?.tx[0]?.hash;
          let fetchedObjectives = null;
          if (txHash) {
            await fetchData(
              INDEXER.ATTESTATION_LISTENER(txHash, objectiveInstance.chainID),
              "POST",
              {}
            );
          }
          while (retries > 0) {
            fetchedObjectives = await getProjectObjectives(projectId);
            const stillExists = fetchedObjectives.find(
              (item) => item.uid.toLowerCase() === objective.uid.toLowerCase()
            )?.completed;

            if (!stillExists) {
              retries = 0;
              changeStepperStep("indexed");
              toast.success(
                MESSAGES.PROJECT_OBJECTIVE_FORM.COMPLETE.DELETE.SUCCESS
              );
              await refetch();
            }
            retries -= 1;
            // eslint-disable-next-line no-await-in-loop, no-promise-executor-return
            await new Promise((resolve) => setTimeout(resolve, 1500));
          }
        });
    } catch (error: any) {
      console.log(error);
      toast.error(MESSAGES.PROJECT_OBJECTIVE_FORM.COMPLETE.DELETE.ERROR);
      errorManager(
        `Error deleting objective completion of ${objective.uid} from project ${objective.refUID}`,
        error
      );
    } finally {
      setIsStepper(false);
    }
  };

  if (objective.completed) {
    return (
      <div className="rounded-xl gap-6 flex flex-col items-start justify-start w-full">
        <div
          className="flex flex-col items-start w-full gap-6"
          data-color-mode="light"
        >
          <ReadMore
            readLessText="Read less"
            readMoreText="Read more"
            side="left"
          >
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
                  className="flex flex-row w-max max-w-full gap-2 bg-transparent text-sm font-semibold text-blue-600 underline dark:text-blue-100 hover:bg-transparent"
                >
                  {objective?.completed?.data.proofOfWork.includes("http")
                    ? `${objective?.completed?.data.proofOfWork.slice(0, 80)}${
                        objective?.completed?.data.proofOfWork.slice(0, 80)
                          .length >= 80
                          ? "..."
                          : ""
                      }`
                    : `https://${objective?.completed?.data.proofOfWork.slice(
                        0,
                        80
                      )}${
                        objective?.completed?.data.proofOfWork.slice(0, 80)
                          .length >= 80
                          ? "..."
                          : ""
                      }`}
                </ExternalLink>
              ) : (
                <p className="text-sm font-medium text-gray-500 dark:text-zinc-300 max-sm:text-xs">
                  There is no proof for this objective.
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
