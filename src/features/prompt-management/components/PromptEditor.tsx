"use client";

import { ChevronDown, FlaskConical, Loader2, Play, Save } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { MarkdownEditor } from "@/components/Utilities/MarkdownEditor";
import { useAvailableAIModels } from "@/hooks/useAvailableAIModels";
import { cn } from "@/utilities/tailwind";
import {
  useSavePrompt,
  useTestPrompt,
  useTriggerBulkEvaluation,
} from "../hooks/use-program-prompts";
import type { ProgramPrompt, PromptType, TestProgramPromptResult } from "../types/program-prompt";
import { BulkEvaluationProgress } from "./BulkEvaluationProgress";
import { PromptTestPanel } from "./PromptTestPanel";

interface PromptEditorProps {
  programId: string;
  promptType: PromptType;
  existingPrompt: ProgramPrompt | null;
  legacyPromptId?: string | null;
  onSaveSuccess?: (prompt: ProgramPrompt) => void;
  readOnly?: boolean;
  bulkEvaluationJob?: {
    id: string;
    status: "pending" | "running" | "completed" | "failed";
    totalApplications: number;
    completedApplications: number;
    failedApplications: number;
    errorApplicationId?: string | null;
    errorMessage?: string | null;
    startedAt: string;
    completedAt?: string | null;
    triggeredBy: string;
    programId: string;
    promptType: PromptType;
  } | null;
}

