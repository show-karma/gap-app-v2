"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import pluralize from "pluralize";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  useApproveAgentWrite,
  usePendingAgentWrites,
  useRejectAgentWrite,
} from "@/hooks/agent-actions/usePendingAgentWrites";
import { useAuth } from "@/hooks/useAuth";
import type { PendingAgentWrite } from "@/services/pending-agent-writes.service";
import { PAGES } from "@/utilities/pages";
import { HistoryActionRow } from "./HistoryActionRow";
import { PendingActionRow } from "./PendingActionRow";

const PAGE_TITLE = "Agent actions";

export function SettingsAgentActionsPage() {
  const { ready, authenticated, login } = useAuth();
  const gate = ready && authenticated;

  const pendingQuery = usePendingAgentWrites("pending", gate);
  const historyQuery = usePendingAgentWrites("decided", gate);
  // `mutateAsync` is referentially stable across renders (React Query v5), so
  // destructuring it keeps the row callbacks below stable and `React.memo` on
  // the rows effective.
  const { mutateAsync: approveWrite } = useApproveAgentWrite();
  const { mutateAsync: rejectWrite } = useRejectAgentWrite();
  const [busyId, setBusyId] = useState<string | null>(null);

  // Read-only deep link (approvalUrl `?item=<id>`). Never mirrored into state or
  // pushed back to the router — just used to highlight + scroll to the row.
  const searchParams = useSearchParams();
  const highlightedId = searchParams.get("item");

  const handleApprove = useCallback(
    async (write: PendingAgentWrite) => {
      setBusyId(write.id);
      try {
        await approveWrite(write);
      } catch {
        // SUPPRESSED: mutateAsync rejections are already surfaced by the
        // mutation's onError (rollback + toast/errorManager); catching here
        // only prevents an unhandled rejection at fire-and-forget call sites.
      } finally {
        setBusyId(null);
      }
    },
    [approveWrite]
  );

  const handleReject = useCallback(
    async (write: PendingAgentWrite) => {
      setBusyId(write.id);
      try {
        await rejectWrite(write);
      } catch {
        // SUPPRESSED: see handleApprove — errors are handled by the mutation.
      } finally {
        setBusyId(null);
      }
    },
    [rejectWrite]
  );

  if (!ready) {
    return (
      <Layout>
        <ListSkeleton />
      </Layout>
    );
  }

  if (!authenticated) {
    return (
      <Layout>
        <Card>
          <h2 className="text-base font-semibold text-foreground">
            Sign in to review agent actions
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            You need to sign in to your Karma account before you can approve or reject actions your
            AI agents have proposed.
          </p>
          <div className="mt-4">
            <Button onClick={() => login()}>Sign in to Karma</Button>
          </div>
        </Card>
      </Layout>
    );
  }

  if (pendingQuery.isLoading) {
    return (
      <Layout>
        <ListSkeleton />
      </Layout>
    );
  }

  if (pendingQuery.isError) {
    return (
      <Layout>
        <Card>
          <h2 className="text-base font-semibold text-foreground">Couldn't load agent actions</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {pendingQuery.error?.message ?? "An unexpected error occurred."}
          </p>
          <div className="mt-4">
            <Button variant="outline" onClick={() => pendingQuery.refetch()}>
              Try again
            </Button>
          </div>
        </Card>
      </Layout>
    );
  }

  const pending = pendingQuery.data?.writes ?? [];
  const history = historyQuery.data?.writes ?? [];

  return (
    <Layout>
      <p className="text-sm text-muted-foreground">
        When an AI agent proposes a critical change over Karma&apos;s MCP connection, it&apos;s
        staged here for you to review. Nothing runs until you approve it. Manage which apps can
        connect from your{" "}
        <Link
          href={PAGES.SETTINGS.CONNECTIONS}
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          connected apps
        </Link>
        .
      </p>

      {pending.length === 0 ? (
        <Card>
          <h2 className="text-base font-semibold text-foreground">You&apos;re all caught up</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            No agent actions are waiting for your approval. When one of your connected AI apps
            proposes a change that needs a human sign-off, it will show up here.
          </p>
        </Card>
      ) : (
        <section aria-labelledby="pending-heading">
          <h2 id="pending-heading" className="text-sm font-semibold text-foreground">
            {pending.length} pending {pluralize("action", pending.length)}
          </h2>
          <ul className="mt-3 space-y-3">
            {pending.map((write) => (
              <PendingActionRow
                key={write.id}
                write={write}
                isBusy={busyId === write.id}
                isHighlighted={write.id === highlightedId}
                onApprove={handleApprove}
                onReject={handleReject}
              />
            ))}
          </ul>
        </section>
      )}

      {historyQuery.isLoading ? (
        <HistorySkeleton />
      ) : historyQuery.isError ? (
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-medium text-foreground">
              Couldn't load your recent decisions
            </p>
            <Button variant="outline" size="sm" onClick={() => historyQuery.refetch()}>
              Try again
            </Button>
          </div>
        </Card>
      ) : history.length > 0 ? (
        <section aria-labelledby="history-heading">
          <h2 id="history-heading" className="text-sm font-semibold text-foreground">
            {history.length} recent {pluralize("decision", history.length)}
          </h2>
          <ul className="mt-3 space-y-3">
            {history.map((write) => (
              <HistoryActionRow
                key={write.id}
                write={write}
                isHighlighted={write.id === highlightedId}
              />
            ))}
          </ul>
        </section>
      ) : null}
    </Layout>
  );
}

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-12">
      <header>
        <p className="text-xs font-medium uppercase tracking-wider text-primary">Settings</p>
        <h1 className="mt-1 text-3xl font-semibold text-foreground">{PAGE_TITLE}</h1>
      </header>
      {children}
    </main>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">{children}</div>;
}

function ListSkeleton() {
  return (
    <output
      aria-label="Loading your pending agent actions"
      aria-busy="true"
      className="block space-y-3"
    >
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="h-32 w-full animate-pulse rounded-2xl border border-border bg-card"
        />
      ))}
    </output>
  );
}

function HistorySkeleton() {
  return (
    <output aria-label="Loading your recent decisions" aria-busy="true" className="block space-y-3">
      {[0, 1].map((i) => (
        <div
          key={i}
          className="h-20 w-full animate-pulse rounded-2xl border border-border bg-card"
        />
      ))}
    </output>
  );
}
