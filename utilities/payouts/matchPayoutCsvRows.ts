export interface PayoutCsvRow {
  projectSlug: string;
  payoutAddress: string;
  amount: string;
}

export interface PayoutGrantRow {
  uid: string;
  projectUid: string;
  projectSlug: string;
}

export interface ResolvedProject {
  uid: string;
  pointers?: Array<{ originalProjectUID: string }> | null;
}

export type ProjectResolver = (slugOrUid: string) => Promise<ResolvedProject | null>;

export interface PayoutCsvMatch {
  grantUid: string;
  payoutAddress: string;
  amount: string;
}

export interface PayoutCsvMatchResult {
  matches: PayoutCsvMatch[];
  unmatchedProjects: string[];
}

const UID_PATTERN = /^0x[0-9a-fA-F]{64}$/;
const MAX_POINTER_HOPS = 3;

/**
 * A CSV may still name a profile that was merged into another project.
 * The row is resolved through the API and its pointers are followed to the
 * surviving project before it is matched against the table.
 */
export async function matchPayoutCsvRows(
  rows: PayoutCsvRow[],
  grants: PayoutGrantRow[],
  resolveProject: ProjectResolver
): Promise<PayoutCsvMatchResult> {
  const bySlug = new Map(grants.map((g) => [g.projectSlug.toLowerCase(), g]));
  const byUid = new Map(grants.map((g) => [g.projectUid.toLowerCase(), g]));
  const matches: PayoutCsvMatch[] = [];
  const unmatchedProjects: string[] = [];

  for (const row of rows) {
    const key = row.projectSlug.trim().toLowerCase();
    const grant =
      bySlug.get(key) ??
      byUid.get(key) ??
      (await resolveThroughPointers(key, byUid, resolveProject));
    if (grant) {
      matches.push({ grantUid: grant.uid, payoutAddress: row.payoutAddress, amount: row.amount });
    } else {
      unmatchedProjects.push(row.projectSlug);
    }
  }

  return { matches, unmatchedProjects };
}

async function resolveThroughPointers(
  slugOrUid: string,
  byUid: Map<string, PayoutGrantRow>,
  resolveProject: ProjectResolver
): Promise<PayoutGrantRow | undefined> {
  let current = await safeResolve(slugOrUid, resolveProject);
  for (let hop = 0; current && hop <= MAX_POINTER_HOPS; hop++) {
    const grant = byUid.get(current.uid.toLowerCase());
    if (grant) return grant;
    const original = current.pointers?.[0]?.originalProjectUID;
    if (!original || original === current.uid || !UID_PATTERN.test(original)) return undefined;
    current = await safeResolve(original, resolveProject);
  }
  return undefined;
}

async function safeResolve(
  slugOrUid: string,
  resolveProject: ProjectResolver
): Promise<ResolvedProject | null> {
  try {
    return await resolveProject(slugOrUid);
  } catch {
    return null;
  }
}
