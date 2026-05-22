import type { Metadata } from "next";
import { FoundationDetailDynamic } from "@/src/features/non-profits/components/foundation-detail-dynamic";
import { customMetadata } from "@/utilities/meta";

/**
 * Foundation detail page (Phase 4).
 * Server Component shell — hydration handled by FoundationDetailDynamic (ssr: false).
 * `params` is a Promise in Next.js 15 App Router.
 *
 * SEO: lightweight cached server fetch for the entity name/description.
 * Falls back to generic metadata if the fetch fails.
 */

interface FoundationPageParams {
  id: string;
}

interface FoundationSeoData {
  name?: string;
  description?: string | null;
}

async function fetchFoundationForSeo(id: string): Promise<FoundationSeoData | null> {
  const baseUrl = process.env.NEXT_PUBLIC_GAP_INDEXER_URL;
  if (!baseUrl) return null;

  try {
    const res = await fetch(`${baseUrl}/v2/philanthropy/foundations/${id}`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    return (await res.json()) as FoundationSeoData;
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<FoundationPageParams>;
}): Promise<Metadata> {
  const { id } = await params;
  const foundation = await fetchFoundationForSeo(id);

  if (!foundation?.name) {
    return customMetadata({
      title: "Foundation — Grant Atlas",
      description: "View foundation details, grants, officers, and financials.",
      path: `/non-profits/foundations/${id}`,
    });
  }

  return customMetadata({
    title: `${foundation.name} — Grant Atlas`,
    description:
      foundation.description ??
      `Explore grants, officers, and financial data for ${foundation.name}.`,
    path: `/non-profits/foundations/${id}`,
  });
}

export default async function FoundationPage({
  params,
}: {
  params: Promise<FoundationPageParams>;
}) {
  const { id } = await params;

  return (
    <main className="w-full">
      <FoundationDetailDynamic id={id} />
    </main>
  );
}
