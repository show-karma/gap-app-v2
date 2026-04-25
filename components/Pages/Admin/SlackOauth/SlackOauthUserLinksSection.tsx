"use client";

import { Button } from "@/components/Utilities/Button";
import { Spinner } from "@/components/Utilities/Spinner";
import { useSlackOauthUserLinks } from "@/hooks/useSlackOauth";
import type { SlackOAuthUserLink, SlackOAuthWorkspace } from "@/types/slack-oauth";
import { SlackOauthAddLinkForm } from "./SlackOauthAddLinkForm";
import { SlackOauthUserLinkRow } from "./SlackOauthUserLinkRow";

/**
 * Linked-users sub-section: add-link form + list. Renders four states
 * — loading, error-with-retry, empty, populated. Keeps the orchestrator
 * card slim by owning its own data fetch via `useSlackOauthUserLinks`.
 *
 * Page size is capped at 100 because the backend Zod schema caps
 * `limit` there; pagination beyond the first page isn't wired yet —
 * Segment 2 item.
 */

const LIST_LIMIT = 100;

export function SlackOauthUserLinksSection({
  workspace,
  communitySlug,
}: {
  workspace: SlackOAuthWorkspace;
  communitySlug: string;
}) {
  const { data, isLoading, isError, refetch } = useSlackOauthUserLinks(communitySlug, {
    limit: LIST_LIMIT,
  });

  return (
    <section className="space-y-3">
      <p className="text-sm font-semibold text-stone-900 dark:text-zinc-100">Linked users</p>

      <SlackOauthAddLinkForm workspace={workspace} communitySlug={communitySlug} />

      <SlackOauthUserLinksBody
        isLoading={isLoading}
        isError={isError}
        items={data?.items ?? []}
        communitySlug={communitySlug}
        onRetry={() => refetch()}
      />
    </section>
  );
}

function SlackOauthUserLinksBody({
  isLoading,
  isError,
  items,
  communitySlug,
  onRetry,
}: {
  isLoading: boolean;
  isError: boolean;
  items: SlackOAuthUserLink[];
  communitySlug: string;
  onRetry: () => void;
}) {
  if (isLoading) {
    return (
      <div className="flex justify-center py-2">
        <Spinner />
      </div>
    );
  }
  // Error before empty — without this branch, a failed fetch silently
  // shows "No users linked yet" (false truth for the admin).
  if (isError) {
    return (
      <div className="space-y-1.5 rounded-md border border-red-200 bg-red-50 px-3 py-2 dark:border-red-900/40 dark:bg-red-900/10">
        <p className="text-xs text-red-600 dark:text-red-400">Failed to load linked users.</p>
        <Button
          type="button"
          variant="secondary"
          onClick={onRetry}
          aria-label="Retry loading linked users"
        >
          Retry
        </Button>
      </div>
    );
  }
  if (items.length === 0) {
    return (
      <p className="text-xs text-stone-500 dark:text-zinc-400">
        No users linked yet. Add one above.
      </p>
    );
  }
  return (
    <ul className="divide-y divide-stone-100 rounded-lg border border-stone-200 dark:divide-zinc-800 dark:border-zinc-800">
      {items.map((link) => (
        <SlackOauthUserLinkRow key={link.uid} link={link} communitySlug={communitySlug} />
      ))}
    </ul>
  );
}
