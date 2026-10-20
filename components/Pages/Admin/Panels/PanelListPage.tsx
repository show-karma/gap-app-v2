"use client";

import * as Sentry from "@sentry/nextjs";
import { LayoutPanelTop, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import pluralize from "pluralize";
import { memo, useState } from "react";
import toast from "react-hot-toast";
import { DeleteDialog } from "@/components/DeleteDialog";
import { Spinner } from "@/components/Utilities/Spinner";
import { Button } from "@/components/ui/button";
import { useCommunityAdminAccess } from "@/hooks/communities/useCommunityAdminAccess";
import { useCreatePanel, useDeletePanel, usePanels } from "@/hooks/panels/usePanels";
import { Link } from "@/src/components/navigation/Link";
import type { Panel } from "@/types/panels";
import type { Community } from "@/types/v2/community";
import { formatDate } from "@/utilities/formatDate";
import { PAGES } from "@/utilities/pages";

interface Props {
  community: Community;
}

const PanelRow = memo(function PanelRow({
  panel,
  href,
  deleting,
  onDelete,
}: {
  panel: Panel;
  href: string;
  deleting: boolean;
  onDelete: () => void;
}) {
  return (
    <tr className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
      <td className="px-4 py-3">
        <Link
          href={href}
          className="font-medium text-zinc-900 hover:text-blue-600 hover:underline dark:text-zinc-100 dark:hover:text-blue-400"
        >
          {panel.title}
        </Link>
      </td>
      <td className="px-4 py-3 text-zinc-500">{pluralize("version", panel.versionCount, true)}</td>
      <td className="px-4 py-3 text-zinc-500">{formatDate(panel.updatedAt)}</td>
      <td className="px-4 py-3">
        <div className="flex items-center justify-end gap-1">
          <Button asChild variant="ghost" size="sm">
            <Link href={href}>Open</Link>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onDelete}
            disabled={deleting}
            className="text-red-600 hover:text-red-700 dark:text-red-500 dark:hover:text-red-400"
          >
            <Trash2 className="mr-1 h-3 w-3" />
            {deleting ? "Deleting..." : "Delete"}
          </Button>
        </div>
      </td>
    </tr>
  );
});

export function PanelListPage({ community }: Props) {
  const slug = community.details.slug;
  const router = useRouter();
  const { hasAccess, isLoading: accessLoading } = useCommunityAdminAccess(community.uid);
  const { data: panels, isLoading, isError, refetch } = usePanels(slug);
  const createMutation = useCreatePanel(slug);
  const deleteMutation = useDeletePanel(slug);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

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

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 p-12 text-zinc-500">
        <p>Panels could not be loaded.</p>
        <Button variant="outline" size="sm" onClick={() => void refetch()}>
          Try again
        </Button>
      </div>
    );
  }

  const handleCreate = async () => {
    try {
      const panel = await createMutation.mutateAsync({});
      router.push(PAGES.ADMIN.PANEL_STUDIO(slug, panel.id));
    } catch (error) {
      Sentry.captureException(error);
      toast.error("Failed to create panel");
    }
  };

  const handleDelete = async () => {
    if (!deleteTargetId) return;
    try {
      await deleteMutation.mutateAsync(deleteTargetId);
      toast.success("Panel deleted");
    } catch (error) {
      Sentry.captureException(error);
      toast.error("Failed to delete panel");
    } finally {
      setDeleteTargetId(null);
    }
  };

  const list = panels ?? [];

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">Panels</h1>
          <p className="text-sm text-zinc-500">
            Pages Karma AI writes from your community&apos;s data. Comment on any block to revise
            it.
          </p>
        </div>
        <Button onClick={handleCreate} isLoading={createMutation.isPending}>
          <Plus className="mr-1 h-4 w-4" />
          New panel
        </Button>
      </div>

      {list.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border p-12 text-center">
          <LayoutPanelTop className="h-8 w-8 text-zinc-400" />
          <p className="text-sm text-zinc-500">No panels yet. Create one to start writing.</p>
          <Button variant="outline" onClick={handleCreate} isLoading={createMutation.isPending}>
            <Plus className="mr-1 h-4 w-4" />
            New panel
          </Button>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-50 text-xs uppercase tracking-wider text-zinc-500 dark:bg-zinc-900">
              <tr>
                <th className="px-4 py-3 font-medium">Title</th>
                <th className="px-4 py-3 font-medium">Versions</th>
                <th className="px-4 py-3 font-medium">Updated</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {list.map((panel) => (
                <PanelRow
                  key={panel.id}
                  panel={panel}
                  href={PAGES.ADMIN.PANEL_STUDIO(slug, panel.id)}
                  deleting={deleteMutation.isPending && deleteMutation.variables === panel.id}
                  onDelete={() => setDeleteTargetId(panel.id)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      <DeleteDialog
        title="Delete this panel and every version and comment on it?"
        deleteFunction={handleDelete}
        isLoading={deleteMutation.isPending}
        externalIsOpen={deleteTargetId !== null}
        externalSetIsOpen={(open) => {
          if (!open) setDeleteTargetId(null);
        }}
      />
    </div>
  );
}
