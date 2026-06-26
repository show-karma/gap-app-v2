import type { Metadata } from "next";
import { MembersAreaCta } from "@/src/features/scanner/components/members-area-cta";
import { PublicScorecard } from "@/src/features/scanner/components/public-scorecard";
import { ScannerViewTracker } from "@/src/features/scanner/components/scanner-view-tracker";
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
      <ScannerViewTracker
        variant="public"
        scanId={initial?.scanId ?? null}
        slug={slug}
        grade={initial?.grade ?? null}
        totalScore={initial?.totalScore ?? null}
        orgName={initial?.orgName ?? null}
      />
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
        <MembersAreaCta scanId={initial?.scanId ?? slug} />
      </aside>
    </main>
  );
}
