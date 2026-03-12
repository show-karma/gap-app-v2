"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/Utilities/Button";
import { useDefaultSystemPrompt } from "@/src/features/judge-agent/hooks/use-default-system-prompt";
import type { FormSchema } from "@/types/question-builder";

export interface JudgingCriterion {
  id: string;
  name: string;
  description: string;
  weight: number;
  maxScore: number;
}

interface JudgingCriteriaEditorProps {
  schema: FormSchema;
  onUpdate?: (schema: FormSchema) => void;
  readOnly?: boolean;
}

function generateId(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || `c-${Date.now()}`
  );
}

export function JudgingCriteriaEditor({
  schema,
  onUpdate,
  readOnly = false,
}: JudgingCriteriaEditorProps) {
  const { data: defaultPrompt, isLoading: isLoadingPrompt } = useDefaultSystemPrompt();
  const savedPrompt = (schema.settings as any)?.judgeAgentSystemPrompt as string | undefined;

  const [criteria, setCriteria] = useState<JudgingCriterion[]>(
    (schema.settings as any)?.judgingCriteria ?? []
  );
  const [systemPrompt, setSystemPrompt] = useState<string>(savedPrompt ?? "");
  const [showPromptEditor, setShowPromptEditor] = useState(false);
  const schemaRef = useRef(schema);
  const onUpdateRef = useRef(onUpdate);

  // Once default prompt loads, if no saved prompt, populate with default
  const initializedRef = useRef(false);
  useEffect(() => {
    if (defaultPrompt && !initializedRef.current) {
      initializedRef.current = true;
      if (!savedPrompt) {
        setSystemPrompt(defaultPrompt);
      }
    }
  }, [defaultPrompt, savedPrompt]);

  useEffect(() => {
    schemaRef.current = schema;
  }, [schema]);
  useEffect(() => {
    onUpdateRef.current = onUpdate;
  }, [onUpdate]);

  const syncToParent = useCallback(
    (updatedCriteria: JudgingCriterion[], updatedPrompt?: string) => {
      onUpdateRef.current?.({
        ...schemaRef.current,
        settings: {
          ...schemaRef.current.settings,
          judgingCriteria: updatedCriteria,
          judgeAgentSystemPrompt:
            updatedPrompt !== undefined
              ? updatedPrompt
              : (schemaRef.current.settings as any)?.judgeAgentSystemPrompt,
        } as any,
      });
    },
    []
  );

  const syncPromptToParent = useCallback((prompt: string) => {
    onUpdateRef.current?.({
      ...schemaRef.current,
      settings: {
        ...schemaRef.current.settings,
        judgeAgentSystemPrompt: prompt || undefined,
      } as any,
    });
  }, []);

  const handleAdd = useCallback(() => {
    setCriteria((prev) => {
      const next = [
        ...prev,
        { id: `criterion-${Date.now()}`, name: "", description: "", weight: 20, maxScore: 10 },
      ];
      syncToParent(next);
      return next;
    });
  }, [syncToParent]);

  const handleRemove = useCallback(
    (index: number) => {
      setCriteria((prev) => {
        const next = prev.filter((_, i) => i !== index);
        syncToParent(next);
        return next;
      });
    },
    [syncToParent]
  );

  const handleChange = useCallback(
    (index: number, field: keyof JudgingCriterion, value: string | number) => {
      setCriteria((prev) =>
        prev.map((c, i) => {
          if (i !== index) return c;
          const updated = { ...c, [field]: value };
          if (field === "name") updated.id = generateId(value as string);
          return updated;
        })
      );
    },
    []
  );

  const handleBlur = useCallback(() => {
    syncToParent(criteria);
  }, [criteria, syncToParent]);

  const totalWeight = criteria.reduce((s, c) => s + c.weight, 0);

  return (
    <div className="space-y-5">
      {/* Gemini System Prompt */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Gemini Judge System Prompt
          </span>
          <div className="flex items-center gap-2">
            {showPromptEditor && !readOnly && systemPrompt !== defaultPrompt && (
              <button
                type="button"
                onClick={() => {
                  const reset = defaultPrompt || "";
                  setSystemPrompt(reset);
                  syncPromptToParent("");
                }}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
              >
                Reset to Default
              </button>
            )}
            <button
              type="button"
              onClick={() => setShowPromptEditor(!showPromptEditor)}
              className="text-xs text-gray-500 dark:text-gray-400 hover:underline"
            >
              {showPromptEditor ? "Hide" : "Customize"}
            </button>
          </div>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Customize the system prompt sent to Gemini. Use placeholders: {`{{hackathon}}`},{" "}
          {`{{criteria}}`}, {`{{submission}}`}, {`{{github}}`}, {`{{karma_project}}`},{" "}
          {`{{application_data}}`}, {`{{process}}`}.
        </p>
        {showPromptEditor &&
          (isLoadingPrompt ? (
            <div className="flex items-center justify-center py-6">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600" />
            </div>
          ) : (
            <textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              onBlur={() => syncPromptToParent(systemPrompt)}
              disabled={readOnly}
              rows={12}
              className="w-full rounded-md border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-gray-900 dark:text-zinc-100 font-mono resize-y disabled:opacity-50"
            />
          ))}
      </div>

      <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Define custom criteria for the AI judge agent to evaluate demo video submissions. Leave
          empty to use the default set.
        </p>
      </div>

      {criteria.length === 0 ? (
        <div className="text-center py-8 border border-dashed border-gray-200 dark:border-gray-700 rounded-lg">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
            No custom criteria. Default criteria will be used.
          </p>
          {!readOnly && (
            <Button onClick={handleAdd} className="mx-auto">
              Add First Criterion
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {criteria.map((criterion, index) => (
            <div
              key={criterion.id || index}
              className="border border-gray-200 dark:border-gray-600 rounded-lg p-4 space-y-3"
            >
              <div className="flex items-start justify-between">
                <span className="text-xs text-gray-400 dark:text-gray-500 font-medium">
                  Criterion {index + 1}
                </span>
                {!readOnly && (
                  <button
                    type="button"
                    onClick={() => handleRemove(index)}
                    className="text-xs text-red-500 hover:text-red-700 dark:hover:text-red-400"
                  >
                    Remove
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                    Name
                  </span>
                  <input
                    type="text"
                    value={criterion.name}
                    onChange={(e) => handleChange(index, "name", e.target.value)}
                    onBlur={handleBlur}
                    disabled={readOnly}
                    placeholder="e.g., Innovation"
                    className="w-full rounded-md border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-1.5 text-sm text-gray-900 dark:text-zinc-100 disabled:opacity-50"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                      Weight (%)
                    </span>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={criterion.weight}
                      onChange={(e) =>
                        handleChange(
                          index,
                          "weight",
                          e.target.value === "" ? ("" as any) : parseInt(e.target.value, 10)
                        )
                      }
                      onBlur={(e) => {
                        const val = parseInt(e.target.value, 10);
                        if (isNaN(val)) handleChange(index, "weight", 0);
                        handleBlur();
                      }}
                      disabled={readOnly}
                      className="w-full rounded-md border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-1.5 text-sm text-gray-900 dark:text-zinc-100 disabled:opacity-50"
                    />
                  </div>
                  <div>
                    <span className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                      Max Score
                    </span>
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={criterion.maxScore}
                      onChange={(e) =>
                        handleChange(
                          index,
                          "maxScore",
                          e.target.value === "" ? ("" as any) : parseInt(e.target.value, 10)
                        )
                      }
                      onBlur={(e) => {
                        const val = parseInt(e.target.value, 10);
                        if (isNaN(val)) handleChange(index, "maxScore", 10);
                        handleBlur();
                      }}
                      disabled={readOnly}
                      className="w-full rounded-md border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-1.5 text-sm text-gray-900 dark:text-zinc-100 disabled:opacity-50"
                    />
                  </div>
                </div>
              </div>

              <div>
                <span className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Description
                </span>
                <textarea
                  value={criterion.description}
                  onChange={(e) => handleChange(index, "description", e.target.value)}
                  onBlur={handleBlur}
                  disabled={readOnly}
                  placeholder="What should the judge evaluate?"
                  rows={2}
                  className="w-full rounded-md border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-1.5 text-sm text-gray-900 dark:text-zinc-100 resize-none disabled:opacity-50"
                />
              </div>
            </div>
          ))}

          <div className="flex items-center justify-between pt-1">
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Total weight:{" "}
              <span
                className={
                  totalWeight === 100
                    ? "text-green-600 dark:text-green-400 font-medium"
                    : "text-red-600 dark:text-red-400 font-medium"
                }
              >
                {totalWeight}%
              </span>
              {" / 100%"}
              <span className="ml-3">{criteria.length} criteria</span>
            </div>
            {!readOnly && (
              <button
                type="button"
                onClick={handleAdd}
                className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
              >
                + Add Criterion
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
