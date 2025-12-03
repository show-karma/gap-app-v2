import type { IFormSchema } from "@/types/funding-platform";

/**
 * Creates a mapping from field IDs and normalized field names to their labels
 * This helps match form fields to their human-readable labels regardless of key format
 */
export function createFieldLabelMap(formSchema?: IFormSchema): Record<string, string> {
  const labels: Record<string, string> = {};
  if (formSchema?.fields) {
    formSchema.fields.forEach((field) => {
      // Map field.id to field.label
      if (field.id && field.label) {
        labels[field.id] = field.label;
      }
      // Also map normalized field name (label.toLowerCase().replace(/\s+/g, "_"))
      const normalizedName = field.label.toLowerCase().replace(/\s+/g, "_");
      if (normalizedName) {
        labels[normalizedName] = field.label;
      }
    });
  }
  return labels;
}

/**
 * Gets a human-readable field label from a field key
 * Tries multiple matching strategies to handle different key formats
 */
export function getFieldLabel(fieldKey: string, fieldLabels: Record<string, string>): string {
  // First try exact match with field ID
  if (fieldLabels[fieldKey]) {
    return fieldLabels[fieldKey];
  }
  // Try case-insensitive match
  const lowerKey = fieldKey.toLowerCase();
  const matchedKey = Object.keys(fieldLabels).find((key) => key.toLowerCase() === lowerKey);
  if (matchedKey) {
    return fieldLabels[matchedKey];
  }
  // Fallback: format the key to be more readable
  // Remove "field_" prefix if present and format the rest
  const cleanedKey = fieldKey.replace(/^field_/, "").replace(/_/g, " ");
  // Capitalize first letter of each word
  return cleanedKey
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
