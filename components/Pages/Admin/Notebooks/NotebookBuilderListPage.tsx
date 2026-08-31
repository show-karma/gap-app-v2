"use client";

import { Eye, EyeOff, NotebookText, Pencil, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";
import { DeleteDialog } from "@/components/DeleteDialog";
import { Spinner } from "@/components/Utilities/Spinner";
import { Button } from "@/components/ui/button";
import { useCommunityAdminAccess } from "@/hooks/communities/useCommunityAdminAccess";
import {
  useAdminNotebooks,
  useDeleteNotebook,
  useSetNotebookStatus,
} from "@/hooks/notebooks/useNotebookBuilder";
import type { AdminNotebookListItem } from "@/services/notebooks-admin.service";
import { Link } from "@/src/components/navigation/Link";
import type { Community } from "@/types/v2/community";
import { PAGES } from "@/utilities/pages";

interface Props {
  community: Community;
}

/**
 * The builder's index: every notebook page a community has, drafts included.
 *
 * Drafts are the reason this screen exists — the public list is
 * published-only by construction, so this is the only place unpublished work
 * is visible, and it reaches it through the authenticated admin endpoints.
 */
export function NotebookBuilderListPage({ community }: Props) {
  const communitySlug = community.details?.slug || community.uid;
  const router = useRouter();
  const { hasAccess, isLoading: accessLoading } = useCommunityAdminAccess(community.uid);
  const { data: notebooks, isLoading, isError, error } = useAdminNotebooks(communitySlug);
  const statusMutation = useSetNotebookStatus(communitySlug);
  const deleteMutation = useDeleteNotebook(communitySlug);

  const [deleteTarget, setDeleteTarget] = useState<AdminNotebookListItem | null>(null);

  const handleToggleStatus = async (notebook: AdminNotebookListItem) => {
    const next = notebook.status === "published" ? "draft" : "published";
    try {
      await statusMutation.mutateAsync({ slug: notebook.slug, status: next });
      toast.success(next === "published" ? "Page published." : "Page unpublished.");
    } catch {
      toast.error(`Could not ${next === "published" ? "publish" : "unpublish"} this page.`);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteMutation.mutateAsync(deleteTarget.slug);
      toast.success("Page deleted.");
      setDeleteTarget(null);
    } catch {
      toast.error("Could not delete this page.");
    }
  };

  if (accessLoading || isLoading) {
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

  // A failed load is NOT an empty list. Rendering "no pages yet" here would
  // invite an author to create a page that already exists, and hide an outage
  // behind a friendly empty state.
  if (isError) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border p-12 text-center">
        <p className="text-sm font-medium text-foreground">Could not load your notebook pages.</p>
        <p className="max-w-md text-sm text-muted-foreground">
          {error instanceof Error ? error.message : "The configuration service did not respond."}
        </p>
        <Button variant="secondary" onClick={() => router.refresh()}>
          Try again
        </Button>
      </div>
    );
  }

  const pages = notebooks ?? [];

  return (
    <div className="flex flex-col gap-6">
      <DeleteDialog
        title={
          deleteTarget
            ? `Delete "${deleteTarget.name}"? This permanently removes the page and cannot be undone.`
            : "Delete this page?"
        }
        deleteFunction={handleDelete}
        isLoading={deleteMutation.isPending}
        externalIsOpen={deleteTarget !== null}
        externalSetIsOpen={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        buttonElement={null}
      />

      <div className="flex flex-row flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold text-foreground">Notebook pages</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Dashboards built from your community&apos;s live grant data. Drafts are visible only
            here; publishing puts a page on your community&apos;s public Notebooks tab.
          </p>
        </div>
        <Button onClick={() => router.push(PAGES.ADMIN.NOTEBOOKS_NEW(communitySlug))}>
          <Plus className="h-4 w-4" />
          New page
        </Button>
      </div>

      {pages.length === 0 ? (
        <EmptyState communitySlug={communitySlug} />
      ) : (
        <ul className="flex flex-col gap-3">
          {pages.map((notebook) => (
            <li
              key={notebook.slug}
              className="flex flex-row flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-background p-4"
            >
              <div className="flex min-w-0 flex-col gap-1">
                <span className="flex items-center gap-2 text-base font-semibold text-foreground">
                  <NotebookText className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="truncate">{notebook.name}</span>
                  <StatusBadge status={notebook.status} />
                </span>
                <span className="text-xs text-muted-foreground">
                  /{notebook.slug}
                  {notebook.spec ? (
                    <>
                      {" · "}
                      {notebook.spec.sections.length}{" "}
                      {notebook.spec.sections.length === 1 ? "section" : "sections"}
                    </>
                  ) : null}
                  {notebook.updatedAt ? ` · updated ${notebook.updatedAt.slice(0, 10)}` : null}
                </span>
                {/* A page whose layout cannot be read is still listed, and
                    still deletable — being able to see and remove it is the
                    only way anyone repairs it. Saying which page is broken
                    beats the previous behaviour, where one such row removed
                    the whole builder for the community. */}
                {notebook.spec === null ? (
                  <span className="text-xs text-destructive">
                    {notebook.specError ?? "This page could not be read."} Rebuild its layout, or
                    delete it.
                  </span>
                ) : null}
              </div>

              <div className="flex shrink-0 flex-row items-center gap-2">
                {notebook.status === "published" ? (
                  <Link
                    href={PAGES.COMMUNITY.NOTEBOOK_DETAIL(communitySlug, notebook.slug)}
                    className="text-sm text-muted-foreground underline-offset-4 hover:underline"
                  >
                    View
                  </Link>
                ) : null}
                {/* Editing or publishing a page whose layout we cannot read
                    would either save a spec the author never saw or publish
                    one nobody can render, so both are withheld. Delete stays,
                    because it is the repair. */}
                {/* Enabled on a broken row: it opens the recovery composer,
                    which is the repair the message promises. It used to be
                    withheld, which left the copy telling an admin to fix a
                    page through a control that was greyed out. */}
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() =>
                    router.push(PAGES.ADMIN.NOTEBOOKS_EDIT(communitySlug, notebook.slug))
                  }
                >
                  <Pencil className="h-4 w-4" />
                  {notebook.spec === null ? "Rebuild" : "Edit"}
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={statusMutation.isPending || notebook.spec === null}
                  onClick={() => handleToggleStatus(notebook)}
                >
                  {notebook.status === "published" ? (
                    <>
                      <EyeOff className="h-4 w-4" />
                      Unpublish
                    </>
                  ) : (
                    <>
                      <Eye className="h-4 w-4" />
                      Publish
                    </>
                  )}
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  aria-label={`Delete ${notebook.name}`}
                  onClick={() => setDeleteTarget(notebook)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: AdminNotebookListItem["status"] }) {
  const published = status === "published";
  return (
    <span
      className={
        published
          ? "rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary"
          : "rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground"
      }
    >
      {published ? "Published" : "Draft"}
    </span>
  );
}

function EmptyState({ communitySlug }: { communitySlug: string }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border py-16 text-center">
      <p className="text-sm font-medium text-foreground">No notebook pages yet</p>
      <p className="max-w-md text-sm text-muted-foreground">
        Build a dashboard from your community&apos;s grant data — funding totals, milestone progress
        and the application funnel, all read live.
      </p>
      <Link href={PAGES.ADMIN.NOTEBOOKS_NEW(communitySlug)}>
        <Button>
          <Plus className="h-4 w-4" />
          New page
        </Button>
      </Link>
    </div>
  );
}
