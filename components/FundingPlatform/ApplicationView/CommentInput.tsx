'use client';

import { FC, useState } from 'react';
import { PaperAirplaneIcon } from '@heroicons/react/24/outline';
import { cn } from '@/utilities/tailwind';
import { Spinner } from '@/components/Utilities/Spinner';

interface CommentInputProps {
  onSubmit: (content: string) => Promise<void>;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

const CommentInput: FC<CommentInputProps> = ({
  onSubmit,
  placeholder = 'Add a comment...',
  disabled = false,
  className = ''
}) => {
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!content.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onSubmit(content.trim());
      setContent('');
    } catch (error) {
      console.error('Failed to submit comment:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      handleSubmit(e);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={cn('relative', className)}>
      <div className="flex items-start space-x-3">
        <div className="flex-1">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled || isSubmitting}
            rows={3}
            className={cn(
              'block w-full rounded-lg border-gray-300 dark:border-gray-600',
              'bg-white dark:bg-gray-800',
              'text-gray-900 dark:text-gray-100',
              'placeholder-gray-500 dark:placeholder-gray-400',
              'focus:border-blue-500 focus:ring-blue-500 dark:focus:border-blue-400 dark:focus:ring-blue-400',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'resize-none transition-colors duration-200',
              'text-sm'
            )}
          />
          <div className="mt-2 flex items-center justify-between">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Press Ctrl+Enter to submit
            </p>
            <button
              type="submit"
              disabled={!content.trim() || disabled || isSubmitting}
              className={cn(
                'inline-flex items-center px-4 py-2 border border-transparent',
                'text-sm font-medium rounded-lg shadow-sm',
                'text-white bg-blue-600 hover:bg-blue-700',
                'dark:bg-blue-500 dark:hover:bg-blue-600',
                'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                'transition-colors duration-200'
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
      </div>
    </form>
  );
};

export default CommentInput;