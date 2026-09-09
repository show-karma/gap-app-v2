import { ArrowLeft } from "lucide-react";
import type { NotebookConfig } from "@/services/notebooks.service";
import { Link } from "@/src/components/navigation/Link";
import { COMMUNITY_NAV_LABELS } from "@/utilities/community-nav";
import { isNotebookArtifactUrl } from "@/utilities/domains";
import { PAGES } from "@/utilities/pages";
import { NotebookFrame } from "./NotebookFrame";

interface NotebookViewerProps {
  communityId: string;
  notebook: NotebookConfig;
}

/**
 * A single notebook page: header, then either the sandboxed frame or an
 * explicit "not live yet" state.
 *
 * The frame is rendered only when the stored artifact URL is on the notebooks
 * origin (`isNotebookArtifactUrl`, exact-origin match). That check is the
 * gate: a deploy with no notebooks origin configured, or a config row pointing
 * anywhere else, withholds the frame rather than framing an unknown host.
 * Routing, the data fetch, not-found behaviour and the version line are live
 * either way.
 */
export function NotebookViewer({ communityId, notebook }: NotebookViewerProps) {
  const canEmbed = isNotebookArtifactUrl(notebook.artifactUrl);

  return (
    <div className="flex flex-col gap-6 py-6 animate-fade-in-up">
      <div className="flex flex-col gap-3">
        <Link
          href={PAGES.COMMUNITY.NOTEBOOKS(communityId)}
          className="inline-flex w-max items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          All {COMMUNITY_NAV_LABELS.notebooks.toLowerCase()}
        </Link>
        <h1 className="text-2xl font-bold text-foreground">{notebook.name}</h1>
        {notebook.description ? (
          <p className="max-w-2xl text-sm text-muted-foreground">{notebook.description}</p>
        ) : null}
        <p className="text-xs text-muted-foreground">Version {notebook.artifactVersion}</p>
      </div>

      {canEmbed ? (
        <NotebookFrame src={notebook.artifactUrl} title={notebook.name} />
      ) : (
        <NotebookPending />
      )}
    </div>
  );
}

function NotebookPending() {
  return (
    <div
      className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border py-16 text-center"
      data-testid="notebook-embed-pending"
    >
      <p className="text-base font-medium text-foreground">This notebook isn&apos;t live yet</p>
      <p className="max-w-md text-sm text-muted-foreground">
        It has been published but is not yet available to view here. Check back shortly.
      </p>
    </div>
  );
}
