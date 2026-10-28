"use client";

import { Trash2 } from "lucide-react";
import { memo, useState } from "react";
import toast from "react-hot-toast";
import { DeleteDialog } from "@/components/DeleteDialog";
import { Button } from "@/components/Utilities/Button";
import { Spinner } from "@/components/Utilities/Spinner";
import {
  useDisconnectSlackUser,
  useSlackUserConnections,
  useStartSlackUserConnect,
} from "@/hooks/useSlackOauth";
import type { SlackUserConnection } from "@/types/slack-oauth";
import { SlackOauthAddToSlackButton } from "./SlackOauthAddToSlackButton";

/**
 * The signed-in admin's own Slack authorization. Follow-up nudges on
 * action items are sent as this person, so the card is per user, not per
 * community; it lives here because the queue that uses it is an admin
 * surface.
 */
export function SlackUserConnectCard({ communitySlug }: { communitySlug: string }) {
  const query = useSlackUserConnections();

  if (query.isLoading) {
    return (
      <Shell>
        <div className="flex h-24 items-center justify-center">
          <Spinner />
        </div>
      </Shell>
    );
  }
  if (query.error) {
    return (
      <Shell>
        <div className="space-y-2 px-5 py-4">
          <p className="text-sm text-red-600 dark:text-red-400">
            Failed to load your Slack connection.
          </p>
          <Button
            type="button"
            variant="secondary"
            onClick={() => query.refetch()}
            aria-label="Retry loading your Slack connection"
          >
            Retry
          </Button>
        </div>
      </Shell>
    );
  }
  const connections = query.data ?? [];
  return (
    <Shell>
      <div className="space-y-4 px-5 py-4">
        {connections.length === 0 ? (
          <p className="text-xs text-stone-500 dark:text-zinc-400">
            Not connected. Follow-up reminders on your action items will be skipped until you
            connect.
          </p>
        ) : (
          <ul className="divide-y divide-stone-100 dark:divide-zinc-800">
            {connections.map((connection) => (
              <ConnectionRow key={connection.teamId} connection={connection} />
            ))}
          </ul>
        )}
        <ConnectButton communitySlug={communitySlug} hasConnections={connections.length > 0} />
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-xl border border-stone-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <header className="border-b border-stone-100 px-5 py-4 dark:border-zinc-800">
        <p className="text-sm font-semibold text-stone-900 dark:text-zinc-100">
          Your Slack account
        </p>
        <p className="mt-0.5 text-xs text-stone-500 dark:text-zinc-400">
          Lets Karma send follow-up reminders from your action items as you, not as a bot
        </p>
      </header>
      {children}
    </div>
  );
}

function ConnectButton({
  communitySlug,
  hasConnections,
}: {
  communitySlug: string;
  hasConnections: boolean;
}) {
  const { mutate, isPending } = useStartSlackUserConnect(communitySlug);
  const start = () =>
    mutate(undefined, {
      onError: (err) => toast.error(err.message || "Could not start Slack connection"),
    });
  if (hasConnections) {
    return (
      <Button type="button" variant="secondary" onClick={start} disabled={isPending}>
        {isPending ? "Connecting…" : "Connect another workspace"}
      </Button>
    );
  }
  return (
    <SlackOauthAddToSlackButton
      communitySlug={communitySlug}
      label="Connect my Slack"
      ariaLabel="Connect your Slack account"
      onStart={start}
      isPending={isPending}
    />
  );
}

const ConnectionRow = memo(function ConnectionRow({
  connection,
}: {
  connection: SlackUserConnection;
}) {
  const { mutate: disconnect } = useDisconnectSlackUser();
  const [open, setOpen] = useState(false);

  const handleConfirm = async () => {
    await new Promise<void>((resolve) => {
      disconnect(connection.teamId, {
        onSuccess: () => {
          toast.success(`Disconnected from ${connection.teamName}`);
          setOpen(false);
          resolve();
        },
        onError: (e) => {
          toast.error(e.message || "Disconnect failed");
          resolve();
        },
      });
    });
  };

  return (
    <li className="flex items-center justify-between gap-3 py-2 text-xs">
      <div>
        <p className="font-medium text-stone-900 dark:text-zinc-100">{connection.teamName}</p>
        <p className="text-stone-500 dark:text-zinc-400">
          Connected {formatDate(connection.connectedAt)}
        </p>
      </div>
      <DeleteDialog
        title={`Disconnect your Slack account from ${connection.teamName}?`}
        deleteFunction={handleConfirm}
        isLoading={false}
        externalIsOpen={open}
        externalSetIsOpen={setOpen}
        buttonElement={{
          text: "Disconnect",
          icon: <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />,
          styleClass:
            "inline-flex items-center gap-1 rounded-md border border-stone-200 px-2 py-1 text-xs text-stone-700 hover:bg-stone-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800",
        }}
      />
    </li>
  );
});

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
