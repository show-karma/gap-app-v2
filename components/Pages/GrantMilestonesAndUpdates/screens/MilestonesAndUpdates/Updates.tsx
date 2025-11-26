/* eslint-disable @next/next/no-img-element */

import { PencilSquareIcon, ShareIcon, TrashIcon } from "@heroicons/react/24/outline";
import type {
  IMilestoneCompleted,
  IMilestoneResponse,
} from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";
import { type FC, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useAccount } from "wagmi";
import { MilestoneVerificationSection } from "@/components/Shared/MilestoneVerification";
import { Button } from "@/components/Utilities/Button";
import { ExternalLink } from "@/components/Utilities/ExternalLink";
import { errorManager } from "@/components/Utilities/errorManager";
import { useGap } from "@/hooks/useGap";
import { useMilestoneImpactAnswers } from "@/hooks/useMilestoneImpactAnswers";
import { useOffChainRevoke } from "@/hooks/useOffChainRevoke";
import { useWallet } from "@/hooks/useWallet";
import { useOwnerStore, useProjectStore } from "@/store";
import { useCommunityAdminStore } from "@/store/communityAdmin";
import { useStepper } from "@/store/modals/txStepper";
import { walletClientToSigner } from "@/utilities/eas-wagmi-utils";
import { ensureCorrectChain } from "@/utilities/ensureCorrectChain";
import fetchData from "@/utilities/fetchData";
import { formatDate } from "@/utilities/formatDate";
import { INDEXER } from "@/utilities/indexer";
import { MESSAGES } from "@/utilities/messages";
import { ReadMore } from "@/utilities/ReadMore";
import { retryUntilConditionMet } from "@/utilities/retries";
import { shareOnX } from "@/utilities/share/shareOnX";
import { SHARE_TEXTS } from "@/utilities/share/text";
import { safeGetWalletClient } from "@/utilities/wallet-helpers";
import { UpdateMilestone } from "./UpdateMilestone";

interface UpdatesProps {
  milestone: IMilestoneResponse;
}

