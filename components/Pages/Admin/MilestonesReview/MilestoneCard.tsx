"use client";

import {
  AtSymbolIcon,
  CheckCircleIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  EllipsisVerticalIcon,
  LinkIcon,
  SparklesIcon,
  TrashIcon,
} from "@heroicons/react/20/solid";
import { PencilSquareIcon } from "@heroicons/react/24/outline";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { DeleteDialog } from "@/components/DeleteDialog";
import EthereumAddressToProfileName from "@/components/EthereumAddressToProfileName";
import { Button } from "@/components/Utilities/Button";
import { MarkdownPreview } from "@/components/Utilities/MarkdownPreview";
import { useCopyToClipboard } from "@/hooks/useCopyToClipboard";
import type { GrantMilestoneWithCompletion } from "@/services/milestones";
import { useAgentChatStore } from "@/store/agentChat";
import { formatDate } from "@/utilities/formatDate";
import { toEditableUnifiedMilestone } from "@/utilities/milestoneTransforms";
import { cn } from "@/utilities/tailwind";
import { getMilestoneStatus, MILESTONE_STATUS_CONFIG } from "./utils/milestone-review-status";

// useLayoutEffect mirrors useEffect on the server to avoid Next.js SSR warnings.
// On the client we use the synchronous variant so collapse measurement happens
// before paint (no flash of unclamped content).
const useIsomorphicLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

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

function CopyMilestoneLinkButton({
  milestoneUid,
  milestoneTitle,
}: {
  milestoneUid: string;
  milestoneTitle: string;
}) {
  const [, copyToClipboard] = useCopyToClipboard();
  const handleClick = useCallback(() => {
    if (typeof window === "undefined") return;
    const url = `${window.location.origin}${window.location.pathname}#milestone-${milestoneUid}`;
    copyToClipboard(url, "Milestone link copied");
  }, [milestoneUid, copyToClipboard]);

  return (
    <button
      type="button"
      onClick={handleClick}
      className="p-1 rounded hover:bg-gray-100 dark:hover:bg-zinc-700 transition-colors"
      aria-label={`Copy link to milestone ${milestoneTitle}`}
      title="Copy link to this milestone"
    >
      <LinkIcon className="w-4 h-4 text-gray-500 dark:text-gray-400" />
    </button>
  );
}

