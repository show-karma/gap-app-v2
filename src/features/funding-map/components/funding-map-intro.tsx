import Link from "next/link";
import pluralize from "pluralize";
import { PAGES } from "@/utilities/pages";
import {
  EMPTY_OVERVIEW,
  type FundingMapOverview,
  fetchFundingMapOverview,
} from "../server/funding-map-overview";

/**
 * Answer-first intro for /funding-map, server-rendered on purpose: the
 * program list below is client-rendered behind React Query, so this
 * section is what crawlers and answer engines actually read. Counts come
 * from the same program-registry API the client list uses — never
 * hardcoded — and every sentence degrades gracefully when a stat is
 * unavailable (the Suspense fallback renders the same copy without
 * numbers, so the answer is in the shell either way).
 */
export async function FundingMapIntroSection() {
  const overview = await fetchFundingMapOverview();
  return <FundingMapIntro overview={overview} />;
}

export function FundingMapIntro({ overview }: { overview: FundingMapOverview }) {
  const { totalPrograms, activePrograms, organizationCount, topOrganizations } = overview;

  const hasScale = totalPrograms !== null && organizationCount !== null;
  const scale = hasScale
    ? ` It currently lists ${totalPrograms} funding ${pluralize("program", totalPrograms)} from ${organizationCount} ${pluralize(
        "organization",
        organizationCount
      )} and ecosystems${
        topOrganizations.length > 0 ? `, including ${formatNames(topOrganizations)}` : ""
      }${
        activePrograms !== null && activePrograms > 0
          ? ` — ${activePrograms} of them open for applications right now`
          : ""
      }.`
    : "";

  return (
    <section className="mx-auto w-full max-w-3xl px-6 pb-6 lg:px-8">
      <h2 className="sr-only">What the Funding Map is</h2>
      <p className="text-center text-base text-muted-foreground">
        The Karma Funding Map is a live directory of grants, retroactive funding, hackathons,
        bounties, and accelerator programs for web3 and open-source projects.{scale} Each entry
        shows what the program funds, its grant type and ecosystem, and how to apply — filter by
        status, category, ecosystem, or network below.
      </p>
    </section>
  );
}

/** Suspense fallback: identical copy without the fetched numbers. */
export function FundingMapIntroFallback() {
  return <FundingMapIntro overview={EMPTY_OVERVIEW} />;
}

/**
 * Crawlable links to open programs' detail pages. The interactive list
 * opens programs in a client-side dialog behind a `?programId=` query
 * parameter, which leaves the page without followable links to program
 * pages; these are plain anchors to the server-rendered
 * /community/[slug]/programs/[programId] routes. Hidden entirely when no
 * open on-Karma program is available.
 */
export async function FundingMapFeaturedLinksSection() {
  const overview = await fetchFundingMapOverview();
  const { featuredPrograms } = overview;
  if (featuredPrograms.length === 0) return null;

  return (
    <section className="w-full px-6 pb-12 lg:px-8">
      <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-6">
        <h2 className="text-xl font-semibold text-foreground">
          Open programs accepting applications on Karma
        </h2>
        <p className="text-sm text-muted-foreground">
          A sample of {featuredPrograms.length} {pluralize("program", featuredPrograms.length)}{" "}
          currently open for applications. Each program page has full details, past grants, and the
          application form.
        </p>
        <ul className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
          {featuredPrograms.map((program) => (
            <li key={`${program.communitySlug}-${program.programId}`}>
              <Link
                href={PAGES.COMMUNITY.PROGRAM_DETAIL(program.communitySlug, program.programId)}
                className="text-sm font-medium text-primary underline-offset-4 hover:underline"
              >
                {program.name}
              </Link>{" "}
              <span className="text-sm text-muted-foreground">— {program.communityName}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function formatNames(names: string[]): string {
  if (names.length <= 1) return names[0] ?? "";
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}
