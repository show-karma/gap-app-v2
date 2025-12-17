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
