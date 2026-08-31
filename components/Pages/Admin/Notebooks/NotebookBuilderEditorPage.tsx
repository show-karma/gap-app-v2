"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { NotebookOverviewView } from "@/components/Pages/Communities/Notebooks/NotebookOverview";
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
import type { NotebookSpec } from "@/services/notebooks/notebook-spec";
import { emptyNotebookSpec, validateSpec } from "@/services/notebooks/notebook-spec-draft";
import { sanitizeSlugInput, slugifyNotebookName } from "@/services/notebooks-admin.service";
import { Link } from "@/src/components/navigation/Link";
import type { Community } from "@/types/v2/community";
import { PAGES } from "@/utilities/pages";
import { SectionComposer } from "./SectionComposer";

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
}

export function NotebookBuilderEditorPage({ community, slug, overview }: Props) {
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

  // Load the existing page into the form once it arrives. Keyed on the config
  // itself rather than running on every render, so an author's in-progress
  // edits are never overwritten by a background refetch of the same data.
  useEffect(() => {
    if (!existing) return;
    setName(existing.name);
    setPageSlug(existing.slug);
    setSlugTouched(true);
    setDescription(existing.description ?? "");
    setSpec(existing.spec);
  }, [existing]);

  // The slug follows the name until an author edits it themselves; after that
  // it is theirs. Renaming a published page would change its public URL, so on
  // an existing page the slug never auto-follows.
  const handleNameChange = (next: string) => {
    setName(next);
    if (!slugTouched && !isEditing) setPageSlug(slugifyNotebookName(next));
  };

  const validation = useMemo(() => validateSpec(spec), [spec]);
  const canSave = name.trim().length > 0 && pageSlug.length > 0 && validation.valid;
  const isSaving = createMutation.isPending || updateMutation.isPending;

  const handleSave = async (publish?: boolean) => {
    if (!canSave) return;

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
          {isEditing ? "Edit notebook page" : "New notebook page"}
        </h1>
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

          <div className="rounded-2xl border border-border bg-background p-5">
            <SectionComposer spec={spec} onChange={setSpec} />
          </div>

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
              uses.
            </p>
          </div>
          {/* Reusing the public renderer is the point: a bespoke preview would
              be a second implementation to keep in step, and the first time it
              drifted an author would publish something they had not seen. */}
          <div className="rounded-2xl border border-border bg-muted/30 p-4">
            {validation.valid ? (
              <NotebookOverviewView overview={overview} spec={spec} />
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
