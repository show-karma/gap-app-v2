"use client";

import { ArrowLeft } from "lucide-react";
import type { NotebookCustomHtmlSpec } from "@/services/notebooks/notebook-spec";
import { Link } from "@/src/components/navigation/Link";
import { COMMUNITY_NAV_LABELS } from "@/utilities/community-nav";
import { PAGES } from "@/utilities/pages";
import { NotebookSandboxFrame } from "./NotebookSandboxFrame";

/**
 * A tier-B page: the author's own document, contained.
 *
 * SEPARATE FROM `NotebookViewer` BY TYPE, not by a branch inside it. The tier-A
 * renderer takes a `NotebookComposedSpec` and this one takes a
 * `NotebookCustomHtmlSpec`, so an untrusted document cannot reach the trusted
 * renderer even by mistake — the compiler refuses it. That is the whole reason
 * the mode is a top-level discriminant rather than a section type.
 *
 * IT FETCHES NOTHING. A custom page names no metrics, so there is no data
 * layer to run and no figures to reconcile. Everything true of tier A's
 * numbers — the em dash, the pooled denominators, the provenance — simply does
 * not apply here, which is the honest trade an author makes by choosing the
 * blank canvas.
 */

interface Props {
  communityId: string;
  name: string;
  description?: string | null;
  spec: NotebookCustomHtmlSpec;
  /**
   * Where the trusted sandbox shell is served from.
   *
   * Absent means the feature is not configured, and the page says so rather
   * than falling back to our own origin. There is no fallback: serving an
   * author's document from the app origin is the one thing this design exists
   * to prevent, so "not configured" must fail closed and visibly.
   */
  sandboxOrigin?: string;
}

export function NotebookCustomViewer({
  communityId,
  name,
  description,
  spec,
  sandboxOrigin,
}: Props) {
  return (
    <div className="flex animate-fade-in-up flex-col gap-6 py-6">
      <div className="flex flex-col gap-3">
        <Link
          href={PAGES.COMMUNITY.NOTEBOOKS(communityId)}
          className="inline-flex w-max items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          All {COMMUNITY_NAV_LABELS.notebooks.toLowerCase()}
        </Link>
        <h1 className="text-2xl font-bold text-foreground">{name}</h1>
        {description ? (
          <p className="max-w-2xl text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>

      {sandboxOrigin ? (
        <NotebookSandboxFrame
          sandboxOrigin={sandboxOrigin}
          html={spec.html}
          title={spec.title ?? name}
        />
      ) : (
        <p className="rounded-2xl border border-border bg-background p-6 text-sm text-muted-foreground">
          Custom pages are not available in this environment.
        </p>
      )}
    </div>
  );
}
