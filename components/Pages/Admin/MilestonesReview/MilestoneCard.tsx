"use client";

import { CheckCircleIcon, SparklesIcon, TrashIcon } from "@heroicons/react/20/solid";
import { PencilSquareIcon } from "@heroicons/react/24/outline";
import dynamic from "next/dynamic";
import { useCallback, useMemo, useState } from "react";
import { DeleteDialog } from "@/components/DeleteDialog";
import { Button } from "@/components/Utilities/Button";
import { MarkdownPreview } from "@/components/Utilities/MarkdownPreview";
import type { GrantMilestoneWithCompletion } from "@/services/milestones";
import { formatDate } from "@/utilities/formatDate";
import { toEditableUnifiedMilestone } from "@/utilities/milestoneTransforms";
import { shortAddress } from "@/utilities/shortAddress";
import { getMilestoneStatus, MILESTONE_STATUS_CONFIG } from "./utils/milestone-review-status";

const AIEvaluationModal = dynamic(
  () => import("./AIEvaluationModal").then((m) => ({ default: m.AIEvaluationModal })),
  { ssr: false }
);

const MilestoneEditDialog = dynamic(
  () =>
    import("@/components/Milestone/MilestoneEditDialog").then((m) => ({
      default: m.MilestoneEditDialog,
    })),
  { ssr: false }
);

interface AIEvaluationButtonProps {
  onClick: () => void;
  className?: string;
}

