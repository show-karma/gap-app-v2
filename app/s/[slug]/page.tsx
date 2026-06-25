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
    : "AI-Readiness Scorecard";
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
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-12">
      <PublicScorecard slug={slug} initialData={initial ?? undefined} />

      <section className="flex flex-col items-start gap-2 rounded-2xl border border-zinc-200 bg-zinc-50 p-5 dark:border-zinc-800 dark:bg-zinc-900/40">
        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
          See the top 3 fixes and per-check evidence
        </h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Log in to view the prioritized fix list, donate-flow walkthrough notes, and the full
          rubric breakdown for this scan.
        </p>
        <Link
          href={`${PAGES.SCANNER.ROOT}?return=${encodeURIComponent(PAGES.SCANNER.PUBLIC_SCORECARD(slug))}`}
          className="text-sm font-medium text-primary-600 underline-offset-2 hover:underline dark:text-primary-400"
        >
          Log in to see the full report
        </Link>
      </section>
    </main>
  );
}
