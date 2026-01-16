"use client";

import type { ProgramPrompt, PromptType } from "../types/program-prompt";
import { PromptTestPanel } from "./PromptTestPanel";
import {
  BulkEvaluationSection,
  PromptEditorActions,
  PromptEditorForm,
  PromptVersionInfo,
  usePromptEditorState,
} from "./prompt-editor";

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
  const {
    name,
    systemMessage,
    content,
    modelId,
    isDirty,
    isTestPanelOpen,
    setIsTestPanelOpen,
    availableModels,
    isLoadingModels,
    savePromptMutation,
    testPromptMutation,
    bulkEvaluationMutation,
    polledJobData,
    handleNameChange,
    handleSystemMessageChange,
    handleContentChange,
    handleModelChange,
    handleSave,
    handleTest,
    handleBulkEvaluate,
    isNewPrompt,
    canSave,
    canTest,
    canBulkEvaluate,
    isJobRunning,
  } = usePromptEditorState({
    programId,
    promptType,
    existingPrompt,
    initialJobId: bulkEvaluationJob?.id ?? null,
    onSaveSuccess,
    readOnly,
  });

  return (
    <div className="space-y-6">
      <PromptEditorForm
        promptType={promptType}
        existingPrompt={existingPrompt}
        legacyPromptId={legacyPromptId}
        readOnly={readOnly}
        name={name}
        systemMessage={systemMessage}
        content={content}
        modelId={modelId}
        availableModels={availableModels}
        isLoadingModels={isLoadingModels}
        onNameChange={handleNameChange}
        onSystemMessageChange={handleSystemMessageChange}
        onContentChange={handleContentChange}
        onModelChange={handleModelChange}
      />

      <PromptVersionInfo existingPrompt={existingPrompt} />

      <PromptEditorActions
        isNewPrompt={isNewPrompt}
        canSave={canSave}
        canTest={canTest}
        canBulkEvaluate={canBulkEvaluate}
        isSaving={savePromptMutation.isPending}
        isBulkEvaluating={bulkEvaluationMutation.isPending}
        isJobRunning={isJobRunning}
        onSave={handleSave}
        onOpenTestPanel={() => setIsTestPanelOpen(true)}
        onBulkEvaluate={handleBulkEvaluate}
      />

      {isDirty && (
        <p className="text-xs text-amber-600 dark:text-amber-400">
          You have unsaved changes. Save before testing or running bulk evaluation.
        </p>
      )}

      <BulkEvaluationSection
        programId={programId}
        promptType={promptType}
        activeJob={polledJobData ?? null}
        bulkEvaluationJob={bulkEvaluationJob}
        onRetry={handleBulkEvaluate}
      />

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
