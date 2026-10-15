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
const RESOLVE_CONCURRENCY = 5;

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
  const bySlug = firstWins(grants, (g) => g.projectSlug);
  const byUid = firstWins(grants, (g) => g.projectUid);
  const keyOf = (row: PayoutCsvRow) => row.projectSlug.trim().toLowerCase();

  const unresolvedKeys = [
    ...new Set(rows.map(keyOf).filter((key) => !bySlug.has(key) && !byUid.has(key))),
  ];
  const resolved = new Map<string, PayoutGrantRow | undefined>();
  for (let i = 0; i < unresolvedKeys.length; i += RESOLVE_CONCURRENCY) {
    const chunk = unresolvedKeys.slice(i, i + RESOLVE_CONCURRENCY);
    const grantsForChunk = await Promise.all(
      chunk.map((key) => resolveThroughPointers(key, byUid, resolveProject))
    );
    for (const [index, key] of chunk.entries()) resolved.set(key, grantsForChunk[index]);
  }

  const matches: PayoutCsvMatch[] = [];
  const unmatchedProjects: string[] = [];
  for (const row of rows) {
    const key = keyOf(row);
    const grant = bySlug.get(key) ?? byUid.get(key) ?? resolved.get(key);
    if (grant) {
      matches.push({ grantUid: grant.uid, payoutAddress: row.payoutAddress, amount: row.amount });
    } else {
      unmatchedProjects.push(row.projectSlug);
    }
  }

  return { matches, unmatchedProjects };
}

// A project with several grants appears once per grant; the first row keeps
// the behaviour admins' existing sheets were written against.
function firstWins(
  grants: PayoutGrantRow[],
  keyOf: (grant: PayoutGrantRow) => string
): Map<string, PayoutGrantRow> {
  const map = new Map<string, PayoutGrantRow>();
  for (const grant of grants) {
    const key = keyOf(grant).toLowerCase();
    if (!map.has(key)) map.set(key, grant);
  }
  return map;
}

async function resolveThroughPointers(
  slugOrUid: string,
  byUid: Map<string, PayoutGrantRow>,
  resolveProject: ProjectResolver
): Promise<PayoutGrantRow | undefined> {
  let current = await safeResolve(slugOrUid, resolveProject);
  // Iteration 0 checks the project named by the row; the rest follow pointers.
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
