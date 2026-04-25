"use client";

import { Button } from "@/components/Utilities/Button";
import { Spinner } from "@/components/Utilities/Spinner";
import { useSlackOauthWorkspace } from "@/hooks/useSlackOauth";
import type { SlackOAuthWorkspace } from "@/types/slack-oauth";
import { SlackOauthRegisterForm } from "./SlackOauthRegisterForm";
import { SlackOauthUserLinksSection } from "./SlackOauthUserLinksSection";
import { SlackOauthWorkspaceSummary } from "./SlackOauthWorkspaceSummary";

/**
 * Admin card for the Slack OAuth (DM) path. Sibling of the Telegram +
 * Slack-webhook cards on NotificationSettingsPage. Renders four
 * states (loading / error-retry / empty-register / populated-summary)
 * so callers never see a `null` or undefined placeholder.
 */
export function SlackOauthProviderCard({ communitySlug }: { communitySlug: string }) {
  const query = useSlackOauthWorkspace(communitySlug);

  if (query.isLoading) {
    return <SlackOauthProviderCardShell>{LoadingBody}</SlackOauthProviderCardShell>;
  }
  if (query.error) {
    return (
      <SlackOauthProviderCardShell>
        <ErrorBody onRetry={() => query.refetch()} />
      </SlackOauthProviderCardShell>
    );
  }
  if (!query.data) {
    return (
      <SlackOauthProviderCardShell>
        <SlackOauthRegisterForm communitySlug={communitySlug} />
      </SlackOauthProviderCardShell>
    );
  }
  return (
    <SlackOauthProviderCardShell>
      <PopulatedBody workspace={query.data} communitySlug={communitySlug} />
    </SlackOauthProviderCardShell>
  );
}

function SlackOauthProviderCardShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-xl border border-stone-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <header className="border-b border-stone-100 px-5 py-4 dark:border-zinc-800">
        <p className="text-sm font-semibold text-stone-900 dark:text-zinc-100">Slack DMs</p>
        <p className="mt-0.5 text-xs text-stone-500 dark:text-zinc-400">
          Direct messages to individual users via the Karma Slack App
        </p>
      </header>
      {children}
    </div>
  );
}

const LoadingBody = (
  <div className="flex h-32 items-center justify-center">
    <Spinner />
  </div>
);

function ErrorBody({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="space-y-2 px-5 py-4">
      <p className="text-sm text-red-600 dark:text-red-400">
        Failed to load Slack DM configuration.
      </p>
      <Button
        type="button"
        variant="secondary"
        onClick={onRetry}
        aria-label="Retry loading Slack workspace"
      >
        Retry
      </Button>
    </div>
  );
}

function PopulatedBody({
  workspace,
  communitySlug,
}: {
  workspace: SlackOAuthWorkspace;
  communitySlug: string;
}) {
  return (
    <div className="space-y-4 px-5 py-4">
      <SlackOauthWorkspaceSummary workspace={workspace} communitySlug={communitySlug} />
      <SlackOauthUserLinksSection workspace={workspace} communitySlug={communitySlug} />
    </div>
  );
}
