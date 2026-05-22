import type { Metadata } from "next";
import { NonprofitDetailDynamic } from "@/src/features/non-profits/components/nonprofit-detail-dynamic";
import { customMetadata } from "@/utilities/meta";

/**
 * Nonprofit detail page (Phase 4).
 * Server Component shell — hydration handled by NonprofitDetailDynamic (ssr: false).
 */

interface NonprofitPageParams {
  id: string;
}

interface NonprofitSeoData {
  name?: string;
  description?: string | null;
}

async function fetchNonprofitForSeo(id: string): Promise<NonprofitSeoData | null> {
  const baseUrl = process.env.NEXT_PUBLIC_GAP_INDEXER_URL;
  if (!baseUrl) return null;

  try {
    const res = await fetch(`${baseUrl}/v2/philanthropy/nonprofits/${id}`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    return (await res.json()) as NonprofitSeoData;
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<NonprofitPageParams>;
}): Promise<Metadata> {
  const { id } = await params;
  const nonprofit = await fetchNonprofitForSeo(id);

  if (!nonprofit?.name) {
    return customMetadata({
      title: "Nonprofit — Grant Atlas",
      description: "View nonprofit details and grants received.",
      path: `/non-profits/nonprofits/${id}`,
    });
  }

  return customMetadata({
    title: `${nonprofit.name} — Grant Atlas`,
    description:
      nonprofit.description ??
      `Explore grants received by ${nonprofit.name} and their funding sources.`,
    path: `/non-profits/nonprofits/${id}`,
  });
}

export default async function NonprofitPage({ params }: { params: Promise<NonprofitPageParams> }) {
  const { id } = await params;

  return (
    <main className="w-full">
      <NonprofitDetailDynamic id={id} />
    </main>
  );
}
