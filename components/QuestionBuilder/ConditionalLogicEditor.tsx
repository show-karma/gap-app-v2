"use client";

import { PlusIcon, TrashIcon } from "@heroicons/react/24/solid";
import { QuestionTooltip } from "@/components/Utilities/QuestionTooltip";
import type {
  ConditionOperator,
  FieldCondition,
  FieldConditionGroup,
  FormField,
} from "@/types/question-builder";
import {
  CONDITION_SOURCE_TYPES,
  MULTI_VALUE_OPERATORS,
  OPERATOR_LABELS,
  OPERATORS_BY_FIELD_TYPE,
  VALUELESS_OPERATORS,
} from "@/utilities/form-visibility/evaluate-field-visibility";

const MAX_CONDITIONS = 10;

const inputClass =
  "rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-100 disabled:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60";

interface ConditionalLogicEditorProps {
  field: FormField;
  allFields: FormField[];
  onUpdate: (field: FormField) => void;
  readOnly?: boolean;
}

interface ConditionValueInputProps {
  condition: FieldCondition;
  source?: FormField;
  readOnly: boolean;
  onChange: (value: FieldCondition["value"]) => void;
}

function MultiOptionValueInput({
  condition,
  options,
  readOnly,
  onChange,
}: ConditionValueInputProps & { options: string[] }) {
  const selected = Array.isArray(condition.value)
    ? condition.value.map((entry) => String(entry))
    : [];
  const staleValues = selected.filter((entry) => !options.includes(entry));

  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {options.map((option) => (
          <label
            key={option}
            className="flex items-center gap-1.5 text-sm text-gray-700 dark:text-gray-300"
          >
            <input
              type="checkbox"
              checked={selected.includes(option)}
              disabled={readOnly}
              onChange={(event) => {
                const next = event.target.checked
                  ? [...selected, option]
                  : selected.filter((entry) => entry !== option);
                onChange(next);
              }}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            {option}
          </label>
        ))}
      </div>
      {staleValues.length > 0 && (
        <p className="text-xs text-red-500">
          {`"${staleValues[0]}" is no longer an option of this question`}
        </p>
      )}
    </div>
  );
}

function SingleOptionValueInput({
  condition,
  options,
  readOnly,
  onChange,
}: ConditionValueInputProps & { options: string[] }) {
  const currentValue = condition.value !== undefined ? String(condition.value) : "";
  const isStale = currentValue !== "" && !options.includes(currentValue);

  return (
    <div className="flex flex-col gap-1">
      <select
        value={currentValue}
        disabled={readOnly}
        onChange={(event) => onChange(event.target.value)}
        className={inputClass}
        aria-label="Condition value"
      >
        {isStale && <option value={currentValue}>{currentValue} (removed)</option>}
        {currentValue === "" && <option value="">Select a value</option>}
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      {isStale && (
        <p className="text-xs text-red-500">
          {`"${currentValue}" is no longer an option of this question`}
        </p>
      )}
    </div>
  );
}

function FreeValueInput({ condition, source, readOnly, onChange }: ConditionValueInputProps) {
  const sourceType = source?.type;
  let inputType = "text";
  if (sourceType === "number") inputType = "number";
  if (sourceType === "date") inputType = "date";

  return (
    <input
      type={inputType}
      value={condition.value !== undefined ? String(condition.value) : ""}
      disabled={readOnly}
      onChange={(event) => {
        const raw = event.target.value;
        onChange(sourceType === "number" && raw !== "" ? Number(raw) : raw);
      }}
      placeholder="Value"
      className={`${inputClass} flex-1 min-w-0`}
      aria-label="Condition value"
    />
  );
}

function ConditionValueInput(props: ConditionValueInputProps) {
  if (VALUELESS_OPERATORS.includes(props.condition.operator)) {
    return null;
  }

  const options = props.source?.options ?? [];
  if (options.length > 0 && MULTI_VALUE_OPERATORS.includes(props.condition.operator)) {
    return <MultiOptionValueInput {...props} options={options} />;
  }
  if (options.length > 0) {
    return <SingleOptionValueInput {...props} options={options} />;
  }
  return <FreeValueInput {...props} />;
}

function defaultConditionFor(source: FormField): FieldCondition {
  if (["select", "radio"].includes(source.type) && source.options?.length) {
    return { fieldId: source.id, operator: "equals", value: source.options[0] };
  }
  if (source.type === "checkbox" && source.options?.length) {
    return {
      fieldId: source.id,
      operator: "includes_any",
      value: [source.options[0]],
    };
  }
  return { fieldId: source.id, operator: "answered" };
}

