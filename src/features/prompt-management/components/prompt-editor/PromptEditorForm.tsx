"use client";

import { ChevronDown } from "lucide-react";
import { MarkdownEditor } from "@/components/Utilities/MarkdownEditor";
import { cn } from "@/utilities/tailwind";
import type { ProgramPrompt, PromptType } from "../../types/program-prompt";

interface PromptEditorFormProps {
  promptType: PromptType;
  existingPrompt: ProgramPrompt | null;
  legacyPromptId?: string | null;
  readOnly: boolean;
  // Form state
  name: string;
  systemMessage: string;
  content: string;
  modelId: string;
  availableModels: string[];
  isLoadingModels: boolean;
  // Handlers
  onNameChange: (value: string) => void;
  onSystemMessageChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onContentChange: (value: string) => void;
  onModelChange: (value: string) => void;
}

export function PromptEditorForm({
  promptType,
  existingPrompt,
  legacyPromptId,
  readOnly,
  name,
  systemMessage,
  content,
  modelId,
  availableModels,
  isLoadingModels,
  onNameChange,
  onSystemMessageChange,
  onContentChange,
  onModelChange,
}: PromptEditorFormProps) {
  const isNewPrompt = !existingPrompt;

  return (
    <>
      {/* Legacy prompt info */}
      {legacyPromptId && isNewPrompt && (
        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <p className="text-sm text-blue-700 dark:text-blue-300">
            <span className="font-medium">Legacy Langfuse Prompt:</span>{" "}
            <code className="bg-blue-100 dark:bg-blue-900/40 px-1 rounded">{legacyPromptId}</code>
          </p>
          <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
            Copy your prompt content from Langfuse to enable full editing capabilities.
          </p>
        </div>
      )}

      {/* Prompt Name */}
      <div>
        <label
          htmlFor={`prompt-name-${promptType}`}
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
        >
          Prompt Name *
          {existingPrompt && (
            <span className="ml-2 text-xs text-gray-500 dark:text-gray-400 font-normal">
              (Cannot be changed after creation)
            </span>
          )}
        </label>
        <input
          id={`prompt-name-${promptType}`}
          type="text"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          disabled={readOnly || !!existingPrompt}
          placeholder={`e.g., ${promptType === "external" ? "grant-review" : "internal-evaluation"}-prompt`}
          className={cn(
            "w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-gray-900 dark:text-white text-sm",
            "placeholder:text-gray-400 dark:placeholder:text-gray-500",
            "focus:outline-none focus:ring-2 focus:ring-blue-500",
            (readOnly || existingPrompt) &&
              "opacity-60 cursor-not-allowed bg-gray-50 dark:bg-gray-900"
          )}
        />
      </div>

      {/* AI Model Selection */}
      <div>
        <label
          htmlFor={`ai-model-${promptType}`}
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
        >
          AI Model *
        </label>
        <div className="relative">
          <select
            id={`ai-model-${promptType}`}
            value={modelId}
            onChange={(e) => onModelChange(e.target.value)}
            disabled={readOnly || isLoadingModels}
            className={cn(
              "w-full appearance-none rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 pr-10 text-gray-900 dark:text-white text-sm",
              "focus:outline-none focus:ring-2 focus:ring-blue-500",
              (readOnly || isLoadingModels) && "opacity-50 cursor-not-allowed"
            )}
          >
            {isLoadingModels ? (
              <option value="">Loading models...</option>
            ) : (
              availableModels.map((model) => (
                <option key={model} value={model}>
                  {model}
                </option>
              ))
            )}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {/* System Message */}
      <div>
        <label
          htmlFor={`system-message-${promptType}`}
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
        >
          System Message
          <span className="ml-2 text-xs text-gray-500 dark:text-gray-400 font-normal">
            (Optional - Sets the AI's behavior and context)
          </span>
        </label>
        <textarea
          id={`system-message-${promptType}`}
          value={systemMessage}
          onChange={onSystemMessageChange}
          disabled={readOnly}
          placeholder="You are a grant evaluator responsible for evaluating the incoming applications."
          rows={4}
          className={cn(
            "w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-gray-900 dark:text-white text-sm",
            "placeholder:text-gray-400 dark:placeholder:text-gray-500",
            "focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y",
            readOnly && "opacity-60 cursor-not-allowed bg-gray-50 dark:bg-gray-900"
          )}
        />
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          The system message defines the AI's role and behavior. It's sent as a separate "system"
          message in the LLM conversation.
        </p>
      </div>

      {/* Prompt Content (User Message) */}
      <div>
        <MarkdownEditor
          label="Prompt Content (User Message)"
          value={content}
          onChange={onContentChange}
          isRequired
          isDisabled={readOnly}
          placeholder="Evaluate the application based on criteria below"
          height={400}
          showCharacterCount
          maxLength={100000}
        />
        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          Use{" "}
          <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">
            {"{{grant_application}}"}
          </code>{" "}
          to control where application data appears. If not included, application data will be
          automatically appended at the end.
        </p>
        <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
          Important: Include the word "json" in your prompt (e.g., "Respond in JSON format") for
          proper response parsing.
        </p>
      </div>
    </>
  );
}
