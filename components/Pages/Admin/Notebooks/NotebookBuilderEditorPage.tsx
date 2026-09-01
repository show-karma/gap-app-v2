"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { NotebookOverviewView } from "@/components/Pages/Communities/Notebooks/NotebookOverview";
import { NotebookSandboxFrame } from "@/components/Pages/Communities/Notebooks/NotebookSandboxFrame";
import { Spinner } from "@/components/Utilities/Spinner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useCommunityAdminAccess } from "@/hooks/communities/useCommunityAdminAccess";
import {
  useAdminNotebook,
  useCreateNotebook,
  useUpdateNotebook,
} from "@/hooks/notebooks/useNotebookBuilder";
import type { NotebookOverview } from "@/services/notebook-overview.service";
import type { NotebookProvenanceEntry } from "@/services/notebooks/notebook-generation.types";
import type { NotebookIndicatorOption } from "@/services/notebooks/notebook-indicators.types";
import type { NotebookMetricCatalog } from "@/services/notebooks/notebook-metric-registry.types";
import type { NotebookPageData } from "@/services/notebooks/notebook-page-data.types";
import { notebookSandboxOrigin } from "@/services/notebooks/notebook-sandbox-origin";
import {
  isComposedNotebookSpec,
  isCustomHtmlNotebookSpec,
  type NotebookSpec,
} from "@/services/notebooks/notebook-spec";
import {
  emptyCustomHtmlSpec,
  emptyNotebookSpec,
  validateSpec,
} from "@/services/notebooks/notebook-spec-draft";
import { sanitizeSlugInput, slugifyNotebookName } from "@/services/notebooks-admin.service";
import { Link } from "@/src/components/navigation/Link";
import type { Community } from "@/types/v2/community";
import { PAGES } from "@/utilities/pages";
import { CustomHtmlComposer } from "./CustomHtmlComposer";
import { DescribeCustomPagePanel } from "./DescribeCustomPagePanel";
import { DescribePagePanel } from "./DescribePagePanel";
import { MetricQueryBuilder } from "./MetricQueryBuilder";
import { SectionComposer } from "./SectionComposer";
import { AiDraftNotice } from "./SectionProvenance";

interface Props {
  community: Community;
  /** Absent when creating. Present when editing an existing page. */
  slug?: string;
  /**
   * Live metrics for this community, fetched server-side.
   *
   * The preview renders REAL numbers through the same component the public
   * page uses. A preview against fabricated data would answer "does my layout
   * compile" when the question an author actually has is "does this page say
   * something true about my programme".
   */
  overview: NotebookOverview;
  /** The indicator catalog for the picker; fetched server-side. */
  indicators?: readonly NotebookIndicatorOption[];
  /**
   * Datasets for the preview, loaded for the SAVED spec.
   *
   * A chart the author has only just added cannot preview its data: the series
   * is fetched on the server for the spec that was saved, and this form has
   * not saved yet. The preview says so rather than showing an error that reads
   * like the indicator is broken.
   */
  previewData?: NotebookPageData;
  /**
   * The community-scoped metric catalogue, for the query explorer.
   *
   * Absent when it could not be loaded — the explorer is then simply not
   * shown, because a builder is not the place to explain an upstream outage
   * and the page's actual job still works without it.
   */
  metricCatalog?: NotebookMetricCatalog;
}

