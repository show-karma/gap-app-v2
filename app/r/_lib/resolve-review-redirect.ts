import { envVars } from "@/utilities/enviromentVars";
import { INDEXER } from "@/utilities/indexer";
import { normalizeProgramId } from "@/utilities/normalizeProgramId";

/**
 * Resolve the community slug that owns a funding program, server-side, via the
 * public program-config endpoint. The backend emits structure-agnostic
 * permalinks (`/r/<type>?programId=...`) precisely so this repo owns turning a
 * programId into a route — keeping frontend route knowledge out of the backend.
 *
 * Returns null when the program can't be resolved (bad id, 404, network) so the
 * caller can fall back to a 404 instead of redirecting somewhere wrong.
 */
export async function resolveCommunitySlug(programId: string): Promise<string | null> {
  try {
    const url = `${
      envVars.NEXT_PUBLIC_GAP_INDEXER_URL
    }${INDEXER.V2.FUNDING_PROGRAMS.GET(normalizeProgramId(programId))}`;
    const res = await fetch(url, { next: { revalidate: 300 } });
    if (!res.ok) return null;
    const body = await res.json();
    const program = body?.data ?? body;
    return program?.communitySlug ?? null;
  } catch {
    return null;
  }
}
