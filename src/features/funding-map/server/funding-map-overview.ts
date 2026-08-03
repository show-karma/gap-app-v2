import * as Sentry from "@sentry/nextjs";
import { INDEXER } from "@/utilities/indexer";
import { getIndexerBaseUrl } from "@/utilities/wellKnown";
import type {
  FundingProgramResponse,
  OrganizationFiltersResponse,
  PaginatedFundingProgramsResponse,
} from "../types/funding-program";

const UPSTREAM_TIMEOUT_MS = 5000;
const REVALIDATE_SECONDS = 3600;

/** How many open programs get a crawlable link in the server HTML. */
export const FEATURED_PROGRAM_LIMIT = 12;

export interface FeaturedProgram {
  programId: string;
  name: string;
  communitySlug: string;
  communityName: string;
}

export interface FundingMapOverview {
  /** Total programs in the registry, or null when the upstream fetch failed. */
  totalPrograms: number | null;
  /** Programs currently open for applications, or null on fetch failure. */
  activePrograms: number | null;
  /** Organizations/communities with at least one program, or null on fetch failure. */
  organizationCount: number | null;
  /** Names of the organizations with the most programs (already sorted by the API). */
  topOrganizations: string[];
  /** Open on-Karma programs that have a community detail page to link to. */
  featuredPrograms: FeaturedProgram[];
}

export const EMPTY_OVERVIEW: FundingMapOverview = {
  totalPrograms: null,
  activePrograms: null,
  organizationCount: null,
  topOrganizations: [],
  featuredPrograms: [],
};

const TOP_ORGANIZATION_COUNT = 4;

async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(`${getIndexerBaseUrl()}${path}`, {
    next: { revalidate: REVALIDATE_SECONDS },
    signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
  });
  if (!res.ok) {
    throw new Error(`upstream ${res.status} for ${path}`);
  }
  return (await res.json()) as T;
}

function toFeaturedPrograms(programs: FundingProgramResponse[]): FeaturedProgram[] {
  const featured: FeaturedProgram[] = [];
  for (const program of programs) {
    const community = program.communities?.[0];
    if (!program.programId || !program.metadata?.title || !community?.slug || !community.name) {
      continue;
    }
    if (!program.isOnKarma) continue;
    featured.push({
      programId: program.programId,
      name: program.metadata.title,
      communitySlug: community.slug,
      communityName: community.name,
    });
    if (featured.length >= FEATURED_PROGRAM_LIMIT) break;
  }
  return featured;
}

/**
 * Server-side overview stats for /funding-map, rendered into the initial
 * HTML so crawlers and answer engines see real numbers and crawlable
 * program links without executing JavaScript. Reads the same
 * program-registry endpoints the client list uses, so the numbers can
 * never drift from what the page shows after hydration.
 *
 * Resilience contract mirrors `fetchToolCatalog` (/for-agents): 5s
 * timeout, 1h ISR, every failure captured to Sentry, and each stat
 * degrades independently to null/empty so a single slow endpoint never
 * blanks the whole intro.
 */
export async function fetchFundingMapOverview(): Promise<FundingMapOverview> {
  const [totalResult, activeResult, filtersResult] = await Promise.allSettled([
    fetchJson<PaginatedFundingProgramsResponse>(`${INDEXER.V2.REGISTRY.GET_ALL}?page=1&limit=1`),
    fetchJson<PaginatedFundingProgramsResponse>(
      `${INDEXER.V2.REGISTRY.GET_ALL}?page=1&limit=24&status=active`
    ),
    fetchJson<OrganizationFiltersResponse>(INDEXER.V2.REGISTRY.GET_FILTERS),
  ]);

  const overview: FundingMapOverview = { ...EMPTY_OVERVIEW };

  if (totalResult.status === "fulfilled") {
    overview.totalPrograms = totalResult.value.count ?? null;
  } else {
    captureOverviewFailure(totalResult.reason);
  }

  if (activeResult.status === "fulfilled") {
    overview.activePrograms = activeResult.value.count ?? null;
    overview.featuredPrograms = toFeaturedPrograms(activeResult.value.programs ?? []);
  } else {
    captureOverviewFailure(activeResult.reason);
  }

  if (filtersResult.status === "fulfilled") {
    const options = filtersResult.value.options ?? [];
    overview.organizationCount = options.length;
    overview.topOrganizations = options
      .slice(0, TOP_ORGANIZATION_COUNT)
      .map((option) => option.name)
      .filter((name): name is string => Boolean(name));
  } else {
    captureOverviewFailure(filtersResult.reason);
  }

  return overview;
}

function captureOverviewFailure(reason: unknown): void {
  Sentry.captureException(reason, {
    tags: { component: "funding-map/overview" },
  });
}
