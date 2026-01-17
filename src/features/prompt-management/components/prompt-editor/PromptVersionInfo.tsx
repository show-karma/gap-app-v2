"use client";

import type { ProgramPrompt } from "../../types/program-prompt";

interface PromptVersionInfoProps {
  existingPrompt: ProgramPrompt | null;
}

export function PromptVersionInfo({ existingPrompt }: PromptVersionInfoProps) {
  if (!existingPrompt) {
    return null;
  }

  return (
    <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
      <span>
        <span className="font-medium">Langfuse Version:</span> {existingPrompt.langfuseVersion}
      </span>
      <span>
        <span className="font-medium">Last Updated:</span>{" "}
        {new Date(existingPrompt.updatedAt).toLocaleString()}
      </span>
    </div>
  );
}
