import type { ApplicationQuestion, IFormField, IFormSchema } from "@/types/whitelabel-entities";

type FormFieldValue = unknown;
type PostApprovalData = Record<string, unknown>;

export function transformFormSchemaToQuestions(formSchema: IFormSchema): ApplicationQuestion[] {
  if (!formSchema.fields || !Array.isArray(formSchema.fields)) {
    return [];
  }

  return formSchema.fields.map((field: IFormField) => {
    return {
      id: field.id,
      type: (field.type || "text") as ApplicationQuestion["type"],
      label: field.label,
      description: field.description,
      required: field.required || false,
      placeholder: field.placeholder,
      options: field.options?.map((option) => ({
        value: option,
        label: option,
      })),
      validation: {
        min: field.validation?.min,
        max: field.validation?.max,
        pattern: field.validation?.pattern,
        maxLength: field.validation?.maxLength,
        fileTypes: field.validation?.fileTypes,
        maxFileSize: field.validation?.maxFileSize,
        maxMilestones: field.validation?.maxMilestones,
        minMilestones: field.validation?.minMilestones,
      },
    } as ApplicationQuestion;
  });
}

export function mapFieldsToLabels(
  fieldData: Record<string, FormFieldValue>,
  questions: ApplicationQuestion[]
): PostApprovalData {
  const mappedData: PostApprovalData = {};
  const idToLabelMap: Record<string, string> = {};
  for (const q of questions) {
    idToLabelMap[q.id] = q.label;
  }

  for (const [key, value] of Object.entries(fieldData)) {
    const fieldLabel = idToLabelMap[key];
    if (fieldLabel) {
      mappedData[fieldLabel] = value;
    } else {
      mappedData[key] = value;
    }
  }

  return mappedData;
}

export function mapLabelsToFields(
  labelData: PostApprovalData,
  questions: ApplicationQuestion[]
): Record<string, FormFieldValue> {
  const mappedData: Record<string, FormFieldValue> = {};
  const labelToIdMap: Record<string, string> = {};
  for (const q of questions) {
    labelToIdMap[q.label] = q.id;
  }

  for (const [key, value] of Object.entries(labelData)) {
    const fieldId = labelToIdMap[key];
    if (fieldId) {
      mappedData[fieldId] = value;
    }
  }

  return mappedData;
}

export function transformDataForSubmission(
  formData: Record<string, FormFieldValue>,
  questions: ApplicationQuestion[]
): PostApprovalData {
  const mappedData = mapFieldsToLabels(formData, questions);
  const cleanedData: PostApprovalData = {};

  for (const [key, value] of Object.entries(mappedData)) {
    if (value !== "" && value !== undefined) {
      if (Array.isArray(value)) {
        const cleanedArray = value
          .map((item) => {
            if (typeof item === "object" && item !== null) {
              const cleanedItem: Record<string, unknown> = {};
              for (const [k, v] of Object.entries(item as Record<string, unknown>)) {
                if (v !== "" && v !== undefined) {
                  cleanedItem[k] = v;
                }
              }
              return Object.keys(cleanedItem).length > 0 ? cleanedItem : null;
            }
            return item;
          })
          .filter((item) => item !== null);

        if (cleanedArray.length > 0) {
          cleanedData[key] = cleanedArray;
        }
      } else {
        cleanedData[key] = value;
      }
    }
  }

  return cleanedData;
}

export function transformDataForDisplay(
  apiData: PostApprovalData,
  questions: ApplicationQuestion[]
): Record<string, FormFieldValue> {
  const mappedData = mapLabelsToFields(apiData, questions);

  for (const q of questions) {
    if (!(q.id in mappedData)) {
      switch (q.type) {
        case "text":
        case "textarea":
        case "email":
        case "url":
        case "number":
        case "select":
        case "radio":
          mappedData[q.id] = "";
          break;
        case "checkbox":
          mappedData[q.id] = false;
          break;
        default:
          break;
      }
    }
  }

  return mappedData;
}
