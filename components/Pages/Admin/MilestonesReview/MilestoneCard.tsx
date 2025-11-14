"use client"

import { CheckCircleIcon } from "@heroicons/react/20/solid"
import { useMemo } from "react"
import { Button } from "@/components/Utilities/Button"
import { MarkdownPreview } from "@/components/Utilities/MarkdownPreview"
import type { GrantMilestoneWithCompletion } from "@/services/milestones"
import { formatDate } from "@/utilities/formatDate"
import { shortAddress } from "@/utilities/shortAddress"

interface MilestoneCardProps {
  milestone: GrantMilestoneWithCompletion
  index: number
  verifyingMilestoneId: string | null
  verificationComment: string
  isVerifying: boolean
  isSyncing: boolean
  canVerifyMilestones: boolean
  onVerifyClick: (uid: string) => void
  onCancelVerification: () => void
  onVerificationCommentChange: (comment: string) => void
  onSubmitVerification: (milestone: GrantMilestoneWithCompletion) => void
  onSyncVerification: (milestone: GrantMilestoneWithCompletion) => void
}

export function MilestoneCard({
  milestone,
  index,
  verifyingMilestoneId,
  verificationComment,
  isVerifying,
  isSyncing,
  canVerifyMilestones,
  onVerifyClick,
  onCancelVerification,
  onVerificationCommentChange,
  onSubmitVerification,
  onSyncVerification,
}: MilestoneCardProps) {
  // Memoized boolean checks
  const useOnChainData = useMemo(
    () => !!milestone.completionDetails?.description,
    [milestone.completionDetails?.description]
  )

  const completionData = useMemo(
    () => (useOnChainData ? milestone.completionDetails : milestone.fundingApplicationCompletion),
    [useOnChainData, milestone.completionDetails, milestone.fundingApplicationCompletion]
  )

  const hasCompletion = useMemo(() => completionData !== null, [completionData])
  const isVerified = useMemo(
    () => milestone.verificationDetails !== null,
    [milestone.verificationDetails]
  )
  const hasOnChainCompletion = useMemo(
    () => milestone.completionDetails !== null,
    [milestone.completionDetails]
  )
  const hasFundingAppCompletion = useMemo(
    () => milestone.fundingApplicationCompletion !== null,
    [milestone.fundingApplicationCompletion]
  )

  // Memoized status tree-decision
  const statusInfo = useMemo(() => {
    if (isVerified) {
      return {
        status: "Verified",
        statusColor: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
      }
    } else if (hasOnChainCompletion) {
      return {
        status: "Pending Verification",
        statusColor: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
      }
    } else if (hasFundingAppCompletion) {
      return {
        status: "Pending Completion and Verification",
        statusColor: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
      }
    }
    return {
      status: "Not Started",
      statusColor: "bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300",
    }
  }, [isVerified, hasOnChainCompletion, hasFundingAppCompletion])

  return (
    <div
      key={milestone.uid || index}
      className="border border-gray-200 dark:border-zinc-700 rounded-lg p-4 hover:border-blue-500 dark:hover:border-blue-400 transition-colors"
    >
      <div className="flex items-start justify-between mb-2">
        <h3 className="text-lg font-medium text-black dark:text-white">{milestone.title}</h3>
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
              {/* Show sync button if off-chain data is not synced */}
              {/* Only milestone reviewers, admins, and contract owners can sync */}
              {canVerifyMilestones &&
                milestone.fundingApplicationCompletion &&
                !milestone.fundingApplicationCompletion.isVerified && (
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
          <span className="font-medium">Due:</span> {formatDate(milestone.dueDate)}
        </div>
        <span className={`text-xs px-3 py-1 rounded-full font-medium ${statusInfo.statusColor}`}>
          {statusInfo.status}
        </span>
      </div>
    </div>
  )
}