function AIEvaluationButton({ onClick, className = "" }: AIEvaluationButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1 px-3 py-1.5 text-sm text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-md transition-colors ${className}`}
    >
      <SparklesIcon className="w-4 h-4" />
      AI Evaluation
    </button>
  );
}

interface MilestoneCardProps {
  milestone: GrantMilestoneWithCompletion;
  index: number;
  verifyingMilestoneId: string | null;
  verificationComment: string;
  isVerifying: boolean;
  canVerifyMilestones: boolean;
  canDeleteMilestones: boolean;
  canEditMilestones?: boolean;
  grantUID?: string;
  grantChainID?: number;
  projectUid?: string;
  projectSlug?: string;
  programId?: string;
  onVerifyClick: (uid: string) => void;
  onCancelVerification: () => void;
  onVerificationCommentChange: (comment: string) => void;
  onSubmitVerification: (milestone: GrantMilestoneWithCompletion) => void;
  onDeleteMilestone: (milestone: GrantMilestoneWithCompletion) => Promise<void>;
  isDeleting?: boolean;
  allocationAmount?: string;
}

export function MilestoneCard({
  milestone,
  index,
  verifyingMilestoneId,
  verificationComment,
  isVerifying,
  canVerifyMilestones,
  canDeleteMilestones,
  canEditMilestones = false,
  grantUID,
  grantChainID,
  projectUid,
  projectSlug,
  programId,
  onVerifyClick,
  onCancelVerification,
  onVerificationCommentChange,
  onSubmitVerification,
  onDeleteMilestone,
  isDeleting = false,
  allocationAmount,
}: MilestoneCardProps) {
  const [isEditOpen, setIsEditOpen] = useState(false);

  const unifiedMilestone = useMemo(
    () =>
      canEditMilestones && grantUID && grantChainID
        ? toEditableUnifiedMilestone(milestone, grantUID, grantChainID)
        : null,
    [canEditMilestones, milestone, grantUID, grantChainID]
  );

  const handleEditOpen = useCallback(() => {
    setIsEditOpen(true);
  }, []);

  const handleEditClose = useCallback(() => {
    setIsEditOpen(false);
  }, []);

  const useOnChainData = useMemo(
    () => milestone.completionDetails !== null,
    [milestone.completionDetails]
  );

  const completionData = useMemo(
    () => (useOnChainData ? milestone.completionDetails : milestone.fundingApplicationCompletion),
    [useOnChainData, milestone.completionDetails, milestone.fundingApplicationCompletion]
  );

  const hasCompletion = useMemo(() => completionData !== null, [completionData]);
  const isVerified = useMemo(
    () => milestone.verificationDetails !== null,
    [milestone.verificationDetails]
  );

  const statusInfo = useMemo(() => {
    const status = getMilestoneStatus(milestone);
    const config = MILESTONE_STATUS_CONFIG[status];
    return { status: config.label, statusColor: config.badgeColor };
  }, [
    milestone.verificationDetails,
    milestone.completionDetails,
    milestone.fundingApplicationCompletion,
  ]);

  const [isEvaluationModalOpen, setIsEvaluationModalOpen] = useState(false);

  function handleOpenEvaluation() {
    setIsEvaluationModalOpen(true);
  }

  return (
    <div
      key={milestone.uid || index}
      className="border border-gray-200 dark:border-zinc-700 rounded-lg p-4 hover:border-blue-500 dark:hover:border-blue-400 transition-colors"
    >
      <div className="flex items-start justify-between mb-2">
        <h3 className="text-lg font-medium text-black dark:text-white">{milestone.title}</h3>
        <div className="flex items-center gap-1">
          {unifiedMilestone && !isVerified && !hasCompletion && (
            <Button
              onClick={handleEditOpen}
              className="bg-transparent p-1 w-max h-max hover:bg-gray-100 dark:hover:bg-zinc-700 rounded"
              title="Edit milestone"
              aria-label={`Edit milestone ${milestone.title}`}
            >
              <PencilSquareIcon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            </Button>
          )}
          {unifiedMilestone && isEditOpen && (
            <MilestoneEditDialog
              milestone={unifiedMilestone}
              isOpen={isEditOpen}
              onClose={handleEditClose}
              projectUid={projectUid}
              projectSlug={projectSlug}
              programId={programId}
            />
          )}
          {canDeleteMilestones && milestone.fundingApplicationCompletion && (
            <DeleteDialog
              deleteFunction={() => onDeleteMilestone(milestone)}
              isLoading={isDeleting}
              title={
                <p className="font-normal">
                  Are you sure you want to delete <b>{milestone.title}</b> milestone?
                </p>
              }
              buttonElement={{
                text: "",
                icon: <TrashIcon className="w-5 h-5 text-red-500" />,
                styleClass:
                  "bg-transparent p-1 w-max h-max text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 border border-red-200 dark:border-red-800 rounded",
              }}
            />
          )}
        </div>
      </div>

      <div className="text-gray-600 dark:text-gray-400 text-sm mb-3">
        <MarkdownPreview source={milestone.description} />
      </div>

      {hasCompletion && (
        <>
          {/* Completion Details Box - Read Only */}
          <div className="mb-3 p-3 bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-md">
            <p className="text-sm font-semibold text-blue-900 dark:text-blue-200 mb-2">
              Completion Details {useOnChainData ? "(On-chain)" : "(Off-chain)"}
            </p>
            <div className="text-sm text-gray-700 dark:text-gray-300">
              <MarkdownPreview
                source={
                  useOnChainData
                    ? milestone.completionDetails!.description
                    : milestone.fundingApplicationCompletion!.completionText
                }
              />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              Submitted:{" "}
              {formatDate(
                useOnChainData
                  ? milestone.completionDetails!.completedAt
                  : milestone.fundingApplicationCompletion!.createdAt
              )}
            </p>
          </div>

          {/* Verification Section */}
          {isVerified && milestone.verificationDetails ? (
            /* Show Verification Box if already verified (from on-chain data) */
            <div className="mb-3">
              <div className="p-3 bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 rounded-md">
                <p className="text-sm font-semibold text-green-900 dark:text-green-200 mb-2">
                  Verification (On-chain)
                </p>
                <div className="text-sm text-gray-700 dark:text-gray-300">
                  <MarkdownPreview source={milestone.verificationDetails.description} />
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  Verified by: {shortAddress(milestone.verificationDetails.verifiedBy)}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Verified: {formatDate(milestone.verificationDetails.verifiedAt)}
                </p>
              </div>
              <AIEvaluationButton onClick={handleOpenEvaluation} className="mt-2" />
            </div>
          ) : (
            /* Show Verify Button for all non-verified milestones with completion (on-chain or off-chain) */
            /* Only milestone reviewers, admins, and contract owners can verify */
            canVerifyMilestones &&
            hasCompletion &&
            !isVerified && (
              <div className="mb-3">
                {verifyingMilestoneId === milestone.uid ? (
                  /* Verification Form */
                  <div className="p-3 bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 rounded-md space-y-2">
                    <p className="text-sm font-semibold text-green-900 dark:text-green-200 mb-2">
                      Verify Milestone Completion
                    </p>
                    <textarea
                      value={verificationComment}
                      onChange={(e) => onVerificationCommentChange(e.target.value)}
                      placeholder="Add verification comment (optional)..."
                      rows={3}
                      className="w-full px-3 py-2 text-sm border border-green-300 dark:border-green-700 rounded-md bg-white dark:bg-zinc-800 text-black dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400"
                    />
                    <div className="flex gap-2">
                      <Button
                        onClick={() => onSubmitVerification(milestone)}
                        className="px-3 py-1 text-xs bg-green-600 hover:bg-green-700"
                        disabled={isVerifying}
                        isLoading={isVerifying}
                      >
                        Verify
                      </Button>
                      <Button
                        onClick={onCancelVerification}
                        className="px-3 py-1 text-xs bg-gray-500 hover:bg-gray-600"
                        disabled={isVerifying}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  /* Verify Button + AI Evaluation */
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() => onVerifyClick(milestone.uid)}
                      className="flex items-center gap-2 px-4 py-2 text-sm bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircleIcon className="w-4 h-4" />
                      Verify Milestone
                    </Button>
                    <AIEvaluationButton onClick={handleOpenEvaluation} className="py-2" />
                  </div>
                )}
              </div>
            )
          )}
        </>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            <span className="font-medium">Due:</span> {formatDate(milestone.dueDate, "UTC")}
          </div>
          {allocationAmount ? (
            <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 dark:bg-blue-900 dark:text-blue-200">
              {allocationAmount}
            </span>
          ) : null}
        </div>
        <span className={`text-xs px-3 py-1 rounded-full font-medium ${statusInfo.statusColor}`}>
          {statusInfo.status}
        </span>
      </div>

      {hasCompletion && isEvaluationModalOpen && (
        <AIEvaluationModal
          milestoneUID={milestone.uid}
          isOpen={isEvaluationModalOpen}
          onClose={() => setIsEvaluationModalOpen(false)}
        />
      )}
    </div>
  );
}