export function PromptEditor({
  programId,
  promptType,
  existingPrompt,
  legacyPromptId,
  onSaveSuccess,
  readOnly = false,
  bulkEvaluationJob,
}: PromptEditorProps) {
  // Form state
  const [name, setName] = useState(existingPrompt?.name || "");
  const [systemMessage, setSystemMessage] = useState(existingPrompt?.systemMessage || "");
  const [content, setContent] = useState(existingPrompt?.content || "");
  const [modelId, setModelId] = useState(existingPrompt?.modelId || "");
  const [isDirty, setIsDirty] = useState(false);
  const [isTestPanelOpen, setIsTestPanelOpen] = useState(false);
  const [currentJobId, setCurrentJobId] = useState<string | null>(bulkEvaluationJob?.id || null);

  // Fetch available AI models
  const { data: availableModels = [], isLoading: isLoadingModels } = useAvailableAIModels();

  // Mutations
  const savePromptMutation = useSavePrompt(programId, promptType, {
    onSuccess: (data) => {
      toast.success("Prompt saved successfully");
      setIsDirty(false);
      onSaveSuccess?.(data);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to save prompt");
    },
  });

  const testPromptMutation = useTestPrompt(programId, promptType);

  const bulkEvaluationMutation = useTriggerBulkEvaluation(programId, {
    onSuccess: (data) => {
      setCurrentJobId(data.jobId);
      toast.success(`Bulk evaluation started for ${data.totalApplications} applications`);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to start bulk evaluation");
    },
  });

  // Initialize model when models load
  useEffect(() => {
    if (availableModels.length > 0 && !modelId) {
      setModelId(existingPrompt?.modelId || availableModels[0]);
    }
  }, [availableModels, modelId, existingPrompt?.modelId]);

  // Sync with existing prompt when it changes
  useEffect(() => {
    if (existingPrompt) {
      setName(existingPrompt.name);
      setSystemMessage(existingPrompt.systemMessage || "");
      setContent(existingPrompt.content);
      setModelId(existingPrompt.modelId);
      setIsDirty(false);
    }
  }, [existingPrompt]);

  const handleSystemMessageChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setSystemMessage(e.target.value);
    setIsDirty(true);
  }, []);

  const handleContentChange = useCallback((value: string) => {
    setContent(value);
    setIsDirty(true);
  }, []);

  const handleModelChange = useCallback((value: string) => {
    setModelId(value);
    setIsDirty(true);
  }, []);

  const handleNameChange = useCallback(
    (value: string) => {
      // Only allow name change if there's no existing prompt
      if (!existingPrompt) {
        setName(value);
        setIsDirty(true);
      }
    },
    [existingPrompt]
  );

  const handleSave = useCallback(() => {
    if (!name.trim()) {
      toast.error("Prompt name is required");
      return;
    }
    if (!content.trim()) {
      toast.error("Prompt content is required");
      return;
    }
    if (!modelId) {
      toast.error("Please select an AI model");
      return;
    }

    // Check if "json" appears in system message or content (OpenAI requirement for JSON response format)
    const combinedText = `${systemMessage} ${content}`.toLowerCase();
    if (!combinedText.includes("json")) {
      toast.error(
        "Prompt must include the word 'json' for JSON response format (e.g., 'Respond in JSON format')"
      );
      return;
    }

    savePromptMutation.mutate({
      name: name.trim(),
      systemMessage: systemMessage.trim() || undefined,
      content: content.trim(),
      modelId,
    });
  }, [name, systemMessage, content, modelId, savePromptMutation]);

  const handleTest = useCallback(
    async (applicationId: string): Promise<TestProgramPromptResult> => {
      return new Promise((resolve, reject) => {
        testPromptMutation.mutate(
          { applicationId },
          {
            onSuccess: resolve,
            onError: reject,
          }
        );
      });
    },
    [testPromptMutation]
  );

  const handleBulkEvaluate = useCallback(() => {
    bulkEvaluationMutation.mutate(promptType);
  }, [bulkEvaluationMutation, promptType]);

  const isNewPrompt = !existingPrompt;
  const canSave = isDirty && name.trim() && content.trim() && modelId && !readOnly;
  const canTest = existingPrompt && !isDirty;
  const canBulkEvaluate = existingPrompt && !isDirty;

  // Show running job - prefer passed job, fall back to current job ID from mutation
  const activeJob = bulkEvaluationJob ?? null;
  const isJobRunning =
    activeJob?.status === "pending" ||
    activeJob?.status === "running" ||
    Boolean(currentJobId && !bulkEvaluationJob);

  return (
    <div className="space-y-6">
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
          onChange={(e) => handleNameChange(e.target.value)}
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
            onChange={(e) => handleModelChange(e.target.value)}
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
          onChange={handleSystemMessageChange}
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
          onChange={handleContentChange}
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

      {/* Langfuse Version Info */}
      {existingPrompt && (
        <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
          <span>
            <span className="font-medium">Langfuse Version:</span> {existingPrompt.langfuseVersion}
          </span>
          <span>
            <span className="font-medium">Last Updated:</span>{" "}
            {new Date(existingPrompt.updatedAt).toLocaleString()}
          </span>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
        <button
          type="button"
          onClick={handleSave}
          disabled={!canSave || savePromptMutation.isPending}
          className={cn(
            "inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-colors",
            "bg-blue-600 text-white hover:bg-blue-700",
            "disabled:opacity-50 disabled:cursor-not-allowed"
          )}
        >
          {savePromptMutation.isPending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              {isNewPrompt ? "Create Prompt" : "Save Changes"}
            </>
          )}
        </button>

        {canTest && (
          <button
            type="button"
            onClick={() => setIsTestPanelOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <FlaskConical className="w-4 h-4" />
            Test Prompt
          </button>
        )}

        {canBulkEvaluate && (
          <button
            type="button"
            onClick={handleBulkEvaluate}
            disabled={bulkEvaluationMutation.isPending || isJobRunning}
            className={cn(
              "inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-colors",
              "text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600",
              "hover:bg-gray-50 dark:hover:bg-gray-700",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          >
            {bulkEvaluationMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Starting...
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                Evaluate All Applications
              </>
            )}
          </button>
        )}
      </div>

      {/* Dirty state warning */}
      {isDirty && (
        <p className="text-xs text-amber-600 dark:text-amber-400">
          You have unsaved changes. Save before testing or running bulk evaluation.
        </p>
      )}

      {/* Bulk evaluation progress */}
      {activeJob && activeJob.status && (
        <BulkEvaluationProgress
          job={{
            id: activeJob.id,
            programId,
            promptType,
            status: activeJob.status,
            totalApplications: activeJob.totalApplications || 0,
            completedApplications: activeJob.completedApplications || 0,
            failedApplications: activeJob.failedApplications || 0,
            errorApplicationId: activeJob.errorApplicationId,
            errorMessage: activeJob.errorMessage,
            startedAt: activeJob.startedAt || new Date().toISOString(),
            completedAt: activeJob.completedAt,
            triggeredBy: activeJob.triggeredBy || "",
          }}
          onRetry={handleBulkEvaluate}
        />
      )}

      {/* Test Panel */}
      <PromptTestPanel
        programId={programId}
        promptType={promptType}
        isOpen={isTestPanelOpen}
        onClose={() => setIsTestPanelOpen(false)}
        onTest={handleTest}
        isLoading={testPromptMutation.isPending}
      />
    </div>
  );
}