export const Updates: FC<UpdatesProps> = ({ milestone }) => {
  const [isEditing, setIsEditing] = useState(false);

  const handleEditing = (value: boolean) => {
    setIsEditing(value);
  };
  const { chain, address } = useAccount();
  const { switchChainAsync } = useWallet();
  const refreshProject = useProjectStore((state) => state.refreshProject);

  const { changeStepperStep, setIsStepper } = useStepper();
  const { gap } = useGap();
  const { project, isProjectOwner } = useProjectStore();
  const { isOwner: isContractOwner } = useOwnerStore();
  const isOnChainAuthorized = isProjectOwner || isContractOwner;
  const { performOffChainRevoke } = useOffChainRevoke();

  const undoMilestoneCompletion = async (milestone: IMilestoneResponse) => {
    let gapClient = gap;
    try {
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
        return;
      }

      gapClient = newGapClient;

      const { walletClient, error } = await safeGetWalletClient(actualChainId);

      if (error || !walletClient || !gapClient) {
        throw new Error("Failed to connect to wallet", { cause: error });
      }
      if (!walletClient || !gapClient) return;
      const walletSigner = await walletClientToSigner(walletClient);

      const instanceProject = await gapClient.fetch.projectById(project?.uid);
      const findGrant = instanceProject?.grants.find(
        (item) => item.uid.toLowerCase() === milestone.refUID.toLowerCase()
      );
      const instanceMilestone = findGrant?.milestones.find(
        (item) => item.uid.toLowerCase() === milestone.uid.toLowerCase()
      );
      if (!instanceMilestone) return;

      const checkIfAttestationExists = async (callbackFn?: () => void) => {
        await retryUntilConditionMet(
          async () => {
            const fetchedProject = await refreshProject();
            const foundGrant = fetchedProject?.grants.find((g) => g.uid === milestone.refUID);
            const fetchedMilestone = foundGrant?.milestones.find(
              (u: any) => u.uid === milestone.uid
            );
            return !fetchedMilestone?.completed;
          },
          () => {
            callbackFn?.();
          }
        );
      };

      if (!isOnChainAuthorized) {
        await performOffChainRevoke({
          uid: milestone.completed?.uid as `0x${string}`,
          chainID: instanceMilestone.chainID,
          checkIfExists: checkIfAttestationExists,
          toastMessages: {
            success: MESSAGES.MILESTONES.COMPLETE.UNDO.SUCCESS,
            loading: MESSAGES.MILESTONES.COMPLETE.UNDO.LOADING,
          },
        });
      } else {
        try {
          const res = await instanceMilestone.revokeCompletion(
            walletSigner as any,
            changeStepperStep
          );
          changeStepperStep("indexing");
          const txHash = res?.tx[0]?.hash;
          if (txHash) {
            await fetchData(
              INDEXER.ATTESTATION_LISTENER(txHash, instanceMilestone.chainID),
              "POST",
              {}
            );
          }
          await checkIfAttestationExists(() => {
            changeStepperStep("indexed");
          });
          toast.success(MESSAGES.MILESTONES.COMPLETE.UNDO.SUCCESS);
        } catch (onChainError: any) {
          // Silently fallback to off-chain revoke
          setIsStepper(false); // Reset stepper since we're falling back

          const success = await performOffChainRevoke({
            uid: milestone.completed?.uid as `0x${string}`,
            chainID: instanceMilestone.chainID,
            checkIfExists: checkIfAttestationExists,
            toastMessages: {
              success: MESSAGES.MILESTONES.COMPLETE.UNDO.SUCCESS,
              loading: MESSAGES.MILESTONES.COMPLETE.UNDO.LOADING,
            },
          });

          if (!success) {
            // Both methods failed - throw the original error to maintain expected behavior
            throw onChainError;
          }
        }
      }
    } catch (error: any) {
      errorManager(
        MESSAGES.MILESTONES.COMPLETE.UNDO.ERROR,
        error,
        {
          milestone: milestone.uid,
          grant: milestone.refUID,
          address,
        },
        { error: MESSAGES.MILESTONES.COMPLETE.UNDO.ERROR }
      );
    } finally {
      setIsStepper(false);
    }
  };

  const isProjectAdmin = useProjectStore((state) => state.isProjectAdmin);
  const isCommunityAdmin = useCommunityAdminStore((state) => state.isCommunityAdmin);
  const isAuthorized = isProjectAdmin || isContractOwner || isCommunityAdmin;

  const [verifiedMilestones, setVerifiedMilestones] = useState<IMilestoneCompleted[]>(
    milestone?.verified || []
  );

  const addVerifiedMilestone = (newVerified: IMilestoneCompleted) => {
    setVerifiedMilestones([...verifiedMilestones, newVerified]);
  };

  useEffect(() => {
    setVerifiedMilestones(milestone?.verified || []);
  }, [milestone]);

  /*
   * Check if the milestone completion was created after the launch date of the feature
   * @returns {boolean}
   */
  const checkProofLaunch = () => {
    return new Date("2024-08-30") <= new Date(milestone?.completed?.createdAt);
  };

  const isAfterProofLaunch = checkProofLaunch();

  const grant = project?.grants.find((g) => g.uid.toLowerCase() === milestone.refUID.toLowerCase());

  // Fetch milestone impact data (outputs/metrics) if milestone is completed
  const { data: milestoneImpactData } = useMilestoneImpactAnswers({
    milestoneUID: milestone.completed ? milestone.uid : undefined,
  });

  // Get deliverables from milestone completion data
  const completionDeliverables = (milestone.completed?.data as any)?.deliverables;

  if (
    !isEditing &&
    (milestone?.completed?.data?.reason?.length || milestone?.completed?.data?.proofOfWork)
  ) {
    return (
      <div className="flex flex-col gap-3 bg-[#F8F9FC] dark:bg-zinc-900 rounded-md px-4 py-2 max-lg:max-w-2xl max-sm:max-w-full w-full">
        <div className="flex w-full flex-row flex-wrap items-center justify-between gap-2">
          <div className="flex flex-row gap-4 items-center flex-wrap">
            <div className="flex items-center h-max w-max flex-row gap-2 rounded-full bg-[#5720B7] dark:bg-purple-900 px-3 py-1  flex-wrap">
              <img className="h-4 w-4" alt="Update" src="/icons/alert-message-white.svg" />
              <p className="text-xs font-bold text-white">UPDATE</p>
            </div>
          </div>
          <p className="text-sm font-semibold text-gray-500 dark:text-zinc-100">
            Completed on {formatDate(milestone?.completed?.createdAt)}
          </p>
        </div>

        {milestone.completed?.data?.reason || milestone.completed?.data?.proofOfWork ? (
          <div className="flex flex-col items-start " data-color-mode="light">
            <ReadMore readLessText="Read less" readMoreText="Read more" side="left">
              {milestone.completed.data?.reason || ""}
            </ReadMore>

            <div className="flex w-full flex-row items-center justify-between">
              {isAfterProofLaunch && milestone?.completed?.data.proofOfWork ? (
                <div className="flex flex-row items-center gap-1 flex-1 max-w-full flex-wrap max-sm:mt-4">
                  <p className="text-sm w-full min-w-max max-w-max font-semibold text-gray-500 dark:text-zinc-300 max-sm:text-xs">
                    Proof of work:
                  </p>
                  <ExternalLink
                    href={
                      milestone?.completed?.data.proofOfWork.includes("http")
                        ? milestone?.completed?.data.proofOfWork
                        : `https://${milestone?.completed?.data.proofOfWork}`
                    }
                    className="flex flex-row w-max max-w-full break-all gap-2 bg-transparent text-sm font-semibold text-blue-600 underline dark:text-blue-100 hover:bg-transparent line-clamp-3"
                  >
                    {milestone?.completed?.data.proofOfWork.includes("http")
                      ? `${milestone?.completed?.data.proofOfWork.slice(0, 80)}${
                          milestone?.completed?.data.proofOfWork.slice(0, 80).length >= 80
                            ? "..."
                            : ""
                        }`
                      : `https://${milestone?.completed?.data.proofOfWork.slice(0, 80)}${
                          milestone?.completed?.data.proofOfWork.slice(0, 80).length >= 80
                            ? "..."
                            : ""
                        }`}
                  </ExternalLink>
                </div>
              ) : null}

              <div className="flex flex-1 flex-row items-center justify-end">
                {isAuthorized ? (
                  <div className="flex w-max flex-row items-center gap-2">
                    <MilestoneVerificationSection
                      milestone={milestone}
                      title={`${milestone.data.title} - Reviews`}
                      verifiedMilestones={verifiedMilestones}
                      onVerificationAdded={addVerifiedMilestone}
                    />
                    <ExternalLink
                      type="button"
                      className="flex flex-row gap-2 bg-transparent text-sm font-semibold text-gray-600 dark:text-zinc-100 hover:bg-transparent"
                      href={shareOnX(
                        SHARE_TEXTS.MILESTONE_COMPLETED(
                          grant?.details?.data?.title as string,
                          (project?.details?.data?.slug || project?.uid) as string,
                          grant?.uid as string
                        )
                      )}
                    >
                      <ShareIcon className="h-5 w-5" />
                    </ExternalLink>
                    <Button
                      type="button"
                      className="flex flex-row gap-2 bg-transparent text-sm font-semibold text-gray-600 dark:text-zinc-100 hover:bg-transparent"
                      onClick={() => handleEditing(true)}
                    >
                      <PencilSquareIcon className="h-5 w-5" />
                    </Button>
                    <Button
                      type="button"
                      className="flex flex-row gap-2 bg-transparent text-sm font-semibold text-gray-600 dark:text-zinc-100 hover:bg-transparent"
                      onClick={() => undoMilestoneCompletion(milestone)}
                    >
                      <TrashIcon className="h-5 w-5" />
                    </Button>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}

        {/* Deliverables Section */}
        {completionDeliverables && completionDeliverables.length > 0 ? (
          <div className="flex flex-col gap-2 mt-4">
            <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Deliverables:</p>
            {completionDeliverables.map((deliverable: any, index: number) => (
              <div
                key={index}
                className="border border-gray-200 dark:border-zinc-700 rounded-lg p-3 bg-gray-50 dark:bg-zinc-800"
              >
                <div className="flex flex-col gap-1">
                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    {deliverable.name}
                  </p>
                  {deliverable.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {deliverable.description}
                    </p>
                  )}
                  {deliverable.proof && (
                    <ExternalLink
                      href={deliverable.proof}
                      className="text-brand-blue hover:underline text-sm break-all"
                    >
                      {deliverable.proof}
                    </ExternalLink>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {/* Metrics Section */}
        {milestoneImpactData && milestoneImpactData.length > 0 ? (
          <div className="flex flex-col gap-2 mt-4">
            <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Metrics:</p>
            {milestoneImpactData.map((metric: any, index: number) => (
              <div
                key={index}
                className="border border-gray-200 dark:border-zinc-700 rounded-lg p-3 bg-gray-50 dark:bg-zinc-800"
              >
                <div className="flex flex-col gap-1">
                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    {metric.name || metric.indicator?.data?.title || "Untitled Indicator"}
                  </p>
                  {metric.datapoints && metric.datapoints.length > 0 && (
                    <div className="flex flex-col gap-1">
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Value:{" "}
                        <span className="font-medium text-zinc-900 dark:text-zinc-100">
                          {metric.datapoints[0].value}
                        </span>
                      </p>
                      {metric.datapoints[0].proof && (
                        <ExternalLink
                          href={metric.datapoints[0].proof}
                          className="text-brand-blue hover:underline text-sm break-all"
                        >
                          {metric.datapoints[0].proof}
                        </ExternalLink>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <UpdateMilestone
      milestone={milestone}
      isEditing={isEditing}
      previousData={milestone.completed?.data}
      cancelEditing={handleEditing}
    />
  );
};
