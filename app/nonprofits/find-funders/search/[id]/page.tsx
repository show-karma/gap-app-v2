import type { Metadata } from "next";
import { ChatViewDynamic } from "@/src/features/non-profits/components/chat-view-dynamic";
import { DeepResearchPromo } from "@/src/features/non-profits/components/deep-research-promo";
import { customMetadata } from "@/utilities/meta";

interface SearchPageParams {
  id: string;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<SearchPageParams>;
}): Promise<Metadata> {
  const { id } = await params;
  return customMetadata({
    title: "Search — Karma Find Funders",
    description:
      "AI-powered philanthropic prospecting. Find funders, explore foundations, and research grants in plain English.",
    path: `/nonprofits/find-funders/search/${id}`,
  });
}

/**
 * Search workbench page (Phase 3).
 * Server Component shell — hydration is handled by ChatViewDynamic (ssr: false).
 * `params` is a Promise in Next.js 15 App Router.
 */
export default async function SearchResultsPage({ params }: { params: Promise<SearchPageParams> }) {
  const { id } = await params;

  return (
    <main className="flex w-full">
      <div className="min-w-0 flex-1">
        <ChatViewDynamic searchId={id} />
      </div>
      <DeepResearchPromo />
    </main>
  );
}
