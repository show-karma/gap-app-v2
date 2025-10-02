'use client';

import { FC, useState, useMemo } from 'react';
import { format, parseISO, isValid } from 'date-fns';
import toast from 'react-hot-toast';
import {
  ChatBubbleLeftRightIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  DocumentTextIcon,
  PencilSquareIcon
} from '@heroicons/react/24/outline';
import {
  ApplicationComment,
  IStatusHistoryEntry,
  FundingApplicationStatusV2,
  IApplicationVersion
} from '@/types/funding-platform';
import { cn } from '@/utilities/tailwind';
import { Spinner } from '@/components/Utilities/Spinner';
import CommentItem from './CommentItem';
import CommentInput from './CommentInput';
import pluralize from 'pluralize';

interface CommentsTimelineProps {
  applicationId: string;
  comments: ApplicationComment[];
  statusHistory: IStatusHistoryEntry[];
  versionHistory?: IApplicationVersion[];
  currentStatus: FundingApplicationStatusV2;
  isAdmin: boolean;
  currentUserAddress?: string;
  onCommentAdd?: (content: string) => Promise<void>;
  onCommentEdit?: (commentId: string, content: string) => Promise<void>;
  onCommentDelete?: (commentId: string) => Promise<void>;
  onVersionClick?: (versionId: string) => void;
  isLoading?: boolean;
}

type TimelineItem = {
  type: 'comment' | 'status' | 'version';
  timestamp: Date;
  data: ApplicationComment | IStatusHistoryEntry | IApplicationVersion;
};

const statusConfig = {
  pending: {
    icon: ClockIcon,
    color: 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900',
    label: 'Pending Review'
  },
  under_review: {
    icon: ClockIcon,
    color: 'text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-900',
    label: 'Under Review'
  },
  revision_requested: {
    icon: ExclamationTriangleIcon,
    color: 'text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900',
    label: 'Revision Requested'
  },
  approved: {
    icon: CheckCircleIcon,
    color: 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900',
    label: 'Approved'
  },
  rejected: {
    icon: XCircleIcon,
    color: 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900',
    label: 'Rejected'
  },
};
const labelMap = {
  pending: 'Pending Review',
  under_review: 'Under Review',
  revision_requested: 'Revision Requested',
  approved: 'Approved',
  rejected: 'Rejected',
}


