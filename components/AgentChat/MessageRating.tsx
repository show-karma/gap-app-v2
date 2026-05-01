"use client";

import { ThumbsDownIcon, ThumbsUpIcon } from "lucide-react";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { useChatRating } from "@/hooks/useChatRating";
import { useAgentChatStore } from "@/store/agentChat";

interface MessageRatingProps {
  messageId: string;
  traceId: string;
}

/**
 * Inline thumbs up / thumbs down buttons. Rendered inside the message
 * bubble's action row, side-by-side with the copy button.
 *
 * On thumbs-up: scores immediately.
 * On thumbs-down: opens the comment box (rendered separately by
 * MessageRatingCommentBox below the message).
 */
export function MessageRatingButtons({ messageId, traceId }: MessageRatingProps) {
  const { rating, submit } = useChatRating(messageId, traceId);
  const setCommentBoxOpen = useAgentChatStore(
    (s) => s.setRatingCommentBoxOpenForMessageId
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleThumbsUp = useCallback(async () => {
    if (rating === 1) return;
    setIsSubmitting(true);
    try {
      await submit(1);
      setCommentBoxOpen(null);
    } finally {
      setIsSubmitting(false);
    }
  }, [rating, submit, setCommentBoxOpen]);

  const handleThumbsDown = useCallback(() => {
    setCommentBoxOpen(messageId);
  }, [messageId, setCommentBoxOpen]);

  return (
    <fieldset
      className="flex items-center gap-1 border-0 p-0 m-0"
      aria-label="Rate this response"
      data-testid="message-rating"
    >
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={handleThumbsUp}
        disabled={isSubmitting}
        aria-label="Rate this response helpful"
        aria-pressed={rating === 1}
        className={
          rating === 1 ? "text-brand-blue" : "text-muted-foreground hover:text-foreground"
        }
      >
        <ThumbsUpIcon className="size-3" />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={handleThumbsDown}
        disabled={isSubmitting}
        aria-label="Rate this response unhelpful"
        aria-pressed={rating === -1}
        className={
          rating === -1 ? "text-destructive" : "text-muted-foreground hover:text-foreground"
        }
      >
        <ThumbsDownIcon className="size-3" />
      </Button>
    </fieldset>
  );
}

/**
 * Comment-box disclosure shown below the message when the user clicks
 * thumbs-down. Open/closed state is keyed on messageId in the store so
 * the buttons (in the action row) and the textarea (below the message)
 * stay coordinated despite living in different parts of the tree.
 */
export function MessageRatingCommentBox({ messageId, traceId }: MessageRatingProps) {
  const { submit } = useChatRating(messageId, traceId);
  const isOpenForThisMessage = useAgentChatStore(
    (s) => s.ratingCommentBoxOpenForMessageId === messageId
  );
  const setCommentBoxOpen = useAgentChatStore(
    (s) => s.setRatingCommentBoxOpenForMessageId
  );
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCommentChange = useCallback(
    (event: React.ChangeEvent<HTMLTextAreaElement>) => {
      setComment(event.target.value);
    },
    []
  );

  const handleSubmitComment = useCallback(async () => {
    setIsSubmitting(true);
    try {
      const trimmed = comment.trim();
      await submit(-1, trimmed.length > 0 ? trimmed : undefined);
      setCommentBoxOpen(null);
      setComment("");
    } finally {
      setIsSubmitting(false);
    }
  }, [comment, submit, setCommentBoxOpen]);

  const handleCancel = useCallback(() => {
    setCommentBoxOpen(null);
    setComment("");
  }, [setCommentBoxOpen]);

  if (!isOpenForThisMessage) return null;

  return (
    <div className="pl-9 mt-2 flex flex-col gap-2" data-testid="rating-comment-box">
      <textarea
        value={comment}
        onChange={handleCommentChange}
        placeholder="What was wrong? (optional)"
        aria-label="Feedback comment"
        className="w-full rounded-md border border-border bg-background p-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
        rows={2}
        maxLength={1000}
      />
      <div className="flex items-center gap-2">
        <Button
          variant="default"
          size="sm"
          onClick={handleSubmitComment}
          disabled={isSubmitting}
        >
          Submit feedback
        </Button>
        <Button variant="ghost" size="sm" onClick={handleCancel} disabled={isSubmitting}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

/**
 * @deprecated Use MessageRatingButtons + MessageRatingCommentBox separately.
 * Kept for any out-of-tree consumers; re-renders both in the legacy
 * stacked layout.
 */
export function MessageRating(props: MessageRatingProps) {
  return (
    <div className="pl-9 mt-1">
      <MessageRatingButtons {...props} />
      <MessageRatingCommentBox {...props} />
    </div>
  );
}
