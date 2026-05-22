import { Search } from "lucide-react";
import type { Metadata } from "next";
import { Link } from "@/src/components/navigation/Link";
import { customMetadata } from "@/utilities/meta";
import { NON_PROFITS_PAGES } from "@/utilities/pages";

export const metadata: Metadata = customMetadata({
  title: "Search Results — Grant Atlas",
  description: "AI-powered philanthropic search results.",
  path: "/non-profits/search",
});

/**
 * Placeholder search results page (Phase 2).
 * Full streaming search experience ships in Phase 3.
 * Reads `params.id` so the route resolves without a hard-404.
 */
export default async function SearchResultsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <main className="flex w-full min-h-[60vh] flex-col items-center justify-center px-4 py-16">
      <div className="flex max-w-md flex-col items-center gap-6 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
          <Search className="h-7 w-7 text-muted-foreground" />
        </div>
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold text-foreground">Search results coming soon</h1>
          <p className="text-sm text-muted-foreground">
            The AI-powered search experience is under construction. Check back shortly — full
            results for session <span className="font-mono text-xs">{id}</span> will appear here.
          </p>
        </div>
        <Link
          href={NON_PROFITS_PAGES.HOME}
          className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Back to search
        </Link>
      </div>
    </main>
  );
}
