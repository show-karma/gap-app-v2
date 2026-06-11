import type {
  ConditionOperator,
  FieldCondition,
  FieldConditionGroup,
} from "@/types/question-builder";

/**
 * Minimal structural shape shared by the three field types that carry
 * conditional visibility (builder FormField, platform IFormField, and
 * apply-feature ApplicationQuestion).
 */
export interface ConditionalFieldLike {
  id: string;
  type?: string;
  label?: string;
  visibleWhen?: FieldConditionGroup;
}

/** Field types that can be referenced as a condition source. */
export const CONDITION_SOURCE_TYPES: readonly string[] = [
  "text",
  "textarea",
  "email",
  "url",
  "number",
  "date",
  "select",
  "radio",
  "checkbox",
];

/** Allowed operators per condition-source field type. */
export const OPERATORS_BY_FIELD_TYPE: Record<string, readonly ConditionOperator[]> = {
  text: ["answered", "not_answered", "equals", "not_equals", "contains"],
  textarea: ["answered", "not_answered", "equals", "not_equals", "contains"],
  email: ["answered", "not_answered", "equals", "not_equals", "contains"],
  url: ["answered", "not_answered", "equals", "not_equals", "contains"],
  number: ["answered", "not_answered", "equals", "not_equals", "gt", "gte", "lt", "lte"],
  date: ["answered", "not_answered", "equals", "not_equals", "gt", "gte", "lt", "lte"],
  select: ["answered", "not_answered", "equals", "not_equals", "in"],
  radio: ["answered", "not_answered", "equals", "not_equals", "in"],
  checkbox: ["answered", "not_answered", "includes_any", "includes_all"],
};

/** Operators that do not require a comparison value. */
export const VALUELESS_OPERATORS: readonly ConditionOperator[] = ["answered", "not_answered"];

/** Operators whose comparison value is a list of options. */
export const MULTI_VALUE_OPERATORS: readonly ConditionOperator[] = [
  "in",
  "includes_any",
  "includes_all",
];

/** Human-readable operator labels for the builder UI and flow view. */
export const OPERATOR_LABELS: Record<ConditionOperator, string> = {
  answered: "is answered",
  not_answered: "is not answered",
  equals: "is",
  not_equals: "is not",
  in: "is any of",
  includes_any: "includes any of",
  includes_all: "includes all of",
  contains: "contains",
  gt: "is greater than",
  gte: "is at least",
  lt: "is less than",
  lte: "is at most",
};

/**
 * True when the value counts as an answer: non-empty string, number,
 * non-empty array, checkbox map with at least one checked option, or
 * boolean true.
 */
export function isAnswered(value: unknown): boolean {
  if (value === undefined || value === null) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (typeof value === "number") return !Number.isNaN(value);
  if (typeof value === "boolean") return value;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "object") {
    return Object.values(value as Record<string, unknown>).some((entry) => isAnswered(entry));
  }
  return true;
}

/**
 * Evaluates conditional field visibility.
 *
 * Semantics (shared contract with gap-indexer's FieldVisibilityService):
 * - A field without conditions is always visible.
 * - A condition referencing a missing or currently HIDDEN source field is
 *   not satisfied (visibility cascades down dependency chains).
 * - Conditions may only reference earlier fields (enforced at save time),
 *   so a single in-order pass is sufficient.
 * - Unknown operators evaluate to false — never throw at render time.
 *
 * @param resolveAnswer Client forms are keyed by field id: `(f) => values[f.id]`.
 */
export function evaluateVisibleFields(
  fields: readonly ConditionalFieldLike[],
  resolveAnswer: (field: ConditionalFieldLike) => unknown
): Set<string> {
  const visible = new Set<string>();
  const fieldsById = new Map(fields.map((field) => [field.id, field]));

  for (const field of fields) {
    const group = field.visibleWhen;
    if (!group || !Array.isArray(group.conditions) || group.conditions.length === 0) {
      visible.add(field.id);
      continue;
    }

    const results = group.conditions.map((condition) => {
      const source = fieldsById.get(condition.fieldId);
      if (!source || !visible.has(source.id)) {
        return false;
      }
      return evaluateCondition(condition, resolveAnswer(source));
    });

    const pass = group.combinator === "or" ? results.some(Boolean) : results.every(Boolean);
    if (pass) {
      visible.add(field.id);
    }
  }

  return visible;
}

