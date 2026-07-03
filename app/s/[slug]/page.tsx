import type { Metadata } from "next";
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
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-12 px-6 py-12 sm:py-16">
      <ScannerViewTracker
        variant="public"
        scanId={initial?.scanId ?? null}
        slug={slug}
        grade={initial?.grade ?? null}
        totalScore={initial?.totalScore ?? null}
        orgName={initial?.orgName ?? null}
      />
      {/* Members-area CTA now lives inside PublicScorecard's success branch
          so it is not shown over a failed/absent scorecard. */}
      <PublicScorecard slug={slug} initialData={initial ?? undefined} />
    </main>
  );
}
