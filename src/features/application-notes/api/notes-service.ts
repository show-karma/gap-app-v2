import { api } from "@/utilities/api/client";
import type { ApplicationNote } from "../types";

/**
 * Get the private reviewer/admin note for an application.
 * Returns null when no note exists yet (a 200 { note: null }).
 * THROWS on error (403/500) so the tab can render an error/retry state —
 * deliberately does NOT swallow to null (api.get throws the typed ApiError).
 */
export async function getNote(referenceNumber: string): Promise<ApplicationNote | null> {
  // TODO(#1775): add zod schema
  const data = await api.get<{ note: ApplicationNote | null }>(
    `/v2/applications/${referenceNumber}/notes`
  );
  return data?.note ?? null;
}

/**
 * Create or overwrite the private note. Always authenticated (never
 * isAuthorized=false) so the backend can verify reviewer/admin.
 */
export async function saveNote(referenceNumber: string, content: string): Promise<ApplicationNote> {
  // TODO(#1775): add zod schema
  const data = await api.put<{ note: ApplicationNote }>(
    `/v2/applications/${referenceNumber}/notes`,
    { content }
  );
  if (!data) throw new Error("Failed to save note");
  return data.note;
}
