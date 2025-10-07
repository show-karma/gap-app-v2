"use client";

import { useState } from "react";
import { Button } from "@/components/Utilities/Button";
import { CheckCircleIcon } from "@heroicons/react/20/solid";
import type { MappedGrantMilestone } from "@/services/milestones";
import { shortAddress } from "@/utilities/shortAddress";

interface MilestoneCardProps {
  milestone: MappedGrantMilestone;
  index: number;
  verifyingMilestoneId: string | null;
  verificationComment: string;
  isVerifying: boolean;
  isSyncing: boolean;
  onVerifyClick: (uid: string) => void;
  onCancelVerification: () => void;
  onVerificationCommentChange: (comment: string) => void;
  onSubmitVerification: (milestone: MappedGrantMilestone) => void;
  onSyncVerification: (milestone: MappedGrantMilestone) => void;
}

export function MilestoneCard({
  milestone,
  index,
  verifyingMilestoneId,
  verificationComment,
  isVerifying,
  isSyncing,
  onVerifyClick,
  onCancelVerification,
  onVerificationCommentChange,
  onSubmitVerification,
  onSyncVerification,
}: MilestoneCardProps) {
  // Use completionDetails if it has description, otherwise use fundingApplicationCompletion
  const useOnChainData = milestone.completionDetails?.description;
  const completionData = useOnChainData
    ? milestone.completionDetails
    : milestone.fundingApplicationCompletion;

  const hasCompletion = completionData !== null;
  const isVerified = milestone.verificationDetails !== null;
  const hasOnChainCompletion = milestone.completionDetails !== null;
  const hasFundingAppCompletion = milestone.fundingApplicationCompletion !== null;

  // Determine status based on completion data
  let status = "Not Started";
  let statusColor = "bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300";

  if (isVerified) {
    status = "Verified";
    statusColor = "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300";
  } else if (hasOnChainCompletion) {
    status = "Pending Verification";
    statusColor = "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300";
  } else if (hasFundingAppCompletion) {
    status = "Pending Completion and Verification";
    statusColor = "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300";
  }

  return (
    <div
      key={milestone.uid || index}
      className="border border-gray-200 dark:border-zinc-700 rounded-lg p-4 hover:border-blue-500 dark:hover:border-blue-400 transition-colors"
    >
      <div className="flex items-start justify-between mb-2">
        <h3 className="text-lg font-medium text-black dark:text-white">
          {milestone.title}
        </h3>
      </div>

      <p className="text-gray-600 dark:text-gray-400 text-sm mb-3">
        {milestone.description}
      </p>

      {hasCompletion && (
        <>
          {/* Completion Details Box - Read Only */}
          <div className="mb-3 p-3 bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-md">
            <p className="text-sm font-semibold text-blue-900 dark:text-blue-200 mb-2">
              Completion Details {useOnChainData ? "(On-chain)" : "(Off-chain)"}
            </p>
            <p className="text-sm text-gray-700 dark:text-gray-300">
              {useOnChainData
                ? milestone.completionDetails!.description
                : milestone.fundingApplicationCompletion!.completionText}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              Submitted: {new Date(
                useOnChainData
                  ? milestone.completionDetails!.completedAt
                  : milestone.fundingApplicationCompletion!.createdAt
              ).toLocaleDateString()}
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
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  {milestone.verificationDetails.description}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  Verified by: {shortAddress(milestone.verificationDetails.verifiedBy)}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Verified: {new Date(milestone.verificationDetails.verifiedAt).toLocaleDateString()}
                </p>
              </div>
              {/* Show sync button if off-chain data is not synced */}
              {milestone.fundingApplicationCompletion && !milestone.fundingApplicationCompletion.isVerified && (
                <div className="mt-2">
                  <Button
                    onClick={() => onSyncVerification(milestone)}
                    className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700"
                    disabled={isSyncing}
                    isLoading={isSyncing}
                  >
                    <CheckCircleIcon className="w-4 h-4" />
                    Sync Verification to Off-chain
                  </Button>
                </div>
              )}
            </div>
          ) : (
            /* Show Verify Button for all non-verified milestones with completion (on-chain or off-chain) */
            hasCompletion && !isVerified && (
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
                  /* Verify Button */
                  <Button
                    onClick={() => onVerifyClick(milestone.uid)}
                    className="flex items-center gap-2 px-4 py-2 text-sm bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircleIcon className="w-4 h-4" />
                    Verify Milestone
                  </Button>
                )}
              </div>
            )
          )}
        </>
      )}

      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-500 dark:text-gray-400">
          <span className="font-medium">Due:</span>{" "}
          {new Date(milestone.dueDate).toLocaleDateString()}
        </div>
        <span className={`text-xs px-3 py-1 rounded-full font-medium ${statusColor}`}>
          {status}
        </span>
      </div>
    </div>
  );
}
