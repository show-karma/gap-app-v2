import { Link } from "@/src/components/navigation/Link";
import { COMMUNITY_NAV_LABELS } from "@/utilities/community-nav";
import { PAGES } from "@/utilities/pages";

interface NotebooksUnavailableProps {
  communityId: string;
  communityName: string;
}

/**
 * Terminal state for a community that exists but has not enabled notebooks.
 *
 * This page is chrome-free (the `(cover)` group renders no community
 * navigator), so the copy names the community itself and the link back to the
 * community explorer is the only way out.
 */
export function NotebooksUnavailable({ communityId, communityName }: NotebooksUnavailableProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
      <h1 className="text-2xl font-bold">{COMMUNITY_NAV_LABELS.notebooks} not available</h1>
      <p className="max-w-md text-muted-foreground">
        {communityName} hasn&apos;t enabled notebooks.
      </p>
      <Link
        href={PAGES.COMMUNITY.ALL_GRANTS(communityId)}
        className="mt-2 inline-flex items-center justify-center rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
      >
        Back to {communityName}
      </Link>
    </div>
  );
}
