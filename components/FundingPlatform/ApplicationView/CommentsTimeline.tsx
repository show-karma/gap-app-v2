"use client";

import {
  ChatBubbleLeftRightIcon,
  DocumentTextIcon,
  PencilSquareIcon,
} from "@heroicons/react/24/outline";
import pluralize from "pluralize";
import { type FC, memo, useMemo, useRef, useState } from "react";
import EthereumAddressToProfileName from "@/components/EthereumAddressToProfileName";
import {
  buildTimelineItems,
  getTimelineItemKey,
} from "@/components/FundingPlatform/ApplicationView/timeline/buildTimelineItems";
import { TimelineStatusItem } from "@/components/FundingPlatform/ApplicationView/timeline/TimelineStatusItem";
import { Spinner } from "@/components/Utilities/Spinner";
import { Badge } from "@/components/ui/badge";
import { type EditType, editTypeConfig } from "@/constants/editTypeConfig";
import { CommentInput } from "@/src/features/application-comments/components/CommentInput";
import type {
  ApplicationComment,
  FundingApplicationStatusV2,
  IApplicationVersion,
  IFormSchema,
  IFundingApplication,
  IStatusHistoryEntry,
} from "@/types/funding-platform";
import { createFieldLabelMap, getFieldLabel } from "@/utilities/fieldLabelMapping";
import { renderRelativeTime } from "@/utilities/formatRelativeTime";
import { cn } from "@/utilities/tailwind";
import CommentItem from "./CommentItem";

interface CommentsTimelineProps {
  applicationId: string;
  application?: IFundingApplication;
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
  formSchema?: IFormSchema; // Optional: for mapping field IDs to labels
  programId?: string;
  enableMentions?: boolean;
  /** Application reference number used to fetch grantee contacts for @-mention */
  referenceNumber?: string;
}

// An edit by anyone other than the application owner is attributed to staff;
// the version payload carries no editor role to distinguish admin from reviewer.
const getEditType = (version: IApplicationVersion, application?: IFundingApplication): EditType => {
  if (!version.submittedBy || !application?.ownerAddress) {
    return "applicant";
  }

  const submittedByLower = version.submittedBy.toLowerCase().trim();
  const ownerAddressLower = application.ownerAddress.toLowerCase().trim();

  return submittedByLower === ownerAddressLower ? "applicant" : "admin";
};

interface VersionItemProps {
  version: IApplicationVersion;
  application?: IFundingApplication;
  fieldLabels: Record<string, string>;
  onVersionClick?: (versionId: string) => void;
}

const VersionItem: FC<VersionItemProps> = memo(
  ({ version, application, fieldLabels, onVersionClick }) => {
    const isInitialVersion = version.versionNumber === 0;
    const editType = !isInitialVersion && application ? getEditType(version, application) : null;

    const config = editType ? editTypeConfig[editType] : null;
    const EditIcon = config?.icon || PencilSquareIcon;
    const handleClick = () => onVersionClick?.(version.id);

    return (
      <div className="flex space-x-3">
        <div className="flex-shrink-0">
          <span
            className={cn(
              "h-8 w-8 rounded-full flex items-center justify-center",
              isInitialVersion
                ? "bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-400"
                : config?.color ||
                    "bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-400"
            )}
          >
            {isInitialVersion ? (
              <DocumentTextIcon className="h-5 w-5" />
            ) : (
              <EditIcon className="h-5 w-5" />
            )}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {isInitialVersion ? "Initial application submitted" : "Application edited"}
                </p>
                {editType && config && (
                  <Badge variant={config.badgeVariant} className={config.badgeClassName}>
                    {config.label}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {renderRelativeTime(version.createdAt)} • Version {version.versionNumber}
                {version.submittedBy && (
                  <span className="ml-2 text-gray-400 dark:text-gray-500">
                    by <EthereumAddressToProfileName address={version.submittedBy} />
                  </span>
                )}
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
                      .map((f) => getFieldLabel(f.fieldLabel, fieldLabels))
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
  }
);

VersionItem.displayName = "VersionItem";

const CommentsTimeline: FC<CommentsTimelineProps> = ({
  applicationId: _applicationId, // Unused but kept for interface compatibility
  application,
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
  isLoading = false,
  formSchema,
  programId,
  enableMentions = false,
  referenceNumber,
}: CommentsTimelineProps) => {
  const [isAddingComment, setIsAddingComment] = useState(false);
  const [commentContent, setCommentContent] = useState("");
  const commentContentRef = useRef(commentContent);

  const handleCommentChange = (value: string) => {
    commentContentRef.current = value;
    setCommentContent(value);
  };

  // Create field labels mapping from form schema using shared utility
  const fieldLabels = useMemo(() => createFieldLabelMap(formSchema), [formSchema]);

  const timelineItems = useMemo(
    () => buildTimelineItems({ comments, statusHistory, versionHistory }),
    [comments, statusHistory, versionHistory]
  );

  const handleAddComment = async () => {
    if (!onCommentAdd) return;

    setIsAddingComment(true);
    try {
      await onCommentAdd(commentContentRef.current.trim());
      commentContentRef.current = "";
      setCommentContent("");
    } catch (error) {
      console.error("Failed to add comment:", error);
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
          {timelineItems.length} {pluralize("item", timelineItems.length)}
        </span>
      </div>

      {/* Comment Input - Show for all users who have onCommentAdd handler */}
      {onCommentAdd && (
        <div className="bg-zinc-50 dark:bg-zinc-800 rounded-lg p-4">
          <CommentInput
            value={commentContent}
            onChange={handleCommentChange}
            onSubmit={handleAddComment}
            isLoading={isAddingComment}
            placeholder={
              isAdmin ? "Add an admin comment..." : "Add a comment for this application..."
            }
            programId={programId}
            isAdmin={isAdmin}
            referenceNumber={referenceNumber}
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
                      <VersionItem
                        version={item.data}
                        application={application}
                        fieldLabels={fieldLabels}
                        onVersionClick={onVersionClick}
                      />
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

export default CommentsTimeline;
