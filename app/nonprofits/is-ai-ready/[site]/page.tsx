import type { Metadata } from "next";
import { ErrorState } from "@/src/features/scanner/components/error-state";
import { ScannerSiteReport } from "@/src/features/scanner/components/scanner-site-report";
import { isDomainParam } from "@/src/features/scanner/utils/site";
import { customMetadata } from "@/utilities/meta";

interface SitePageParams {
  site: string;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<SitePageParams>;
}): Promise<Metadata> {
  const { site } = await params;
  const domain = decodeURIComponent(site);
  return customMetadata({
    title: `Is ${domain} AI-ready? — Karma`,
    description: `See how well ${domain} can be discovered, read, and acted on by AI agents and donors, with a prioritized path to a better score.`,
    path: `/nonprofits/is-ai-ready/${domain}`,
  });
}

export default async function ScannerSitePage({ params }: { params: Promise<SitePageParams> }) {
  const { site } = await params;

  if (!site || !isDomainParam(site)) {
    return (
      <main className="mx-auto w-full max-w-3xl px-4">
        <ErrorState
          title="Page not found"
          message="This doesn't look like a nonprofit website. Try a domain like waterkeeper.org."
        />
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-12">
      <ScannerSiteReport domain={site} />
    </main>
  );
}
