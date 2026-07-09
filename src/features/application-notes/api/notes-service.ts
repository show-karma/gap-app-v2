import fetchData from "@/utilities/fetchData";
import type { ApplicationNote } from "../types";

/**
 * Get the private reviewer/admin note for an application.
 * Returns null when no note exists yet (a 200 { note: null }).
 * THROWS on error (403/500) so the tab can render an error/retry state —
 * deliberately does NOT swallow to null.
 */
export async function getNote(referenceNumber: string): Promise<ApplicationNote | null> {
  const [data, error] = await fetchData<{ note: ApplicationNote | null }>(
    `/v2/applications/${referenceNumber}/notes`,
    "GET"
  );
  if (error) throw new Error(error);
  return data?.note ?? null;
}

/**
 * Create or overwrite the private note. Always authenticated (never
 * isAuthorized=false) so the backend can verify reviewer/admin.
 */
export async function saveNote(referenceNumber: string, content: string): Promise<ApplicationNote> {
  const [data, error] = await fetchData<{ note: ApplicationNote }>(
    `/v2/applications/${referenceNumber}/notes`,
    "PUT",
    { content }
  );
  if (error) throw new Error(error);
  return data!.note;
}
