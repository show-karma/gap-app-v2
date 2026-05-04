"use client";

import Image from "next/image";
import { useState } from "react";
import { DeleteDialog } from "@/components/DeleteDialog";
import { Button } from "@/components/ui/button";
import { useOAuthConnections, useRevokeOAuthConnection } from "@/hooks/oauth/useOAuthConnections";
import { useAuth } from "@/hooks/useAuth";
import type { OAuthConnection } from "@/services/oauth/connections.service";

function formatDate(value: string | null): string {
  if (!value) return "Never";
  try {
    return new Date(value).toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return value;
  }
}

export function SettingsConnectionsPage() {
  const { ready, authenticated, login } = useAuth();
  const connectionsQuery = useOAuthConnections(ready && authenticated);
  const revokeMutation = useRevokeOAuthConnection();
  const [pendingClientId, setPendingClientId] = useState<string | null>(null);

  if (!ready) {
    return <Layout title="Connections">{null}</Layout>;
  }

  if (!authenticated) {
    return (
      <Layout title="Connections">
        <Card>
          <h2 className="text-base font-semibold text-foreground">
            Sign in to manage your connections
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            You need to sign in to your Karma account before you can review connected AI apps.
          </p>
          <div className="mt-4">
            <Button onClick={() => login()}>Sign in to Karma</Button>
          </div>
        </Card>
      </Layout>
    );
  }

  if (connectionsQuery.isLoading) {
    return (
      <Layout title="Connections">
        <ListSkeleton />
      </Layout>
    );
  }

  if (connectionsQuery.isError) {
    return (
      <Layout title="Connections">
        <Card>
          <h2 className="text-base font-semibold text-foreground">Couldn't load connections</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {(connectionsQuery.error as Error)?.message ?? "An unexpected error occurred."}
          </p>
          <div className="mt-4">
            <Button variant="outline" onClick={() => connectionsQuery.refetch()}>
              Try again
            </Button>
          </div>
        </Card>
      </Layout>
    );
  }

  const connections = connectionsQuery.data ?? [];

  if (connections.length === 0) {
    return (
      <Layout title="Connections">
        <Card>
          <h2 className="text-base font-semibold text-foreground">No connected apps yet</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            When you approve an AI app to use the Karma MCP server, it will appear here. Visit{" "}
            <a
              href="/mcp/connect"
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              /mcp/connect
            </a>{" "}
            for setup instructions.
          </p>
        </Card>
      </Layout>
    );
  }

  return (
    <Layout title="Connections">
      <p className="text-sm text-muted-foreground">
        These AI apps can access your Karma MCP tools. Revoking a connection immediately invalidates
        its refresh token; any in-flight access tokens expire within 15 minutes.
      </p>
      <ul className="mt-6 space-y-3">
        {connections.map((connection) => {
          const isPending = pendingClientId === connection.clientId && revokeMutation.isPending;
          return (
            <li
              key={connection.clientId}
              className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-5 sm:flex-row sm:items-center sm:justify-between"
            >
              <ConnectionMeta connection={connection} />
              <DeleteDialog
                title={
                  <span>
                    Revoke <span className="font-semibold">{connection.clientName}</span>?
                  </span>
                }
                buttonElement={{
                  icon: null,
                  text: "Revoke",
                  styleClass: "border border-border text-foreground hover:bg-secondary",
                }}
                isLoading={isPending}
                deleteFunction={async () => {
                  setPendingClientId(connection.clientId);
                  try {
                    await revokeMutation.mutateAsync(connection.clientId);
                  } finally {
                    setPendingClientId(null);
                  }
                }}
              />
            </li>
          );
        })}
      </ul>
    </Layout>
  );
}

function ConnectionMeta({ connection }: { connection: OAuthConnection }) {
  return (
    <div className="flex min-w-0 items-center gap-4">
      {connection.logoUri ? (
        <Image
          src={connection.logoUri}
          alt={`${connection.clientName} logo`}
          width={48}
          height={48}
          unoptimized
          className="h-12 w-12 shrink-0 rounded-lg border border-border bg-muted object-contain"
        />
      ) : (
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-muted text-lg font-semibold text-foreground">
          {connection.clientName.slice(0, 1).toUpperCase()}
        </div>
      )}
      <div className="min-w-0">
        <h3 className="truncate text-base font-semibold text-foreground">
          {connection.clientName}
        </h3>
        <p className="text-xs text-muted-foreground">
          Connected {formatDate(connection.issuedAt)}
          {connection.expiresAt ? ` · Expires ${formatDate(connection.expiresAt)}` : null}
        </p>
        {connection.clientUri ? (
          <a
            href={connection.clientUri}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 inline-block text-xs font-medium text-primary underline-offset-4 hover:underline"
          >
            {new URL(connection.clientUri).hostname}
          </a>
        ) : null}
      </div>
    </div>
  );
}

function Layout({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-12">
      <header>
        <p className="text-xs font-medium uppercase tracking-wider text-primary">Settings</p>
        <h1 className="mt-1 text-3xl font-semibold text-foreground">{title}</h1>
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
    <output aria-label="Loading your connected apps" className="block space-y-3">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="h-20 w-full animate-pulse rounded-2xl border border-border bg-card"
        />
      ))}
    </output>
  );
}
