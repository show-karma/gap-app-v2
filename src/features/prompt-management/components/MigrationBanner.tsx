"use client";

import { AlertTriangle, ExternalLink, X } from "lucide-react";
import { useState } from "react";

interface MigrationBannerProps {
  legacyPromptIds: {
    external: string | null;
    internal: string | null;
  };
  onDismiss?: () => void;
}

export function MigrationBanner({ legacyPromptIds, onDismiss }: MigrationBannerProps) {
  const [isDismissed, setIsDismissed] = useState(false);

  if (isDismissed) {
    return null;
  }

  const hasLegacyExternal = !!legacyPromptIds.external;
  const hasLegacyInternal = !!legacyPromptIds.internal;

  const handleDismiss = () => {
    setIsDismissed(true);
    onDismiss?.();
  };

  return (
    <div className="relative bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-6">
      <button
        type="button"
        onClick={handleDismiss}
        className="absolute top-2 right-2 p-1 text-yellow-600 dark:text-yellow-400 hover:text-yellow-800 dark:hover:text-yellow-200 transition-colors"
        aria-label="Dismiss migration banner"
      >
        <X className="w-4 h-4" />
      </button>

      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
        <div className="flex-1 pr-6">
          <h4 className="text-sm font-semibold text-yellow-800 dark:text-yellow-200 mb-1">
            Prompt Migration Required
          </h4>
          <p className="text-sm text-yellow-700 dark:text-yellow-300 mb-3">
            Your program is using legacy Langfuse prompt references. To enable full prompt editing,
            please copy your prompt content from Langfuse and save it here.
          </p>

          <div className="text-xs text-yellow-600 dark:text-yellow-400 space-y-1 mb-3">
            {hasLegacyExternal && (
              <p>
                <span className="font-medium">External AI Prompt:</span>{" "}
                <code className="bg-yellow-100 dark:bg-yellow-900/40 px-1 rounded">
                  {legacyPromptIds.external}
                </code>
              </p>
            )}
            {hasLegacyInternal && (
              <p>
                <span className="font-medium">Internal Evaluation Prompt:</span>{" "}
                <code className="bg-yellow-100 dark:bg-yellow-900/40 px-1 rounded">
                  {legacyPromptIds.internal}
                </code>
              </p>
            )}
          </div>

          <a
            href="https://cloud.langfuse.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm text-yellow-700 dark:text-yellow-300 hover:text-yellow-900 dark:hover:text-yellow-100 font-medium transition-colors"
          >
            Open Langfuse Dashboard
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </div>
  );
}