export function ConditionalLogicEditor({
  field,
  allFields,
  onUpdate,
  readOnly = false,
}: ConditionalLogicEditorProps) {
  const fieldIndex = allFields.findIndex((candidate) => candidate.id === field.id);
  const eligibleSources = allFields
    .slice(0, Math.max(fieldIndex, 0))
    .filter((candidate) => CONDITION_SOURCE_TYPES.includes(candidate.type));

  const group = field.visibleWhen;
  const isEnabled = !!group;

  const updateGroup = (next: FieldConditionGroup | undefined) => {
    if (readOnly) return;
    onUpdate({ ...field, visibleWhen: next });
  };

  const handleToggle = (checked: boolean) => {
    if (readOnly) return;
    if (!checked) {
      updateGroup(undefined);
      return;
    }
    const firstSource = eligibleSources[0];
    if (!firstSource) return;
    updateGroup({ combinator: "and", conditions: [defaultConditionFor(firstSource)] });
  };

  const updateCondition = (index: number, condition: FieldCondition) => {
    if (!group) return;
    const conditions = group.conditions.map((existing, i) => (i === index ? condition : existing));
    updateGroup({ ...group, conditions });
  };

  const handleSourceChange = (index: number, sourceId: string) => {
    const source = eligibleSources.find((candidate) => candidate.id === sourceId);
    if (!source) return;
    updateCondition(index, defaultConditionFor(source));
  };

  const handleOperatorChange = (index: number, operator: ConditionOperator) => {
    if (!group) return;
    const condition = group.conditions[index];
    const source = allFields.find((candidate) => candidate.id === condition.fieldId);
    let value = condition.value;
    if (VALUELESS_OPERATORS.includes(operator)) {
      value = undefined;
    } else if (MULTI_VALUE_OPERATORS.includes(operator)) {
      value = Array.isArray(value) ? value : value !== undefined ? [String(value)] : [];
    } else if (Array.isArray(value)) {
      value = value[0] ?? (source?.options?.[0] || "");
    }
    updateCondition(index, { ...condition, operator, value });
  };

  const handleAddCondition = () => {
    if (!group || group.conditions.length >= MAX_CONDITIONS) return;
    const firstSource = eligibleSources[0];
    if (!firstSource) return;
    updateGroup({
      ...group,
      conditions: [...group.conditions, defaultConditionFor(firstSource)],
    });
  };

  const handleRemoveCondition = (index: number) => {
    if (!group) return;
    const conditions = group.conditions.filter((_, i) => i !== index);
    if (conditions.length === 0) {
      updateGroup(undefined);
      return;
    }
    updateGroup({ ...group, conditions });
  };

  return (
    <div className="border-t border-gray-200 dark:border-gray-600 pt-4">
      <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Conditional Logic</h4>

      {eligibleSources.length === 0 ? (
        <p className="text-xs text-gray-500 dark:text-gray-400">
          To show this question conditionally, add an answerable question (like a dropdown or radio)
          above it first.
        </p>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center">
            <input
              id={`conditional-toggle-${field.id}`}
              type="checkbox"
              checked={isEnabled}
              disabled={readOnly}
              onChange={(event) => handleToggle(event.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
            />
            <label
              htmlFor={`conditional-toggle-${field.id}`}
              className="ml-2 text-sm text-gray-700 dark:text-gray-300"
            >
              Show this question conditionally
            </label>
            <QuestionTooltip
              content="Only show this question when earlier answers match the conditions below. Hidden questions are never required and their answers are not submitted."
              className="ml-2"
            />
          </div>

          {isEnabled && group && (
            <div className="space-y-2 rounded-lg bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-gray-700 p-3">
              {group.conditions.length > 1 && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 dark:text-gray-400">Show when</span>
                  <select
                    value={group.combinator}
                    disabled={readOnly}
                    onChange={(event) =>
                      updateGroup({
                        ...group,
                        combinator: event.target.value === "or" ? "or" : "and",
                      })
                    }
                    className={inputClass}
                    aria-label="Condition combinator"
                  >
                    <option value="and">all conditions match</option>
                    <option value="or">any condition matches</option>
                  </select>
                </div>
              )}

              {group.conditions.map((condition, index) => {
                const source = allFields.find((candidate) => candidate.id === condition.fieldId);
                const operators = source ? (OPERATORS_BY_FIELD_TYPE[source.type] ?? []) : [];
                return (
                  <div
                    key={`${condition.fieldId}-${index}`}
                    className="flex flex-wrap items-start gap-2"
                  >
                    <select
                      value={condition.fieldId}
                      disabled={readOnly}
                      onChange={(event) => handleSourceChange(index, event.target.value)}
                      className={`${inputClass} max-w-[200px]`}
                      aria-label="Condition question"
                    >
                      {!eligibleSources.some((candidate) => candidate.id === condition.fieldId) && (
                        <option value={condition.fieldId}>Deleted question</option>
                      )}
                      {eligibleSources.map((candidate) => (
                        <option key={candidate.id} value={candidate.id}>
                          {candidate.label || "Untitled question"}
                        </option>
                      ))}
                    </select>

                    <select
                      value={condition.operator}
                      disabled={readOnly}
                      onChange={(event) =>
                        handleOperatorChange(index, event.target.value as ConditionOperator)
                      }
                      className={inputClass}
                      aria-label="Condition operator"
                    >
                      {operators.map((operator) => (
                        <option key={operator} value={operator}>
                          {OPERATOR_LABELS[operator]}
                        </option>
                      ))}
                    </select>

                    <ConditionValueInput
                      condition={condition}
                      source={source}
                      readOnly={readOnly}
                      onChange={(value) => updateCondition(index, { ...condition, value })}
                    />

                    {!readOnly && (
                      <button
                        type="button"
                        onClick={() => handleRemoveCondition(index)}
                        className="p-2 text-red-400 hover:text-red-600"
                        aria-label="Remove condition"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                );
              })}

              {!readOnly && group.conditions.length < MAX_CONDITIONS && (
                <button
                  type="button"
                  onClick={handleAddCondition}
                  className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400"
                >
                  <PlusIcon className="w-4 h-4" />
                  Add condition
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
