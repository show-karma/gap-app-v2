import type { Metadata } from "next";
import Link from "next/link";
import { PublicScorecard } from "@/src/features/scanner/components/public-scorecard";
import { getPublicScorecardBySlug } from "@/src/features/scanner/services/scanner.service";
import type { PublicScorecardPayload } from "@/src/features/scanner/types";
import { PAGES } from "@/utilities/pages";

interface PageProps {
  readonly params: Promise<{ slug: string }>;
}

async function loadScorecard(slug: string): Promise<PublicScorecardPayload | null> {
  try {
    return await getPublicScorecardBySlug(slug);
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const slug = (await params).slug;
  const scorecard = await loadScorecard(slug);
  const title = scorecard?.orgName
    ? `${scorecard.orgName} | AI-Readiness Scorecard`
    : "AI-Readiness Scorecard | Karma";
  const description = scorecard?.grade
    ? `Grade ${scorecard.grade} (${scorecard.totalScore}/100) on the Karma AI-Readiness Checker.`
    : "Karma AI-Readiness Checker scorecard.";
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [
        {
          url: PAGES.SCANNER.OG_IMAGE(slug),
          width: 1200,
          height: 630,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [PAGES.SCANNER.OG_IMAGE(slug)],
    },
  };
}

export default async function PublicScorecardPage({ params }: PageProps) {
  const slug = (await params).slug;
  const initial = await loadScorecard(slug);

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-12 px-6 py-12 sm:py-16">
      <PublicScorecard slug={slug} initialData={initial ?? undefined} />

      <aside className="flex flex-col gap-3 border-t border-zinc-200 pt-8 dark:border-zinc-800">
        <span className="font-mono text-[11px] uppercase tracking-wider text-zinc-500">
          Members area
        </span>
        <h2 className="font-display text-2xl tracking-tight text-zinc-900 dark:text-zinc-50">
          See the top fixes and per-check evidence
        </h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Log in to view the prioritized fix list, donate-flow walkthrough notes, and the full
          rubric breakdown for this scan.
        </p>
        <div className="flex flex-wrap gap-3 pt-1">
          <Link
            href={`${PAGES.SCANNER.ROOT}?return=${encodeURIComponent(PAGES.SCANNER.PUBLIC_SCORECARD(slug))}`}
            className="inline-flex items-center gap-1 rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
          >
            Log in
            <span aria-hidden>→</span>
          </Link>
          <Link
            href={PAGES.SCANNER.ROOT}
            className="inline-flex items-center gap-1 rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-900"
          >
            Scan another site
          </Link>
        </div>
      </aside>
    </main>
  );
}
