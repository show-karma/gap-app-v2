"use client";

import {
  ChatBubbleLeftRightIcon,
  DocumentTextIcon,
  PencilSquareIcon,
} from "@heroicons/react/24/outline";
import pluralize from "pluralize";
import { type FC, memo, useMemo } from "react";
import EthereumAddressToProfileName from "@/components/EthereumAddressToProfileName";
import {
  buildTimelineItems,
  getTimelineItemKey,
} from "@/components/FundingPlatform/ApplicationView/timeline/buildTimelineItems";
import { TimelineStatusItem } from "@/components/FundingPlatform/ApplicationView/timeline/TimelineStatusItem";
import {
  ACTIVITY_TIMELINE_ANCHOR_ID,
  type PendingScrollProps,
  usePendingScroll,
} from "@/components/FundingPlatform/ApplicationView/usePendingScroll";
import { Spinner } from "@/components/Utilities/Spinner";
import type {
  ApplicationComment,
  FundingApplicationStatusV2,
  IApplicationVersion,
  IStatusHistoryEntry,
} from "@/types/funding-platform";
import { renderRelativeTime } from "@/utilities/formatRelativeTime";
import { cn } from "@/utilities/tailwind";
import CommentItem from "../CommentItem";

export interface TimelineContainerProps extends PendingScrollProps {
  /** Comments to display */
  comments: ApplicationComment[];
  /** Status history entries */
  statusHistory: IStatusHistoryEntry[];
  /** Version history entries */
  versionHistory?: IApplicationVersion[];
  /** Current application status */
  currentStatus: FundingApplicationStatusV2;
  /** Whether the current user is an admin */
  isAdmin: boolean;
  /** Current user's wallet address */
  currentUserAddress?: string;
  /** Callback to edit a comment */
  onCommentEdit?: (commentId: string, content: string) => Promise<void>;
  /** Callback to delete a comment */
  onCommentDelete?: (commentId: string) => Promise<void>;
  /** Callback when a version is clicked */
  onVersionClick?: (versionId: string) => void;
  /** Whether data is loading */
  isLoading?: boolean;
  /** Program ID for mention autocomplete */
  programId?: string;
  /** Whether to enable @mention autocomplete */
  enableMentions?: boolean;
}

interface TimelineVersionItemProps {
  version: IApplicationVersion;
  onVersionClick?: (versionId: string) => void;
}

const TimelineVersionItem: FC<TimelineVersionItemProps> = memo(({ version, onVersionClick }) => {
  const isInitialVersion = version.versionNumber === 0;
  const handleClick = () => onVersionClick?.(version.id);

  return (
    <div className="flex space-x-3">
      <div className="flex-shrink-0">
        <span className="h-8 w-8 rounded-full flex items-center justify-center bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-400">
          {isInitialVersion ? (
            <DocumentTextIcon className="h-5 w-5" />
          ) : (
            <PencilSquareIcon className="h-5 w-5" />
          )}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              {isInitialVersion ? "Initial application submitted" : "Application edited"}
              {version.submittedBy && (
                <span className="ml-1 text-gray-600 dark:text-gray-400">
                  by <EthereumAddressToProfileName address={version.submittedBy} />
                </span>
              )}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {renderRelativeTime(version.createdAt)} • Version {version.versionNumber}
            </p>
          </div>
          {onVersionClick && (
            <button
              type="button"
              onClick={handleClick}
              className="ml-2 inline-flex items-center px-2.5 py-1 rounded text-xs font-medium bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/50 transition-colors"
            >
              <DocumentTextIcon className="h-3 w-3 mr-1" />
              {isInitialVersion ? "View details" : "View changes"}
            </button>
          )}
        </div>
        {!isInitialVersion && version.hasChanges && (
          <div className="mt-2">
            <p className="text-sm text-gray-600 dark:text-gray-400 italic">
              {version.changeCount} {pluralize("field", version.changeCount)} changed
              {version.diffFromPrevious && version.diffFromPrevious.changedFields.length > 0 && (
                <span className="ml-1">
                  (
                  {version.diffFromPrevious.changedFields
                    .slice(0, 2)
                    .map((f) => f.fieldLabel)
                    .join(", ")}
                  {version.diffFromPrevious.changedFields.length > 2 &&
                    `, +${version.diffFromPrevious.changedFields.length - 2} more`}
                  )
                </span>
              )}
            </p>
          </div>
        )}
      </div>
    </div>
  );
});

TimelineVersionItem.displayName = "TimelineVersionItem";

/**
 * Scrollable timeline container that displays comments, status changes, and version history.
 * Designed to work with StickyCommentInput below it.
 */
export const TimelineContainer: FC<TimelineContainerProps> = ({
  comments = [],
  statusHistory = [],
  versionHistory = [],
  currentStatus,
  isAdmin,
  currentUserAddress,
  onCommentEdit,
  onCommentDelete,
  onVersionClick,
  isLoading = false,
  programId,
  enableMentions = false,
  pendingScrollAnchorId,
  onPendingScrollHandled,
}) => {
  const timelineItems = useMemo(
    () => buildTimelineItems({ comments, statusHistory, versionHistory }),
    [comments, statusHistory, versionHistory]
  );

  usePendingScroll(ACTIVITY_TIMELINE_ANCHOR_ID, {
    pendingScrollAnchorId,
    onPendingScrollHandled,
  });

  const handleEditComment = async (commentId: string, content: string) => {
    if (!onCommentEdit) return;
    await onCommentEdit(commentId, content);
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!onCommentDelete) return;
    await onCommentDelete(commentId);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  return (
    <div id={ACTIVITY_TIMELINE_ANCHOR_ID}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <ChatBubbleLeftRightIcon className="h-5 w-5 text-gray-500 dark:text-gray-400" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
            Activity Timeline
          </h3>
        </div>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {timelineItems.length} {pluralize("item", timelineItems.length)}
        </span>
      </div>

      {/* Timeline */}
      {timelineItems.length === 0 ? (
        <div className="text-center py-12">
          <ChatBubbleLeftRightIcon className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-600" />
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">
            No activity yet
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Comments and status changes will appear here.
          </p>
        </div>
      ) : (
        <div className="flow-root">
          <ul>
            {timelineItems.map((item, idx) => {
              const isLast = idx === timelineItems.length - 1;

              return (
                <li key={getTimelineItemKey(item, idx)}>
                  <div className={cn("relative", !isLast && "pb-8")}>
                    {!isLast && (
                      <span
                        className="absolute left-4 top-8 -ml-px h-full w-0.5 bg-gray-200 dark:bg-gray-700"
                        aria-hidden="true"
                      />
                    )}
                    {item.type === "comment" ? (
                      <CommentItem
                        comment={item.data}
                        isAdmin={isAdmin}
                        currentUserAddress={currentUserAddress}
                        onEdit={onCommentEdit ? handleEditComment : undefined}
                        onDelete={onCommentDelete ? handleDeleteComment : undefined}
                        programId={programId}
                        enableMentions={enableMentions}
                      />
                    ) : item.type === "version" ? (
                      <TimelineVersionItem version={item.data} onVersionClick={onVersionClick} />
                    ) : (
                      <TimelineStatusItem
                        status={item.data}
                        isCurrent={
                          item.data.status === currentStatus &&
                          statusHistory.indexOf(item.data) === 0
                        }
                      />
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
};

export default TimelineContainer;
