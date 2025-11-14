"use client"

import {
  ChatBubbleLeftIcon,
  CheckIcon,
  PencilIcon,
  TrashIcon,
  UserCircleIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline"
import { format, isValid, parseISO } from "date-fns"
import React, { type FC, useState } from "react"
import { MarkdownEditor } from "@/components/Utilities/MarkdownEditor"
import { MarkdownPreview } from "@/components/Utilities/MarkdownPreview"
import { Spinner } from "@/components/Utilities/Spinner"
import type { ApplicationComment } from "@/types/funding-platform"
import { cn } from "@/utilities/tailwind"

interface CommentItemProps {
  comment: ApplicationComment
  isAdmin: boolean
  currentUserAddress?: string
  onEdit?: (commentId: string, newContent: string) => Promise<void>
  onDelete?: (commentId: string) => Promise<void>
}

const CommentItem: FC<CommentItemProps> = ({
  comment,
  isAdmin,
  currentUserAddress,
  onEdit,
  onDelete,
}) => {
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState(comment.content)
  const [isUpdating, setIsUpdating] = useState(false)

  // Update editContent when comment changes to handle optimistic updates
  React.useEffect(() => {
    setEditContent(comment.content)
  }, [comment.content, comment.id])

  // Users can edit their own comments (if not deleted)
  const isAuthor = currentUserAddress?.toLowerCase() === comment.authorAddress?.toLowerCase()
  const canEdit = !comment.isDeleted && isAuthor

  // Users can delete their own comments, admins can delete any comment
  const canDelete = !comment.isDeleted && (isAuthor || isAdmin)

  const formatDate = (dateString: string | Date) => {
    try {
      const date = typeof dateString === "string" ? parseISO(dateString) : dateString
      if (!isValid(date)) return "Invalid date"
      return format(date, "MMM dd, yyyy HH:mm")
    } catch {
      return "Invalid date"
    }
  }

  const handleSaveEdit = async () => {
    if (!onEdit || editContent.trim() === comment.content) {
      setIsEditing(false)
      return
    }

    setIsUpdating(true)
    try {
      await onEdit(comment.id, editContent.trim())
      setIsEditing(false)
    } catch (error) {
      console.error("Failed to edit comment:", error)
      // Reset content on error
      setEditContent(comment.content)
    } finally {
      setIsUpdating(false)
    }
  }

  const handleDelete = async () => {
    if (!onDelete) return

    // Different confirmation messages for admins vs regular users
    const confirmMessage =
      isAdmin && !isAuthor
        ? "Are you sure you want to delete this comment? This action will mark it as deleted but preserve it for audit purposes."
        : "Are you sure you want to delete your comment? This action cannot be undone."

    if (!confirm(confirmMessage)) return

    setIsUpdating(true)
    try {
      await onDelete(comment.id)
    } catch (error) {
      console.error("Failed to delete comment:", error)
    } finally {
      setIsUpdating(false)
    }
  }

  const handleCancelEdit = () => {
    setEditContent(comment.content)
    setIsEditing(false)
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case "admin":
        return "text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900"
      case "reviewer":
        return "text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900"
      case "applicant":
        return "text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900"
      default:
        return "text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700"
    }
  }

  return (
    <div className={cn("group relative", comment.isDeleted && "opacity-60")}>
      <div className="flex space-x-3">
        <div className="flex-shrink-0">
          <span
            className={cn(
              "h-8 w-8 rounded-full flex items-center justify-center",
              getRoleColor(comment.authorRole)
            )}
          >
            {comment.authorRole === "admin" ? (
              <UserCircleIcon className="h-5 w-5" />
            ) : (
              <ChatBubbleLeftIcon className="h-5 w-5" />
            )}
          </span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {comment.authorName ||
                  `${comment.authorAddress?.slice(0, 6)}...${comment.authorAddress?.slice(-4)}`}
                <span
                  className={cn(
                    "ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium",
                    getRoleColor(comment.authorRole)
                  )}
                >
                  {comment.authorRole}
                </span>
                {comment.isDeleted && (
                  <span className="ml-2 text-xs text-red-500 dark:text-red-400">(Deleted)</span>
                )}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {formatDate(comment.createdAt)}
                {comment.editHistory && comment.editHistory.length > 0 && (
                  <span className="ml-1 italic text-gray-400 dark:text-gray-500">
                    (Edited at {formatDate(comment.updatedAt)})
                  </span>
                )}
              </p>
            </div>

            {!isEditing && !comment.isDeleted && (canEdit || canDelete) && (
              <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {canEdit && (
                  <button
                    onClick={() => {
                      setEditContent(comment.content) // Ensure we have the current content
                      setIsEditing(true)
                    }}
                    disabled={isUpdating}
                    className={cn(
                      "p-1 rounded text-gray-400 hover:text-gray-600",
                      "dark:text-gray-500 dark:hover:text-gray-300",
                      "hover:bg-gray-100 dark:hover:bg-gray-800",
                      "transition-colors duration-200",
                      "disabled:opacity-50 disabled:cursor-not-allowed"
                    )}
                    title="Edit comment"
                  >
                    <PencilIcon className="h-5 w-5" />
                  </button>
                )}
                {canDelete && (
                  <button
                    onClick={handleDelete}
                    disabled={isUpdating}
                    className={cn(
                      "p-1 rounded text-gray-400 hover:text-red-600",
                      "dark:text-gray-500 dark:hover:text-red-400",
                      "hover:bg-gray-100 dark:hover:bg-gray-800",
                      "transition-colors duration-200",
                      "disabled:opacity-50 disabled:cursor-not-allowed"
                    )}
                    title="Delete comment"
                  >
                    {isUpdating ? (
                      <Spinner className="h-5 w-5 border-2" />
                    ) : (
                      <TrashIcon className="h-5 w-5" />
                    )}
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="mt-2">
            {isEditing ? (
              <div className="space-y-2">
                <MarkdownEditor
                  value={editContent}
                  onChange={setEditContent}
                  height={200}
                  minHeight={150}
                  disabled={isUpdating}
                  placeholderText="Edit your comment (Markdown supported)..."
                  className="text-sm"
                />
                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleSaveEdit}
                    disabled={!editContent.trim() || isUpdating}
                    className={cn(
                      "inline-flex items-center px-3 py-1 border border-transparent",
                      "text-xs font-medium rounded-md",
                      "text-white bg-blue-600 hover:bg-blue-700",
                      "dark:bg-blue-500 dark:hover:bg-blue-600",
                      "focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500",
                      "disabled:opacity-50 disabled:cursor-not-allowed",
                      "transition-colors duration-200"
                    )}
                  >
                    {isUpdating ? (
                      <>
                        <Spinner className="h-3 w-3 mr-1 border-2" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <CheckIcon className="h-3 w-3 mr-1" />
                        Save
                      </>
                    )}
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    disabled={isUpdating}
                    className={cn(
                      "inline-flex items-center px-3 py-1 border border-gray-300 dark:border-gray-600",
                      "text-xs font-medium rounded-md",
                      "text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800",
                      "hover:bg-gray-50 dark:hover:bg-gray-700",
                      "focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500",
                      "disabled:opacity-50 disabled:cursor-not-allowed",
                      "transition-colors duration-200"
                    )}
                  >
                    <XMarkIcon className="h-3 w-3 mr-1" />
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className={cn("text-sm", comment.isDeleted && "opacity-60")}>
                <MarkdownPreview
                  source={comment.content}
                  className={cn("text-sm", comment.isDeleted && "line-through")}
                />
              </div>
            )}
          </div>

          {comment.deletedAt && (
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 italic">
              Deleted by {comment.deletedBy || "unknown"} on {formatDate(comment.deletedAt)}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

export default CommentItem