function MentionInChatButton({
  milestoneUid,
  milestoneTitle,
  projectTitle,
  projectSlug,
}: {
  milestoneUid: string;
  milestoneTitle: string;
  projectTitle?: string;
  projectSlug?: string;
}) {
  const setOpen = useAgentChatStore((s) => s.setOpen);
  const addMention = useAgentChatStore((s) => s.addMention);

  const handleClick = useCallback(() => {
    setOpen(true);
    const label = projectTitle ? `${milestoneTitle} from ${projectTitle}` : milestoneTitle;
    // refText uses the project slug (stable id `get_project_details` accepts directly)
    // plus the milestone uid; agent doesn't have to disambiguate by free-text title.
    const projectRef = projectSlug
      ? `project ${projectSlug}`
      : projectTitle
        ? `project "${projectTitle}"`
        : null;
    const refText = projectRef
      ? `milestone "${milestoneTitle}" (uid: ${milestoneUid}) in ${projectRef}`
      : `milestone "${milestoneTitle}" (uid: ${milestoneUid})`;
    addMention({
      id: `milestone-${milestoneUid}`,
      kind: "milestone",
      label,
      refText,
    });
  }, [setOpen, addMention, milestoneUid, milestoneTitle, projectTitle, projectSlug]);

  return (
    <button
      type="button"
      onClick={handleClick}
      className="p-1 rounded hover:bg-gray-100 dark:hover:bg-zinc-700 transition-colors"
      aria-label={`Mention milestone ${milestoneTitle} in the assistant chat`}
      title="Mention this milestone in the assistant chat"
    >
      <AtSymbolIcon className="w-4 h-4 text-gray-500 dark:text-gray-400" />
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
  projectTitle?: string;
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
  projectTitle,
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
  const anchorId = `milestone-${milestone.uid}`;

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
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [isOverflowOpen, setIsOverflowOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [hasLongDescription, setHasLongDescription] = useState(false);
  const [hasLongCompletion, setHasLongCompletion] = useState(false);
  const [isCompletionExpanded, setIsCompletionExpanded] = useState(false);
  const descriptionId = `milestone-${milestone.uid}-description`;
  const completionId = `milestone-${milestone.uid}-completion`;
  const overflowRef = useRef<HTMLDivElement>(null);
  const descriptionRef = useRef<HTMLDivElement>(null);
  const completionRef = useRef<HTMLDivElement>(null);

  const handleOpenEvaluation = useCallback(() => {
    setIsEvaluationModalOpen(true);
  }, []);

  const handleToggleOverflow = useCallback(() => {
    setIsOverflowOpen((v) => !v);
  }, []);

  const handleToggleDescription = useCallback(() => {
    setIsDescriptionExpanded((v) => !v);
  }, []);

  const handleToggleCompletion = useCallback(() => {
    setIsCompletionExpanded((v) => !v);
  }, []);

  const handleDeleteDialogOpenChange = useCallback((open: boolean) => {
    if (open) setIsOverflowOpen(false);
    setIsDeleteDialogOpen(open);
  }, []);

  const handleOverflowBlur = useCallback((e: React.FocusEvent) => {
    if (overflowRef.current && !overflowRef.current.contains(e.relatedTarget as Node)) {
      setIsOverflowOpen(false);
    }
  }, []);

  const handleOverflowKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setIsOverflowOpen(false);
    }
  }, []);

  // Close overflow menu when the user clicks outside it (focus/blur alone
  // doesn't fire if the next click target isn't focusable, e.g. empty page).
  useEffect(() => {
    if (!isOverflowOpen) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (overflowRef.current && !overflowRef.current.contains(event.target as Node)) {
        setIsOverflowOpen(false);
      }
    };
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [isOverflowOpen]);

  const completionText = useMemo(() => {
    if (useOnChainData && milestone.completionDetails) {
      return milestone.completionDetails.description;
    }
    if (milestone.fundingApplicationCompletion) {
      return milestone.fundingApplicationCompletion.completionText;
    }
    return "";
  }, [useOnChainData, milestone.completionDetails, milestone.fundingApplicationCompletion]);

  // Re-measure rendered content height on mount, content change, or resize so
  // the "Show more" toggle stays in sync with the clamp height. The clamp
  // (max-h-24 = 6rem) is derived from the root font size so we don't depend
  // on a hard-coded 96px threshold that breaks at non-default zoom/font.
  useIsomorphicLayoutEffect(() => {
    const node = descriptionRef.current;
    if (!node) return;
    const measure = () => {
      const remPx = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
      const collapsedHeight = remPx * 6;
      setHasLongDescription(node.scrollHeight > collapsedHeight);
    };
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, [milestone.description]);

  useIsomorphicLayoutEffect(() => {
    const node = completionRef.current;
    if (!node) return;
    const measure = () => {
      const remPx = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
      const collapsedHeight = remPx * 6;
      setHasLongCompletion(node.scrollHeight > collapsedHeight);
    };
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, [completionText]);

  return (
    <div
      key={milestone.uid || index}
      id={anchorId}
      className="border border-gray-200 dark:border-zinc-700 rounded-lg p-4 hover:border-blue-500 dark:hover:border-blue-400 transition-colors scroll-mt-24 target:ring-2 target:ring-blue-400 target:border-blue-500"
    >
      {/* Header row: title + status badge + actions */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <h3
            className="text-lg font-medium text-black dark:text-white truncate"
            title={milestone.title}
          >
            {milestone.title}
          </h3>
          <span
            className={cn(
              "text-xs px-2.5 py-0.5 rounded-full font-medium whitespace-nowrap",
              statusInfo.statusColor
            )}
          >
            {statusInfo.status}
          </span>
        </div>

        {/* Actions: copy link + edit + overflow menu */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <CopyMilestoneLinkButton milestoneUid={milestone.uid} milestoneTitle={milestone.title} />
          <MentionInChatButton
            milestoneUid={milestone.uid}
            milestoneTitle={milestone.title}
            projectTitle={projectTitle}
            projectSlug={projectSlug}
          />
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
          {canDeleteMilestones && milestone.fundingApplicationCompletion && (
            // biome-ignore lint/a11y/noStaticElementInteractions: wrapper needs onBlur to detect focus leaving the menu group; the interactive child is the trigger button below.
            <div className="relative" ref={overflowRef} onBlur={handleOverflowBlur}>
              <button
                type="button"
                onClick={handleToggleOverflow}
                onKeyDown={handleOverflowKeyDown}
                className="p-1 rounded hover:bg-gray-100 dark:hover:bg-zinc-700 transition-colors"
                aria-label="More actions"
                aria-haspopup="menu"
                aria-expanded={isOverflowOpen}
              >
                <EllipsisVerticalIcon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              </button>
              {isOverflowOpen && (
                <div
                  role="menu"
                  onKeyDown={handleOverflowKeyDown}
                  className="absolute right-0 top-full mt-1 z-10 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-md shadow-lg py-1 min-w-[140px]"
                >
                  <DeleteDialog
                    deleteFunction={() => onDeleteMilestone(milestone)}
                    isLoading={isDeleting}
                    title={
                      <p className="font-normal">
                        Are you sure you want to delete <b>{milestone.title}</b> milestone?
                      </p>
                    }
                    buttonElement={{
                      text: "Delete",
                      icon: <TrashIcon className="w-4 h-4" />,
                      styleClass:
                        "flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 text-left",
                    }}
                    externalIsOpen={isDeleteDialogOpen}
                    externalSetIsOpen={handleDeleteDialogOpenChange}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Meta row: due date + allocation */}
      <div className="flex items-center gap-3 mb-3">
        <div className="text-sm text-gray-500 dark:text-gray-400">
          <span className="font-medium">Due:</span> {formatDate(milestone.dueDate, "UTC")}
        </div>
        {allocationAmount ? (
          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 dark:bg-blue-900 dark:text-blue-200">
            {allocationAmount}
          </span>
        ) : null}
      </div>

      {/* Collapsible description */}
      <div className="mb-3">
        <div className="relative">
          <div
            id={descriptionId}
            ref={descriptionRef}
            className={cn(
              "text-gray-600 dark:text-gray-400 text-sm overflow-hidden transition-all",
              !isDescriptionExpanded && hasLongDescription && "max-h-24"
            )}
          >
            <MarkdownPreview source={milestone.description} />
          </div>
          {hasLongDescription && !isDescriptionExpanded && (
            <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-white dark:from-zinc-900 to-transparent pointer-events-none" />
          )}
        </div>
        {hasLongDescription && (
          <button
            type="button"
            onClick={handleToggleDescription}
            aria-expanded={isDescriptionExpanded}
            aria-controls={descriptionId}
            className="flex items-center gap-1 mt-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded"
          >
            {isDescriptionExpanded ? (
              <>
                <ChevronUpIcon className="w-3.5 h-3.5" />
                Show less
              </>
            ) : (
              <>
                <ChevronDownIcon className="w-3.5 h-3.5" />
                Show more
              </>
            )}
          </button>
        )}
      </div>

      {hasCompletion && (
        <>
          {/* Completion Details Box - collapsible */}
          <div className="mb-3 p-3 bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-md">
            <div className="flex items-center justify-between gap-2 mb-1">
              <p className="text-sm font-semibold text-blue-900 dark:text-blue-200">
                Completion Details
              </p>
              {hasLongCompletion && (
                <button
                  type="button"
                  onClick={handleToggleCompletion}
                  aria-expanded={isCompletionExpanded}
                  aria-controls={completionId}
                  className="flex items-center gap-0.5 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded"
                >
                  {isCompletionExpanded ? (
                    <>
                      <ChevronUpIcon className="w-3.5 h-3.5" /> Show less
                    </>
                  ) : (
                    <>
                      <ChevronDownIcon className="w-3.5 h-3.5" /> Show more
                    </>
                  )}
                </button>
              )}
            </div>
            <div className="relative">
              <div
                id={completionId}
                ref={completionRef}
                className={cn(
                  "text-sm text-gray-700 dark:text-gray-300 overflow-hidden transition-all",
                  !isCompletionExpanded && hasLongCompletion && "max-h-24"
                )}
              >
                <MarkdownPreview source={completionText} />
              </div>
              {hasLongCompletion && !isCompletionExpanded && (
                <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-blue-50 dark:from-blue-900/10 to-transparent pointer-events-none" />
              )}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              Submitted:{" "}
              {formatDate(
                useOnChainData
                  ? milestone.completionDetails?.completedAt
                  : milestone.fundingApplicationCompletion?.createdAt
              )}
            </p>
          </div>

          {/* Verification Section */}
          {isVerified && milestone.verificationDetails ? (
            <div className="mb-3">
              <div className="p-3 bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 rounded-md">
                <p className="text-sm font-semibold text-green-900 dark:text-green-200 mb-2">
                  Verification (On-chain)
                </p>
                <div className="text-sm text-gray-700 dark:text-gray-300">
                  <MarkdownPreview source={milestone.verificationDetails.description} />
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  Verified by:{" "}
                  <EthereumAddressToProfileName
                    address={milestone.verificationDetails.verifiedBy}
                  />
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Verified: {formatDate(milestone.verificationDetails.verifiedAt)}
                </p>
              </div>
              <AIEvaluationButton onClick={handleOpenEvaluation} className="mt-2" />
            </div>
          ) : (
            canVerifyMilestones &&
            hasCompletion &&
            !isVerified && (
              <div className="mb-3">
                {verifyingMilestoneId === milestone.uid ? (
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

      {hasCompletion && isEvaluationModalOpen && (
        <AIEvaluationModal
          milestoneUID={milestone.uid}
          isOpen={isEvaluationModalOpen}
          onClose={() => setIsEvaluationModalOpen(false)}
        />
      )}

      {unifiedMilestone && isEditOpen && (
        <MilestoneEditDialog
          milestone={unifiedMilestone}
          isOpen={isEditOpen}
          onClose={handleEditClose}
          projectUid={projectUid}
          projectSlug={projectSlug}
          programId={programId}
          excludeStartDate
        />
      )}
    </div>
  );
}
