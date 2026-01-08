interface FormField {
  id?: string;
  type?: string;
  label?: string;
}

interface FormSchemaLike {
  fields?: FormField[];
}

function isFormSchemaLike(value: unknown): value is FormSchemaLike {
  if (!value || typeof value !== "object") return false;
  const schema = value as Record<string, unknown>;
  return !schema.fields || Array.isArray(schema.fields);
}

export const createFieldTypeMap = (formSchema: unknown): Record<string, string> => {
  const types: Record<string, string> = {};
  if (!isFormSchemaLike(formSchema) || !formSchema.fields) return types;

  for (const field of formSchema.fields) {
    if (field.id && field.type) {
      types[field.id] = field.type;
    }
    if (field.label && field.type) {
      types[field.label] = field.type;
    }
  }
  return types;
};

export const createFieldLabelsMap = (formSchema: unknown): Record<string, string> => {
  const labels: Record<string, string> = {};
  if (!isFormSchemaLike(formSchema) || !formSchema.fields) return labels;

  for (const field of formSchema.fields) {
    if (field.id && field.label) {
      labels[field.id] = field.label;
    }
  }
  return labels;
};

/**
 * Common patterns that indicate a field contains funding/amount information.
 * Ordered by specificity - more specific patterns first.
 * Token-agnostic patterns to support any token type (OP, ARB, ETH, etc.)
 */
const AMOUNT_FIELD_PATTERNS = [
  /funding[_\s-]?amount/i,
  /requested[_\s-]?amount/i,
  /grant[_\s-]?amount/i,
  /budget[_\s-]?amount/i,
  /total[_\s-]?amount/i,
  /amount[_\s-]?requested/i,
  /funding[_\s-]?requested/i,
  /total.*requested/i, // Matches "Total OP Requested", "Total Amount Requested"
  /request.*locked/i, // Matches "OP Request Locked", "ARB Request Locked", etc.
  /request.*unlocked/i, // Matches "OP Request Unlocked", "ARB Request Unlocked", etc.
  /\brequest\b/i, // Matches any field containing "request" as a word (e.g., "OP request locked", "Token Request")
  /^amount$/i,
  /^funding$/i,
  /^budget$/i,
  /requested$/i, // Matches any field ending in "Requested"
];

/**
 * Helper to get value from applicationData by field id or label.
 * applicationData may use either field.id or field.label as keys.
 */
const getFieldValue = (
  applicationData: Record<string, unknown>,
  fieldId: string,
  fieldLabel?: string
): unknown => {
  // Try field.id first
  if (fieldId in applicationData) {
    return applicationData[fieldId];
  }
  // Fall back to field.label (some forms use labels as keys)
  if (fieldLabel && fieldLabel in applicationData) {
    return applicationData[fieldLabel];
  }
  return undefined;
};

export interface ExtractedAmountField {
  fieldId: string;
  fieldLabel: string;
  value: string | number;
}

/**
 * Extracts the funding/amount field from application data using the form schema.
 * Prioritizes number-type fields with amount-related labels.
 *
 * @param applicationData - The application's data object
 * @param formSchema - The form schema with field definitions
 * @returns The extracted amount field info, or null if not found
 */
export const extractAmountField = (
  applicationData: Record<string, unknown> | undefined,
  formSchema: unknown
): ExtractedAmountField | null => {
  if (!applicationData) {
    return null;
  }

  const schemaFields = isFormSchemaLike(formSchema) && formSchema.fields ? formSchema.fields : null;

  // First pass: Look for number-type fields with amount-related labels/ids (requires schema)
  if (schemaFields) {
    for (const pattern of AMOUNT_FIELD_PATTERNS) {
      for (const field of schemaFields) {
        if (!field.id) continue;

        const matchesId = pattern.test(field.id);
        const matchesLabel = field.label && pattern.test(field.label);

        if ((matchesId || matchesLabel) && field.type === "number") {
          const value = getFieldValue(applicationData, field.id, field.label);
          if (value !== undefined && value !== null && value !== "") {
            return {
              fieldId: field.id,
              fieldLabel: field.label || field.id,
              value: value as string | number,
            };
          }
        }
      }
    }

    // Second pass: Look for any field (not just number type) with amount-related labels
    // Some forms may use text fields for amounts
    for (const pattern of AMOUNT_FIELD_PATTERNS) {
      for (const field of schemaFields) {
        if (!field.id) continue;

        const matchesId = pattern.test(field.id);
        const matchesLabel = field.label && pattern.test(field.label);

        if (matchesId || matchesLabel) {
          const value = getFieldValue(applicationData, field.id, field.label);
          if (value !== undefined && value !== null && value !== "") {
            // Validate it looks like a number
            const numValue = Number(value);
            if (!Number.isNaN(numValue) && numValue > 0) {
              return {
                fieldId: field.id,
                fieldLabel: field.label || field.id,
                value: value as string | number,
              };
            }
          }
        }
      }
    }
  }

  // Third pass: Direct lookup in applicationData keys (fallback when schema doesn't match or fields not found)
  // This handles cases where applicationData keys are labels directly
  for (const pattern of AMOUNT_FIELD_PATTERNS) {
    for (const key of Object.keys(applicationData)) {
      if (pattern.test(key)) {
        const value = applicationData[key];
        if (value !== undefined && value !== null && value !== "") {
          const numValue = Number(value);
          if (!Number.isNaN(numValue) && numValue > 0) {
            return {
              fieldId: key,
              fieldLabel: key,
              value: value as string | number,
            };
          }
        }
      }
    }
  }

  return null;
};

