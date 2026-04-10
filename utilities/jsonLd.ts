/**
 * Safely serialize a JSON-LD schema object for embedding in a <script> tag.
 * Escapes </script> sequences to prevent XSS attacks from user-controlled content.
 */
export function safeJsonLdStringify(schema: Record<string, unknown>): string {
  return JSON.stringify(schema).replace(/<\/script/gi, "<\\/script");
}
