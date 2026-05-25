import type { Metadata } from "next";
import { ChatViewDynamic } from "@/src/features/non-profits/components/chat-view-dynamic";
import { customMetadata } from "@/utilities/meta";

export const metadata: Metadata = customMetadata({
  title: "Search — Grow Nonprofits",
  description:
    "AI-powered philanthropic prospecting. Find funders, explore foundations, and research grants in plain English.",
  path: "/non-profits/search",
});

/**
 * Search workbench page (Phase 3).
 * Server Component shell — hydration is handled by ChatViewDynamic (ssr: false).
 * `params` is a Promise in Next.js 15 App Router.
 */
export default async function SearchResultsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <main className="flex w-full flex-col">
      <ChatViewDynamic searchId={id} />
    </main>
  );
}
