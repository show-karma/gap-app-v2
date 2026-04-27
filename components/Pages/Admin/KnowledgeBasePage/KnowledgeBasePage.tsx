"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/Utilities/Button";
import { Spinner } from "@/components/Utilities/Spinner";
import { useCommunityAdminAccess } from "@/hooks/communities/useCommunityAdminAccess";
import { useKnowledgeSources } from "@/hooks/knowledge-base/useKnowledgeSources";
import type { Community } from "@/types/v2/community";
import { AddSourceDialog } from "./AddSourceDialog";
import { SourceRow } from "./SourceRow";

interface Props {
  community: Community;
}

export function KnowledgeBasePage({ community }: Props) {
  const slug = community.details?.data?.slug ?? community.uid;
  const { hasAccess, isLoading: isCheckingAdmin } = useCommunityAdminAccess(community.uid);
  const sources = useKnowledgeSources(hasAccess ? slug : undefined);
  const [addOpen, setAddOpen] = useState(false);

  if (isCheckingAdmin) {
    return (
      <div className="flex w-full items-center justify-center py-16">
        <Spinner />
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="mx-auto max-w-3xl py-16 text-center">
        <h2 className="text-lg font-semibold">Access denied</h2>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Only community admins can manage knowledge sources.
        </p>
      </div>
    );
  }

  const list = sources.data ?? [];

  return (
    <div className="mx-auto max-w-5xl py-8">
      <header className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Knowledge base</h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Sources fed into the chatbot for this community. Each source is fetched, chunked, and
            embedded on the nightly sync.
          </p>
        </div>
        <Button type="button" onClick={() => setAddOpen(true)}>
          <Plus className="mr-1 h-4 w-4" />
          Add source
        </Button>
      </header>

      {sources.isLoading && (
        <div className="flex items-center justify-center py-16">
          <Spinner />
        </div>
      )}

      {sources.isError && (
        <div className="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-200">
          Failed to load knowledge sources:{" "}
          {sources.error instanceof Error ? sources.error.message : "unknown error"}
          <button type="button" onClick={() => sources.refetch()} className="ml-2 underline">
            Retry
          </button>
        </div>
      )}

      {!sources.isLoading && !sources.isError && list.length === 0 && (
        <div className="rounded border border-dashed border-zinc-300 p-12 text-center dark:border-zinc-700">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            No knowledge sources yet. Add one to start feeding the chatbot.
          </p>
          <Button type="button" onClick={() => setAddOpen(true)} className="mt-4">
            <Plus className="mr-1 h-4 w-4" />
            Add your first source
          </Button>
        </div>
      )}

      {!sources.isLoading && !sources.isError && list.length > 0 && (
        <div className="overflow-x-auto rounded border border-zinc-200 dark:border-zinc-800">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-50 text-xs uppercase text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400">
              <tr>
                <th className="px-3 py-2">Title / Source</th>
                <th className="px-3 py-2">Kind</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Last sync</th>
                <th className="px-3 py-2">Stats (added/updated/removed/unchanged)</th>
                <th className="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {list.map((s) => (
                <SourceRow key={s.id} source={s} communityIdOrSlug={slug} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      <AddSourceDialog communityIdOrSlug={slug} open={addOpen} onOpenChange={setAddOpen} />
    </div>
  );
}
