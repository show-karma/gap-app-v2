"use client";

import { PaperAirplaneIcon } from "@heroicons/react/24/outline";
import { type FC, useState } from "react";
import { MarkdownEditor } from "@/components/Utilities/MarkdownEditor";
import { Spinner } from "@/components/Utilities/Spinner";
import { cn } from "@/utilities/tailwind";

interface CommentInputProps {
  onSubmit: (content: string) => Promise<void>;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

const CommentInput: FC<CommentInputProps> = ({
  onSubmit,
  placeholder = "Add a comment...",
  disabled = false,
  className = "",
}) => {
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!content.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onSubmit(content.trim());
      setContent("");
    } catch (error) {
      console.error("Failed to submit comment:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={cn("relative", className)}>
      <div className="flex flex-col space-y-3">
        <div className="w-full" style={{ minHeight: "200px" }}>
          <MarkdownEditor
            value={content}
            onChange={setContent}
            height={200}
            minHeight={undefined}
            disabled={disabled || isSubmitting}
            placeholderText={placeholder}
            className="text-sm"
            overflow={true}
          />
        </div>
        <div className="flex items-center justify-end">
          <button
            type="submit"
            disabled={!content.trim() || disabled || isSubmitting}
            className={cn(
              "inline-flex items-center px-4 py-2 border border-transparent",
              "text-sm font-medium rounded-lg shadow-sm",
              "text-white bg-blue-600 hover:bg-blue-700",
              "dark:bg-blue-500 dark:hover:bg-blue-600",
              "focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              "transition-colors duration-200"
            )}
          >
            {isSubmitting ? (
              <>
                <Spinner className="h-4 w-4 mr-2 border-2" />
                <span>Sending...</span>
              </>
            ) : (
              <>
                <PaperAirplaneIcon className="h-4 w-4 mr-2" />
                <span>Send</span>
              </>
            )}
          </button>
        </div>
      </div>
    </form>
  );
};

export default CommentInput;