/** Unique ids of all fields referenced by any condition in the form. */
export function getConditionSourceIds(fields: readonly ConditionalFieldLike[]): string[] {
  const sourceIds = new Set<string>();
  for (const field of fields) {
    for (const condition of field.visibleWhen?.conditions ?? []) {
      sourceIds.add(condition.fieldId);
    }
  }
  return Array.from(sourceIds);
}

/** Fields whose conditions reference the given field. */
export function getDependentFields<T extends ConditionalFieldLike>(
  fields: readonly T[],
  fieldId: string
): T[] {
  return fields.filter((field) =>
    (field.visibleWhen?.conditions ?? []).some((condition) => condition.fieldId === fieldId)
  );
}

/**
 * True when every condition references a field that appears EARLIER in the
 * list. Used to reject drag-reorders that would break the ordering invariant.
 */
export function isFieldOrderValid(fields: readonly ConditionalFieldLike[]): boolean {
  const seen = new Set<string>();
  for (const field of fields) {
    for (const condition of field.visibleWhen?.conditions ?? []) {
      if (!seen.has(condition.fieldId)) {
        return false;
      }
    }
    seen.add(field.id);
  }
  return true;
}

export interface ConditionIntegrityError {
  fieldId: string;
  message: string;
}

interface FieldWithOptions extends ConditionalFieldLike {
  options?: string[];
}

const MAX_CONDITIONS_PER_FIELD = 10;
const OPTION_TYPES = ["select", "radio", "checkbox"];

/**
 * Save-time validation of conditional logic. Mirrors gap-indexer's
 * FormConditionIntegrityService so invalid schemas are rejected before the
 * request is even made.
 */
export function validateConditionIntegrity(
  fields: readonly FieldWithOptions[]
): ConditionIntegrityError[] {
  const errors: ConditionIntegrityError[] = [];
  const indexById = new Map(fields.map((field, index) => [field.id, index]));

  fields.forEach((field, fieldIndex) => {
    const group = field.visibleWhen;
    if (!group) return;

    const fieldName = field.label || "Untitled field";

    if (field.type === "email") {
      errors.push({
        fieldId: field.id,
        message: `"${fieldName}": email fields cannot be conditional — they are required for application tracking`,
      });
      return;
    }

    if (!Array.isArray(group.conditions) || group.conditions.length === 0) {
      errors.push({
        fieldId: field.id,
        message: `"${fieldName}": conditional visibility requires at least one condition`,
      });
      return;
    }

    if (group.conditions.length > MAX_CONDITIONS_PER_FIELD) {
      errors.push({
        fieldId: field.id,
        message: `"${fieldName}": a field can have at most ${MAX_CONDITIONS_PER_FIELD} conditions`,
      });
      return;
    }

    for (const condition of group.conditions) {
      const error = validateSingleCondition(
        condition,
        field.id,
        fieldName,
        fieldIndex,
        fields,
        indexById
      );
      if (error) {
        errors.push(error);
      }
    }
  });

  return errors;
}