export interface ApplicationSummaryField {
  label: string;
  value: string;
  isAmount?: boolean;
}

/**
 * Extracts key fields from application data for display in a summary view.
 * Returns the most relevant fields for admin review context.
 *
 * @param applicationData - The application's data object
 * @param formSchema - The form schema with field definitions
 * @param maxFields - Maximum number of fields to return (default: 5)
 * @returns Array of summary fields with labels and values
 */
export const extractApplicationSummary = (
  applicationData: Record<string, unknown> | undefined,
  formSchema: unknown,
  maxFields = 5
): ApplicationSummaryField[] => {
  if (!applicationData || !isFormSchemaLike(formSchema) || !formSchema.fields) {
    return [];
  }

  const summary: ApplicationSummaryField[] = [];
  const fieldLabels = createFieldLabelsMap(formSchema);

  // Priority patterns for fields to include in summary (in order)
  const priorityPatterns = [
    { pattern: /amount|funding|budget/i, isAmount: true },
    { pattern: /project[_\s-]?name|title|name/i, isAmount: false },
    { pattern: /description|summary|overview/i, isAmount: false },
    { pattern: /category|type/i, isAmount: false },
    { pattern: /timeline|duration/i, isAmount: false },
  ];

  const addedFieldIds = new Set<string>();

  // First, add fields matching priority patterns
  for (const { pattern, isAmount } of priorityPatterns) {
    if (summary.length >= maxFields) break;

    for (const field of formSchema.fields) {
      if (!field.id || addedFieldIds.has(field.id)) continue;
      if (summary.length >= maxFields) break;

      const matchesId = pattern.test(field.id);
      const matchesLabel = field.label && pattern.test(field.label);

      if (matchesId || matchesLabel) {
        const value = applicationData[field.id];
        if (value !== undefined && value !== null && value !== "") {
          const stringValue = formatSummaryValue(value);
          if (stringValue) {
            summary.push({
              label: fieldLabels[field.id] || field.id,
              value: stringValue,
              isAmount,
            });
            addedFieldIds.add(field.id);
          }
        }
      }
    }
  }

  // Fill remaining slots with other non-empty fields (excluding milestones and long text)
  if (summary.length < maxFields) {
    for (const field of formSchema.fields) {
      if (!field.id || addedFieldIds.has(field.id)) continue;
      if (summary.length >= maxFields) break;

      // Skip milestone fields and textarea (usually long content)
      if (field.type === "milestone" || field.type === "textarea") continue;

      const value = applicationData[field.id];
      if (value !== undefined && value !== null && value !== "") {
        const stringValue = formatSummaryValue(value);
        if (stringValue && stringValue.length <= 100) {
          summary.push({
            label: fieldLabels[field.id] || field.id,
            value: stringValue,
            isAmount: false,
          });
          addedFieldIds.add(field.id);
        }
      }
    }
  }

  return summary;
};

/**
 * Formats a field value for display in the summary.
 * Handles arrays, objects, and truncates long strings.
 */
function formatSummaryValue(value: unknown): string | null {
  if (value === undefined || value === null) return null;

  if (Array.isArray(value)) {
    // For arrays, join first few items
    if (value.length === 0) return null;
    if (typeof value[0] === "object") {
      // Skip complex objects like milestones
      return null;
    }
    return value.slice(0, 3).join(", ") + (value.length > 3 ? "..." : "");
  }

  if (typeof value === "object") {
    // Skip complex objects
    return null;
  }

  const stringValue = String(value).trim();
  if (!stringValue) return null;

  // Truncate long strings
  if (stringValue.length > 100) {
    return stringValue.substring(0, 97) + "...";
  }

  return stringValue;
}
