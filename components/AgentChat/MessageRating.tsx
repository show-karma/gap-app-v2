"use client";

import { ThumbsDownIcon, ThumbsUpIcon } from "lucide-react";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { useChatRating } from "@/hooks/useChatRating";

interface MessageRatingProps {
  messageId: string;
  traceId: string;
}

export function MessageRating({ messageId, traceId }: MessageRatingProps) {
  const { rating, submit } = useChatRating(messageId, traceId);
  const [showCommentBox, setShowCommentBox] = useState(false);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleThumbsUp = useCallback(async () => {
    if (rating === 1) return;
    setIsSubmitting(true);
    try {
      await submit(1);
      setShowCommentBox(false);
      setComment("");
    } finally {
      setIsSubmitting(false);
    }
  }, [rating, submit]);

  const handleThumbsDown = useCallback(() => {
    setShowCommentBox(true);
  }, []);

  const handleSubmitComment = useCallback(async () => {
    setIsSubmitting(true);
    try {
      const trimmed = comment.trim();
      await submit(-1, trimmed.length > 0 ? trimmed : undefined);
      setShowCommentBox(false);
      setComment("");
    } finally {
      setIsSubmitting(false);
    }
  }, [comment, submit]);

  const handleCancelComment = useCallback(() => {
    setShowCommentBox(false);
    setComment("");
  }, []);

  const handleCommentChange = useCallback((event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setComment(event.target.value);
  }, []);

  return (
    <div className="pl-9 mt-1">
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
      {showCommentBox && (
        <div className="mt-2 flex flex-col gap-2" data-testid="rating-comment-box">
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
            <Button variant="ghost" size="sm" onClick={handleCancelComment} disabled={isSubmitting}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