export function NotebookBuilderEditorPage({
  community,
  slug,
  overview,
  indicators,
  previewData,
  metricCatalog,
}: Props) {
  const communitySlug = community.details?.slug || community.uid;
  const router = useRouter();
  const isEditing = Boolean(slug);

  const { hasAccess, isLoading: accessLoading } = useCommunityAdminAccess(community.uid);
  const {
    data: existing,
    isLoading: loadingExisting,
    isError,
  } = useAdminNotebook(communitySlug, slug ?? "");
  const createMutation = useCreateNotebook(communitySlug);
  const updateMutation = useUpdateNotebook(communitySlug);

  const [name, setName] = useState("");
  const [pageSlug, setPageSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [description, setDescription] = useState("");
  const [spec, setSpec] = useState<NotebookSpec>(emptyNotebookSpec);
  /**
   * Evidence for a generated draft, and whether one is awaiting review.
   *
   * Both live in the BROWSER and neither is ever sent to the server: the spec
   * is what gets saved, and provenance is scaffolding for the person checking
   * it. `proposed` clears the moment the admin saves or publishes, because
   * that is when a person takes responsibility for the page.
   */
  const [provenance, setProvenance] = useState<(NotebookProvenanceEntry | undefined)[]>([]);
  const [proposed, setProposed] = useState<{ warnings: string[] } | null>(null);
  /**
   * Whether this page still needs a human to vouch for its figures.
   *
   * Two sources, one question. An in-browser proposal has not been saved, so
   * nobody has looked; a SAVED row whose persisted origin is still `ai` has
   * been saved but never published, so nobody has vouched. The indexer clears
   * `source` to `manual` on publish, which is why publishing is the thing that
   * makes this notice go away.
   */
  const unverified = Boolean(proposed) || existing?.source === "ai";

  // Load the existing page into the form once it arrives. Keyed on the config
  // itself rather than running on every render, so an author's in-progress
  // edits are never overwritten by a background refetch of the same data.
  useEffect(() => {
    if (!existing) return;
    setName(existing.name);
    setPageSlug(existing.slug);
    setSlugTouched(true);
    setDescription(existing.description ?? "");
    // A row whose stored layout could not be read opens as a RECOVERY: the
    // page's identity is intact, so only the layout is rebuilt. Seeding a
    // blank starter beats showing nothing — the admin was told to repair this
    // page, and this is where they do it.
    setSpec(existing.spec ?? emptyNotebookSpec());
  }, [existing]);

  /** The stored layout is unreadable and the author is rebuilding it. */
  const isRecovering = Boolean(existing && existing.spec === null);

  // The slug follows the name until an author edits it themselves; after that
  // it is theirs. Renaming a published page would change its public URL, so on
  // an existing page the slug never auto-follows.
  const handleNameChange = (next: string) => {
    setName(next);
    if (!slugTouched && !isEditing) setPageSlug(slugifyNotebookName(next));
  };

  const sandboxOrigin = notebookSandboxOrigin();
  const validation = useMemo(() => validateSpec(spec), [spec]);
  const canSave = name.trim().length > 0 && pageSlug.length > 0 && validation.valid;
  const isSaving = createMutation.isPending || updateMutation.isPending;

  const handleSave = async (publish?: boolean) => {
    if (!canSave) return;

    // Saving clears the UNSAVED half only. The unverified half is the row's
    // persisted origin, which the indexer clears on publish — because saving
    // a draft is not vouching for it.
    setProposed(null);

    const body = {
      slug: pageSlug,
      name: name.trim(),
      description: description.trim() === "" ? undefined : description.trim(),
      spec,
      ...(publish === undefined
        ? {}
        : { status: publish ? ("published" as const) : ("draft" as const) }),
    };

    try {
      if (isEditing && slug) {
        await updateMutation.mutateAsync({ slug, body });
      } else {
        await createMutation.mutateAsync(body);
      }
      toast.success(publish ? "Page published." : "Draft saved.");
      router.push(PAGES.ADMIN.NOTEBOOKS(communitySlug));
    } catch (error) {
      // Surface what the server said. A spec the UI thought was fine but the
      // boundary rejected is exactly the case where a generic message would
      // leave an author with no way forward.
      toast.error(error instanceof Error ? error.message : "Could not save this page.");
    }
  };

  if (accessLoading || (isEditing && loadingExisting)) {
    return (
      <div className="flex items-center justify-center p-12">
        <Spinner />
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="flex items-center justify-center p-12 text-zinc-500">
        You don&apos;t have permission to view this page.
      </div>
    );
  }

  if (isEditing && isError) {
    return (
      <div className="flex flex-col items-center gap-3 p-12 text-center">
        <p className="text-sm font-medium text-foreground">Could not load this page.</p>
        <Link href={PAGES.ADMIN.NOTEBOOKS(communitySlug)}>
          <Button variant="secondary">Back to notebook pages</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <Link
          href={PAGES.ADMIN.NOTEBOOKS(communitySlug)}
          className="inline-flex w-max items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          All notebook pages
        </Link>
        <h1 className="text-2xl font-bold text-foreground">
          {isRecovering
            ? "Rebuild notebook page"
            : isEditing
              ? "Edit notebook page"
              : "New notebook page"}
        </h1>
        {/* Says what happened and what saving will do, because the layout on
            screen is NOT the one stored — it is a fresh start, and saving
            replaces the unreadable original rather than editing it. */}
        {isRecovering ? (
          <output className="max-w-2xl text-sm text-destructive">
            This page&apos;s saved layout could not be read, so it has been cleared. Rebuild the
            sections below and save to replace it. The page&apos;s name, URL and description are
            unchanged.
          </output>
        ) : null}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-4 rounded-2xl border border-border bg-background p-5">
            <label className="flex flex-col gap-1 text-sm" htmlFor="notebook-name">
              <span className="font-medium text-foreground">Name</span>
              <Input
                id="notebook-name"
                type="text"
                value={name}
                maxLength={200}
                placeholder="Grants & milestones overview"
                onChange={(event) => handleNameChange(event.target.value)}
              />
            </label>

            <label className="flex flex-col gap-1 text-sm" htmlFor="notebook-slug">
              <span className="font-medium text-foreground">URL</span>
              <Input
                id="notebook-slug"
                type="text"
                value={pageSlug}
                maxLength={200}
                onChange={(event) => {
                  setSlugTouched(true);
                  // Sanitised, not slugified: slugifying here would delete a
                  // hyphen the moment it is typed, so "grants-overview" could
                  // never be entered by hand. The full rule runs on blur.
                  setPageSlug(sanitizeSlugInput(event.target.value));
                }}
                onBlur={(event) => setPageSlug(slugifyNotebookName(event.target.value))}
              />
              <span className="text-xs text-muted-foreground">
                /community/{communitySlug}/notebooks/{pageSlug || "…"}
                {isEditing ? " · changing this changes the public URL" : ""}
              </span>
            </label>

            <label className="flex flex-col gap-1 text-sm" htmlFor="notebook-description">
              <span className="font-medium text-foreground">
                Description <span className="text-muted-foreground">(optional)</span>
              </span>
              <Textarea
                id="notebook-description"
                value={description}
                maxLength={2000}
                onChange={(event) => setDescription(event.target.value)}
              />
            </label>
          </div>

          {isCustomHtmlNotebookSpec(spec) ? (
            <>
              <DescribeCustomPagePanel
                communitySlug={communitySlug}
                hasExistingHtml={spec.html.trim().length > 0}
                onGenerated={(result) => {
                  setSpec({ ...spec, html: result.html });
                  setProposed({ warnings: result.warnings });
                }}
              />

              <div className="rounded-2xl border border-border bg-background p-5">
                <CustomHtmlComposer
                  spec={spec}
                  onChange={setSpec}
                  sandboxOrigin={sandboxOrigin}
                  onSwitchToComposed={() => {
                    setSpec(emptyNotebookSpec());
                    setProposed(null);
                  }}
                />
              </div>
            </>
          ) : (
            <>
              {/* Above the composer: the description box is the primary way in,
              and the composer is where the proposal gets checked. */}
              <DescribePagePanel
                communitySlug={communitySlug}
                hasExistingSections={isComposedNotebookSpec(spec) && spec.sections.length > 0}
                onGenerated={(result) => {
                  setSpec(result.spec);
                  setProvenance(result.provenance);
                  setProposed({ warnings: result.warnings });
                }}
              />

              {unverified ? (
                <AiDraftNotice
                  unsaved={Boolean(proposed)}
                  warnings={proposed?.warnings ?? []}
                  customHtml={isCustomHtmlNotebookSpec(spec)}
                />
              ) : null}

              <div className="rounded-2xl border border-border bg-background p-5">
                <SectionComposer
                  spec={spec}
                  onChange={setSpec}
                  indicators={indicators}
                  metricCatalog={metricCatalog}
                  provenance={provenance}
                  onProvenanceChange={setProvenance}
                />
              </div>

              {/* The blank canvas is a deliberate exit from the guided builder,
              offered once and named for what it costs. */}
              <Button
                type="button"
                variant="ghost"
                className="w-max text-muted-foreground"
                onClick={() => setSpec(emptyCustomHtmlSpec())}
              >
                Advanced: write this page yourself in HTML
              </Button>
            </>
          )}

          {metricCatalog ? (
            <MetricQueryBuilder communityId={communitySlug} catalog={metricCatalog} />
          ) : null}

          {validation.error ? (
            <p role="alert" className="text-sm text-destructive">
              {validation.error}
            </p>
          ) : null}

          <div className="flex flex-row flex-wrap items-center gap-3">
            <Button disabled={!canSave || isSaving} onClick={() => handleSave(false)}>
              Save draft
            </Button>
            <Button
              variant="secondary"
              disabled={!canSave || isSaving}
              onClick={() => handleSave(true)}
            >
              {existing?.status === "published" ? "Save & keep published" : "Publish"}
            </Button>
            <Link href={PAGES.ADMIN.NOTEBOOKS(communitySlug)}>
              <Button variant="secondary" disabled={isSaving}>
                Cancel
              </Button>
            </Link>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <h2 className="text-base font-semibold text-foreground">Preview</h2>
            <p className="text-sm text-muted-foreground">
              Your community&apos;s real numbers, rendered by the same components the public page
              uses. Save as draft to preview a chart you just added.
            </p>
          </div>
          {/* Reusing the public renderer is the point: a bespoke preview would
              be a second implementation to keep in step, and the first time it
              drifted an author would publish something they had not seen. */}
          <div className="rounded-2xl border border-border bg-muted/30 p-4">
            {validation.valid && isCustomHtmlNotebookSpec(spec) ? (
              sandboxOrigin ? (
                <NotebookSandboxFrame
                  sandboxOrigin={sandboxOrigin}
                  html={spec.html}
                  title={spec.title ?? name}
                />
              ) : (
                <p className="py-12 text-center text-sm text-muted-foreground">
                  Custom pages are not available in this environment.
                </p>
              )
            ) : validation.valid && isComposedNotebookSpec(spec) ? (
              <NotebookOverviewView overview={overview} spec={spec} data={previewData} />
            ) : (
              <p className="py-12 text-center text-sm text-muted-foreground">
                Finish the sections to see a preview.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
