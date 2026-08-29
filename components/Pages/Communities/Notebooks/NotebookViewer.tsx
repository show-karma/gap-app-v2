import { ArrowLeft } from "lucide-react";
import type { NotebookOverview } from "@/services/notebook-overview.service";
import type { NotebookConfig } from "@/services/notebooks.service";
import { Link } from "@/src/components/navigation/Link";
import { COMMUNITY_NAV_LABELS } from "@/utilities/community-nav";
import { NOTEBOOK_LIVE_RUNTIME_ENABLED } from "@/utilities/notebooks-gate";
import { PAGES } from "@/utilities/pages";
import { NotebookOverviewView } from "./NotebookOverview";

interface NotebookViewerProps {
  communityId: string;
  notebook: NotebookConfig;
  overview: NotebookOverview;
}

/**
 * A notebook page, static-first (Architecture B).
 *
 * Everything a reader sees on load is server-rendered from data computed once
 * per revalidation window. No Python runtime, no WASM, no chart library — and
 * so no untrusted code in the browser on the default path, which is why the
 * sandboxed-iframe machinery is no longer part of this render.
 *
 * The live runtime remains built and validated; it becomes the opt-in
 * power-user path in WS-B4, reached through the seam below.
 */
export function NotebookViewer({ communityId, notebook, overview }: NotebookViewerProps) {
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
        <NotebookProvenance notebook={notebook} overview={overview} />
      </div>

      <NotebookOverviewView overview={overview} />

      {/*
        WS-B4 seam. When the lazy-live layer lands this is where an opt-in
        control mounts and boots the validated WASM runtime for THAT viewer
        only — the bundle, its sandboxed iframe, the CSP carve-out and the
        rendered-sandbox CI assertion all still exist for exactly that purpose.
        Deliberately not wired: shipping the control before the runtime behind
        it would promise interactivity the page cannot deliver.
      */}
      {NOTEBOOK_LIVE_RUNTIME_ENABLED ? <LiveRuntimeSeam /> : null}
    </div>
  );
}

/**
 * Where the numbers came from and how old they are.
 *
 * Static-first buys its speed by serving a computation the reader did not
 * trigger, so the page has to be honest about that: someone comparing these
 * figures against the live API needs to know which window they are looking at,
 * and a stale page should be recognisable as stale rather than as wrong.
 */
function NotebookProvenance({
  notebook,
  overview,
}: {
  notebook: NotebookConfig;
  overview: NotebookOverview;
}) {
  const label = overview.source === "snapshot" ? "Snapshot" : "Live GAP data";

  return (
    <p className="text-xs text-muted-foreground">
      {label} · updated{" "}
      <time dateTime={overview.generatedAt}>
        {overview.generatedAt.replace("T", " ").slice(0, 16)} UTC
      </time>{" "}
      · version {notebook.artifactVersion}
    </p>
  );
}

/** Placeholder for the WS-B4 control. Never rendered while the gate is closed. */
function LiveRuntimeSeam() {
  return (
    <section
      className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border py-10 text-center"
      data-testid="notebook-live-runtime-seam"
    >
      <p className="text-sm font-medium text-foreground">Interactive mode</p>
      <p className="max-w-md text-sm text-muted-foreground">
        Explore this data yourself, in your browser. Takes a few seconds to start.
      </p>
    </section>
  );
}