function validateSingleCondition(
  condition: FieldCondition,
  fieldId: string,
  fieldName: string,
  fieldIndex: number,
  fields: readonly FieldWithOptions[],
  indexById: Map<string, number>
): ConditionIntegrityError | null {
  const sourceIndex = indexById.get(condition.fieldId);

  if (sourceIndex === undefined) {
    return {
      fieldId,
      message: `"${fieldName}": condition references a question that no longer exists`,
    };
  }

  if (sourceIndex >= fieldIndex) {
    return {
      fieldId,
      message: `"${fieldName}": conditions may only reference questions that appear earlier in the form`,
    };
  }

  const source = fields[sourceIndex];
  const sourceName = source.label || "Untitled field";

  if (!source.type || !CONDITION_SOURCE_TYPES.includes(source.type)) {
    return {
      fieldId,
      message: `"${fieldName}": "${sourceName}" (${source.type}) cannot be used as a condition source`,
    };
  }

  const allowedOperators = OPERATORS_BY_FIELD_TYPE[source.type] ?? [];
  if (!allowedOperators.includes(condition.operator)) {
    return {
      fieldId,
      message: `"${fieldName}": operator "${OPERATOR_LABELS[condition.operator] ?? condition.operator}" is not valid for "${sourceName}"`,
    };
  }

  const needsValue = !VALUELESS_OPERATORS.includes(condition.operator);
  const hasValue =
    condition.value !== undefined &&
    condition.value !== null &&
    condition.value !== "" &&
    !(Array.isArray(condition.value) && condition.value.length === 0);

  if (needsValue && !hasValue) {
    return {
      fieldId,
      message: `"${fieldName}": condition on "${sourceName}" is missing a comparison value`,
    };
  }

  if (needsValue && source.type && OPTION_TYPES.includes(source.type)) {
    const options = source.options;
    if (Array.isArray(options) && options.length > 0) {
      const conditionValues = Array.isArray(condition.value)
        ? condition.value.map((entry) => String(entry))
        : [String(condition.value)];
      const unknown = conditionValues.find((entry) => !options.includes(entry));
      if (unknown !== undefined) {
        return {
          fieldId,
          message: `"${fieldName}": "${unknown}" is no longer an option of "${sourceName}"`,
        };
      }
    }
  }

  return null;
}

function evaluateCondition(condition: FieldCondition, rawValue: unknown): boolean {
  const values = normalizeToArray(rawValue);

  switch (condition.operator) {
    case "answered":
      return isAnswered(rawValue);
    case "not_answered":
      return !isAnswered(rawValue);
    case "equals":
      return values.length === 1 && values[0] === String(condition.value);
    case "not_equals":
      return !(values.length === 1 && values[0] === String(condition.value));
    case "in":
    case "includes_any":
      return toValueArray(condition.value).some((entry) => values.includes(entry));
    case "includes_all": {
      const expected = toValueArray(condition.value);
      return expected.length > 0 && expected.every((entry) => values.includes(entry));
    }
    case "contains":
      return (
        typeof rawValue === "string" &&
        condition.value !== undefined &&
        rawValue.toLowerCase().includes(String(condition.value).toLowerCase())
      );
    case "gt":
    case "gte":
    case "lt":
    case "lte":
      return compareOrdered(condition.operator, rawValue, condition.value);
    default:
      // Unknown operator from a newer schema version — fail closed.
      return false;
  }
}

function compareOrdered(
  operator: "gt" | "gte" | "lt" | "lte",
  rawValue: unknown,
  conditionValue: unknown
): boolean {
  const left = toComparable(rawValue);
  const right = toComparable(conditionValue);
  if (left === undefined || right === undefined) {
    return false;
  }
  if (operator === "gt") return left > right;
  if (operator === "gte") return left >= right;
  if (operator === "lt") return left < right;
  return left <= right;
}

/** Numbers compare numerically; non-numeric strings fall back to Date.parse. */
function toComparable(value: unknown): number | undefined {
  if (typeof value === "number") {
    return Number.isNaN(value) ? undefined : value;
  }
  if (typeof value !== "string" || value.trim() === "") {
    return undefined;
  }
  const asNumber = Number(value);
  if (!Number.isNaN(asNumber)) {
    return asNumber;
  }
  const asDate = Date.parse(value);
  return Number.isNaN(asDate) ? undefined : asDate;
}

/** Normalizes a condition value (scalar or array) to a string array. */
function toValueArray(value: unknown): string[] {
  if (value === undefined || value === null) return [];
  if (Array.isArray(value)) return value.map((entry) => String(entry));
  return [String(value)];
}

/**
 * Normalizes an answer to a string array for membership/equality checks.
 * Handles scalars, arrays, and checkbox maps ({ option: boolean }).
 */
function normalizeToArray(value: unknown): string[] {
  if (value === undefined || value === null) return [];
  if (typeof value === "string") return value === "" ? [] : [value];
  if (typeof value === "number" || typeof value === "boolean") {
    return [String(value)];
  }
  if (Array.isArray(value)) {
    return value.map((entry) => String(entry));
  }
  if (typeof value === "object") {
    return Object.entries(value as Record<string, unknown>)
      .filter(([, checked]) => checked === true)
      .map(([option]) => option);
  }
  return [];
}
