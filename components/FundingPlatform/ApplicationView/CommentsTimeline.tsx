'use client';

import { FC, useState, useEffect, useMemo } from 'react';
import { format, parseISO, isValid } from 'date-fns';
import toast from 'react-hot-toast';
import {
  ChatBubbleLeftRightIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import {
  ApplicationComment,
  IStatusHistoryEntry,
  FundingApplicationStatusV2
} from '@/types/funding-platform';
import { cn } from '@/utilities/tailwind';
import { Spinner } from '@/components/Utilities/Spinner';
import CommentItem from './CommentItem';
import CommentInput from './CommentInput';

interface CommentsTimelineProps {
  applicationId: string;
  comments: ApplicationComment[];
  statusHistory: IStatusHistoryEntry[];
  currentStatus: FundingApplicationStatusV2;
  isAdmin: boolean;
  currentUserAddress?: string;
  onCommentAdd?: (content: string) => Promise<void>;
  onCommentEdit?: (commentId: string, content: string) => Promise<void>;
  onCommentDelete?: (commentId: string) => Promise<void>;
  isLoading?: boolean;
}

type TimelineItem = {
  type: 'comment' | 'status';
  timestamp: Date;
  data: ApplicationComment | IStatusHistoryEntry;
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
  withdrawn: {
    icon: ArrowPathIcon,
    color: 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700',
    label: 'Withdrawn'
  }
};

const CommentsTimeline: FC<CommentsTimelineProps> = ({
  applicationId,
  comments = [],
  statusHistory = [],
  currentStatus,
  isAdmin,
  currentUserAddress,
  onCommentAdd,
  onCommentEdit,
  onCommentDelete,
  isLoading = false
}) => {
  const [isAddingComment, setIsAddingComment] = useState(false);

  // Combine comments and status history into a unified timeline
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

    // Sort by timestamp (newest first)
    return items.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }, [comments, statusHistory]);

  const handleAddComment = async (content: string) => {
    if (!onCommentAdd) return;

    setIsAddingComment(true);
    try {
      await onCommentAdd(content);
      toast.success('Comment added successfully');
    } catch (error) {
      console.error('Failed to add comment:', error);
      toast.error('Failed to add comment');
    } finally {
      setIsAddingComment(false);
    }
  };

  const handleEditComment = async (commentId: string, content: string) => {
    if (!onCommentEdit) return;

    try {
      await onCommentEdit(commentId, content);
      toast.success('Comment updated successfully');
    } catch (error) {
      console.error('Failed to edit comment:', error);
      toast.error('Failed to update comment');
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!onCommentDelete) return;

    try {
      await onCommentDelete(commentId);
      toast.success('Comment deleted successfully');
    } catch (error) {
      console.error('Failed to delete comment:', error);
      toast.error('Failed to delete comment');
    }
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
                Status changed to {config.label}
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
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
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

              return (
                <li key={`${item.type}-${idx}`}>
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