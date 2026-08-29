import { ArrowLeft } from "lucide-react";
import type { NotebookConfig } from "@/services/notebooks.service";
import { Link } from "@/src/components/navigation/Link";
import { COMMUNITY_NAV_LABELS } from "@/utilities/community-nav";
import { NOTEBOOK_EMBED_ENABLED } from "@/utilities/notebooks-gate";
import { PAGES } from "@/utilities/pages";
import { NotebookFrame } from "./NotebookFrame";

interface NotebookViewerProps {
  communityId: string;
  notebook: NotebookConfig;
}

/**
 * A single notebook page: header, then either the sandboxed frame or the
 * deployment-gate placeholder.
 *
 * The frame is withheld while {@link NOTEBOOK_EMBED_ENABLED} is false — see
 * that module for what has to be true first. Everything around it (routing,
 * the data fetch, not-found behaviour, the version line) is live regardless,
 * so flipping the gate is the only change needed to ship the embed.
 */
export function NotebookViewer({ communityId, notebook }: NotebookViewerProps) {
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

      {NOTEBOOK_EMBED_ENABLED ? (
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
