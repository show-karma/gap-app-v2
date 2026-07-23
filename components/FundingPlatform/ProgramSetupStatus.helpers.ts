/**
 * Determines if a program has its form configured
 * by checking the applicationConfig formSchema fields
 */
export function hasFormConfigured(
  applicationConfig: { formSchema?: { fields?: unknown[] } } | null | undefined
): boolean {
  return Boolean(
    applicationConfig?.formSchema?.fields && applicationConfig.formSchema.fields.length > 0
  );
}
