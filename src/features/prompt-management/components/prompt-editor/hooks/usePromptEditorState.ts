"use client";

import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useAvailableAIModels } from "@/hooks/useAvailableAIModels";
import {
  useBulkEvaluationJobPolling,
  useSavePrompt,
  useTestPrompt,
  useTriggerBulkEvaluation,
} from "../../../hooks/use-program-prompts";
import type {
  ProgramPrompt,
  PromptType,
  TestProgramPromptResult,
} from "../../../types/program-prompt";

interface UsePromptEditorStateProps {
  programId: string;
  promptType: PromptType;
  existingPrompt: ProgramPrompt | null;
  initialJobId?: string | null;
  onSaveSuccess?: (prompt: ProgramPrompt) => void;
  readOnly?: boolean;
}

export function usePromptEditorState({
  programId,
  promptType,
  existingPrompt,
  initialJobId = null,
  onSaveSuccess,
  readOnly = false,
}: UsePromptEditorStateProps) {
  // Form state
  const [name, setName] = useState(existingPrompt?.name || "");
  const [systemMessage, setSystemMessage] = useState(existingPrompt?.systemMessage || "");
  const [content, setContent] = useState(existingPrompt?.content || "");
  const [modelId, setModelId] = useState(existingPrompt?.modelId || "");
  const [isDirty, setIsDirty] = useState(false);
  const [isTestPanelOpen, setIsTestPanelOpen] = useState(false);
  const [currentJobId, setCurrentJobId] = useState<string | null>(initialJobId);

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

  // Poll for job status when we have a job ID
  const { data: polledJobData } = useBulkEvaluationJobPolling(programId, currentJobId, {
    onComplete: (job) => {
      if (job.status === "completed") {
        toast.success(
          `Evaluation complete: ${job.completedApplications} of ${job.totalApplications} applications processed`
        );
      } else if (job.status === "failed") {
        toast.error(`Evaluation failed: ${job.errorMessage || "Unknown error"}`);
      }
      setCurrentJobId(null);
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

  // Handlers
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

  // Derived state
  const isNewPrompt = !existingPrompt;
  const canSave = isDirty && !!name.trim() && !!content.trim() && !!modelId && !readOnly;
  const canTest = !!existingPrompt && !isDirty;
  const canBulkEvaluate = !!existingPrompt && !isDirty;
  const isJobRunning = Boolean(currentJobId && !polledJobData);

  return {
    // Form state
    name,
    systemMessage,
    content,
    modelId,
    isDirty,
    isTestPanelOpen,
    setIsTestPanelOpen,

    // Models
    availableModels,
    isLoadingModels,

    // Mutations
    savePromptMutation,
    testPromptMutation,
    bulkEvaluationMutation,

    // Job data
    polledJobData,
    currentJobId,

    // Handlers
    handleNameChange,
    handleSystemMessageChange,
    handleContentChange,
    handleModelChange,
    handleSave,
    handleTest,
    handleBulkEvaluate,

    // Derived state
    isNewPrompt,
    canSave,
    canTest,
    canBulkEvaluate,
    isJobRunning,
  };
}