const CommentsTimeline: FC<CommentsTimelineProps> = ({
  applicationId: _applicationId, // Unused but kept for interface compatibility
  comments = [],
  statusHistory = [],
  versionHistory = [],
  currentStatus,
  isAdmin,
  currentUserAddress,
  onCommentAdd,
  onCommentEdit,
  onCommentDelete,
  onVersionClick,
  isLoading = false
}) => {
  const [isAddingComment, setIsAddingComment] = useState(false);

  // Combine comments, status history, and version history into a unified timeline
  const timelineItems = useMemo(() => {
    const items: TimelineItem[] = [];

    // Add comments
    comments.forEach(comment => {
      const timestamp = typeof comment.createdAt === 'string'
        ? parseISO(comment.createdAt)
        : comment.createdAt as Date;

      if (isValid(timestamp)) {
        items.push({
          type: 'comment',
          timestamp,
          data: comment
        });
      }
    });

    // Add status history
    statusHistory.forEach(status => {
      const timestamp = typeof status.timestamp === 'string'
        ? parseISO(status.timestamp)
        : status.timestamp as Date;

      if (isValid(timestamp)) {
        items.push({
          type: 'status',
          timestamp,
          data: status
        });
      }
    });

    // Add version history (including version 1 for initial submission)
    versionHistory.forEach(version => {
      const timestamp = typeof version.createdAt === 'string'
        ? parseISO(version.createdAt)
        : version.createdAt as Date;

      if (isValid(timestamp)) {
        items.push({
          type: 'version',
          timestamp,
          data: version
        });
      }
    });

    // Sort by timestamp (newest first)
    return items.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }, [comments, statusHistory, versionHistory]);

  const handleAddComment = async (content: string) => {
    if (!onCommentAdd) return;

    setIsAddingComment(true);
    try {
      await onCommentAdd(content);
    } catch (error) {
      console.error('Failed to add comment:', error);
    } finally {
      setIsAddingComment(false);
    }
  };

  const handleEditComment = async (commentId: string, content: string) => {
    if (!onCommentEdit) return;
    await onCommentEdit(commentId, content);
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!onCommentDelete) return;

    await onCommentDelete(commentId);
  };

  const formatDate = (dateString: string | Date) => {
    try {
      const date = typeof dateString === 'string' ? parseISO(dateString) : dateString;
      if (!isValid(date)) return 'Invalid date';
      return format(date, 'MMM dd, yyyy HH:mm');
    } catch {
      return 'Invalid date';
    }
  };

  const renderStatusItem = (status: IStatusHistoryEntry, isLatest: boolean) => {
    const config = statusConfig[status.status as keyof typeof statusConfig] || statusConfig.pending;
    const StatusIcon = config.icon;
    const isCurrent = status.status === currentStatus && isLatest;

    return (
      <div className="flex space-x-3">
        <div className="flex-shrink-0">
          <span className={cn(
            'h-8 w-8 rounded-full flex items-center justify-center',
            config.color,
            isCurrent && 'ring-4 ring-offset-2 ring-offset-white dark:ring-offset-gray-900'
          )}>
            <StatusIcon className="h-5 w-5" />
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div>
              <p className={cn(
                'text-sm font-medium',
                isCurrent ? 'text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-400'
              )}>
                Status changed to {labelMap[status.status as keyof typeof labelMap] || config.label}
                {isCurrent && (
                  <span className="ml-2 text-xs font-normal text-gray-500 dark:text-gray-400">
                    (Current)
                  </span>
                )}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {formatDate(status.timestamp)}
              </p>
            </div>
          </div>
          {status.reason && (
            <div className="mt-2">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                Reason:
              </p>
              <p className="text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 rounded-md p-2">
                {status.reason}
              </p>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderVersionItem = (version: IApplicationVersion) => {
    const isInitialVersion = version.versionNumber === 0;

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
                {isInitialVersion ? 'Initial application submitted' : 'Application edited'}
                {version.submittedBy && (
                  <span className="ml-1 text-gray-600 dark:text-gray-400">
                    by {version.submittedBy.slice(0, 6)}...{version.submittedBy.slice(-4)}
                  </span>
                )}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {formatDate(version.createdAt)} • Version {version.versionNumber}
              </p>
            </div>
            {onVersionClick && (
              <button
                onClick={() => onVersionClick(version.id)}
                className="ml-2 inline-flex items-center px-2.5 py-1 rounded text-xs font-medium bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/50 transition-colors"
              >
                <DocumentTextIcon className="h-3 w-3 mr-1" />
                {isInitialVersion ? 'View details' : 'View changes'}
              </button>
            )}
          </div>
          {!isInitialVersion && version.hasChanges && (
            <div className="mt-2">
              <p className="text-sm text-gray-600 dark:text-gray-400 italic">
                {version.changeCount} {pluralize('field', version.changeCount)} changed
                {version.diffFromPrevious && version.diffFromPrevious.changedFields.length > 0 && (
                  <span className="ml-1">
                    ({version.diffFromPrevious.changedFields.slice(0, 2).map(f => f.fieldLabel).join(', ')}
                    {version.diffFromPrevious.changedFields.length > 2 && `, +${version.diffFromPrevious.changedFields.length - 2} more`})
                  </span>
                )}
              </p>
            </div>
          )}
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <ChatBubbleLeftRightIcon className="h-5 w-5 text-gray-500 dark:text-gray-400" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
            Activity Timeline
          </h3>
        </div>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {timelineItems.length} {timelineItems.length === 1 ? 'item' : 'items'}
        </span>
      </div>

      {/* Comment Input - Show for all users who have onCommentAdd handler */}
      {onCommentAdd && (
        <div className="bg-zinc-50 dark:bg-zinc-800 rounded-lg p-4">
          <CommentInput
            onSubmit={handleAddComment}
            disabled={isAddingComment}
            placeholder={isAdmin ? "Add an admin comment..." : "Add a comment for this application..."}
          />
        </div>
      )}

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
          <ul role="list" className="">
            {timelineItems.map((item, idx) => {
              const isLast = idx === timelineItems.length - 1;
              const isLatestStatus = item.type === 'status' &&
                statusHistory.findIndex(s => s === item.data) === 0;

              // Use a unique key based on the actual data, not index
              const itemKey = item.type === 'comment'
                ? `comment-${(item.data as ApplicationComment).id}`
                : item.type === 'version'
                  ? `version-${(item.data as IApplicationVersion).id}`
                  : `status-${idx}-${(item.data as any).timestamp}`;

              return (
                <li key={itemKey}>
                  <div className={cn("relative", !isLast && "pb-8")}>
                    {!isLast && (
                      <span
                        className="absolute left-4 top-8 -ml-px h-full w-0.5 bg-gray-200 dark:bg-gray-700"
                        aria-hidden="true"
                      />
                    )}
                    {item.type === 'comment' ? (
                      <CommentItem
                        comment={item.data as ApplicationComment}
                        isAdmin={isAdmin}
                        currentUserAddress={currentUserAddress}
                        onEdit={onCommentEdit ? handleEditComment : undefined}
                        onDelete={onCommentDelete ? handleDeleteComment : undefined}
                      />
                    ) : item.type === 'version' ? (
                      renderVersionItem(item.data as IApplicationVersion)
                    ) : (
                      renderStatusItem(item.data as IStatusHistoryEntry, isLatestStatus)
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

export default CommentsTimeline;