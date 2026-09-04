import { NotebookText } from "lucide-react";
import type { NotebookConfig } from "@/services/notebooks.service";
import { Link } from "@/src/components/navigation/Link";
import { COMMUNITY_NAV_LABELS } from "@/utilities/community-nav";
import { PAGES } from "@/utilities/pages";

interface NotebookListProps {
  communityId: string;
  notebooks: NotebookConfig[];
}

/**
 * Published notebook pages for a community.
 *
 * Server-rendered: the list is data the page already has, so there is no
 * client fetch and no loading state to render here — `loading.tsx` covers the
 * navigation, and a fetch failure reaches `error.tsx`.
 */
export function NotebookList({ communityId, notebooks }: NotebookListProps) {
  return (
    <div className="flex flex-col gap-6 py-6 animate-fade-in-up">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold text-foreground">{COMMUNITY_NAV_LABELS.notebooks}</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Data pages published by this community, built from live grant data.
        </p>
      </div>

      {notebooks.length === 0 ? (
        <EmptyState />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {notebooks.map((notebook) => (
            <li key={notebook.slug}>
              <Link
                href={PAGES.COMMUNITY.NOTEBOOK_DETAIL(communityId, notebook.slug)}
                className="flex h-full flex-col gap-2 rounded-2xl border border-border bg-background p-5 transition-colors hover:border-primary/50 hover:bg-muted/40"
              >
                <span className="flex items-center gap-2 text-base font-semibold text-foreground">
                  <NotebookText className="h-4 w-4 shrink-0 text-muted-foreground" />
                  {notebook.name}
                </span>
                {notebook.description ? (
                  <span className="text-sm text-muted-foreground line-clamp-3">
                    {notebook.description}
                  </span>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border py-16 text-center">
      <NotebookText className="h-8 w-8 text-muted-foreground" />
      <p className="text-base font-medium text-foreground">No notebooks published yet</p>
      <p className="max-w-md text-sm text-muted-foreground">
        When this community publishes a notebook, it will appear here.
      </p>
    </div>
  );
}
