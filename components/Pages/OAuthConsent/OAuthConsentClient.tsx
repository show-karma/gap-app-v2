"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { type ReactElement, useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { envVars } from "@/utilities/enviromentVars";

/**
 * Consent UI for the gap-oauth interaction protocol.
 *
 * Flow:
 *   1. MCP client redirects user to /auth on gap-oauth.
 *   2. gap-oauth issues an interaction uid and redirects to this page
 *      with `?interaction=<uid>`.
 *   3. We GET `/interaction/:uid` on gap-oauth to load the client name,
 *      logo, scope, and redirect URI for display.
 *   4. User clicks Allow. We grab the Privy session JWT, POST it to
 *      `/interaction/:uid/confirm`, and gap-oauth returns a `redirect_to`
 *      URL that carries the OAuth code back to the MCP client.
 *   5. Cancel → POST /interaction/:uid/abort, also returns a redirect_to
 *      with `?error=access_denied`.
 *
 * The Privy JWT is passed only to gap-oauth, which verifies it with
 * `@privy-io/server-auth` and uses the recovered wallet address as the
 * OAuth `accountId`. We never expose it to the MCP client itself.
 */

interface InteractionDetails {
  uid: string;
  prompt: { name: string };
  params: {
    client_id?: string;
    redirect_uri?: string;
    scope?: string;
    state?: string;
  };
  client: {
    clientId: string;
    clientName: string;
    logoUri?: string | null;
    clientUri?: string | null;
    redirectUris: string[];
  } | null;
}

const OAUTH_BASE = envVars.NEXT_PUBLIC_GAP_OAUTH_URL;

function shortenAddress(address: string): string {
  if (address.length <= 14) return address;
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

async function loadInteraction(uid: string): Promise<InteractionDetails> {
  const res = await fetch(`${OAUTH_BASE}/interaction/${encodeURIComponent(uid)}`, {
    credentials: "include",
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(
      `Authorization session not found or expired (${res.status}: ${body.slice(0, 200)})`
    );
  }
  return (await res.json()) as InteractionDetails;
}

// Fetch the per-interaction CSRF token. gap-oauth binds the token to the
// interaction cookie via HMAC over the uid; the consent UI echoes it back
// in `X-Karma-CSRF` on confirm/abort so a third-party origin holding only
// a Privy bearer token can't forge a consent decision. The endpoint
// returns 401 if the interaction cookie is missing or doesn't bind to
// the requested uid (validated server-side via provider.interactionDetails).
async function loadCsrfToken(uid: string): Promise<string> {
  const res = await fetch(`${OAUTH_BASE}/interaction/${encodeURIComponent(uid)}/csrf`, {
    credentials: "include",
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Could not initialize secure consent (${res.status}: ${body.slice(0, 200)})`);
  }
  const data = (await res.json()) as { csrf?: string };
  if (!data.csrf) throw new Error("Server did not return a CSRF token");
  return data.csrf;
}

async function postInteractionDecision(
  uid: string,
  endpoint: "confirm" | "abort",
  privyJwt: string | null,
  csrfToken: string
): Promise<{ redirect_to: string }> {
  // Send the Privy session JWT in `Authorization: Bearer` rather than
  // the request body. Standard log-redaction in pino, proxies, and
  // APM tools targets the Authorization header by default; bodies
  // typically aren't redacted, so a debug-level log line of req.body
  // would leak the JWT.
  const headers: Record<string, string> = {
    "content-type": "application/json",
    "x-karma-csrf": csrfToken,
  };
  if (privyJwt) {
    headers.authorization = `Bearer ${privyJwt}`;
  }
  const res = await fetch(`${OAUTH_BASE}/interaction/${encodeURIComponent(uid)}/${endpoint}`, {
    method: "POST",
    credentials: "include",
    headers,
    body: JSON.stringify({}),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      endpoint === "confirm"
        ? `Could not record your approval (${res.status}: ${text.slice(0, 200)})`
        : `Could not cancel the connection (${res.status}: ${text.slice(0, 200)})`
    );
  }
  return (await res.json()) as { redirect_to: string };
}

interface ConsentGuardArgs {
  interactionUid: string | null;
  ready: boolean;
  authenticated: boolean;
  login: () => void;
  interactionQuery: { isLoading: boolean; isSuccess: boolean; isError: boolean; data: unknown };
  csrfQuery: {
    isLoading: boolean;
    isError: boolean;
    data: string | undefined;
    error: unknown;
    refetch: () => void;
  };
  redirectingTo: string | null;
}

function renderConsentGuard(args: ConsentGuardArgs): ReactElement | null {
  const {
    interactionUid,
    ready,
    authenticated,
    login,
    interactionQuery,
    csrfQuery,
    redirectingTo,
  } = args;

  if (!interactionUid) {
    return (
      <Layout>
        <h1 className="text-xl font-semibold text-foreground">Missing connection link</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          This page should be opened from your AI app's connection flow.
        </p>
      </Layout>
    );
  }
  if (!ready) {
    return (
      <Layout>
        <Skeleton />
      </Layout>
    );
  }
  if (!authenticated) {
    return (
      <Layout>
        <h1 className="text-xl font-semibold text-foreground">Sign in to continue</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          You need to sign in to your Karma account before you can approve this connection.
        </p>
        <div className="mt-6">
          <Button onClick={() => login()}>Sign in to Karma</Button>
        </div>
      </Layout>
    );
  }
  if (interactionQuery.isLoading || (interactionQuery.isSuccess && csrfQuery.isLoading)) {
    return (
      <Layout>
        <Skeleton />
      </Layout>
    );
  }
  if (interactionQuery.isError || !interactionQuery.data) {
    return (
      <Layout>
        <h1 className="text-xl font-semibold text-foreground">
          This connection link is no longer valid
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Authorization links expire after 5 minutes. Restart the connection from your AI app to try
          again.
        </p>
      </Layout>
    );
  }
  if (csrfQuery.isError || !csrfQuery.data) {
    return (
      <Layout>
        <h1 className="text-xl font-semibold text-foreground">
          Couldn't initialize secure consent
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          {(csrfQuery.error as Error | null)?.message ??
            "We couldn't reach the authorization server. Refresh to try again."}
        </p>
        <div className="mt-6">
          <Button variant="outline" onClick={() => csrfQuery.refetch()}>
            Try again
          </Button>
        </div>
      </Layout>
    );
  }
  if (redirectingTo) {
    return (
      <Layout>
        <h1 className="text-xl font-semibold text-foreground">Redirecting back to your app…</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          If your browser doesn't redirect automatically,{" "}
          <a
            href={redirectingTo}
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            click here
          </a>
          .
        </p>
      </Layout>
    );
  }
  return null;
}

export function OAuthConsentClient() {
  const searchParams = useSearchParams();
  const interactionUid = searchParams.get("interaction");
  const { ready, authenticated, login, address, getAccessToken } = useAuth();

  const interactionQuery = useQuery({
    queryKey: ["oauth", "interaction", interactionUid],
    enabled: Boolean(interactionUid) && ready && authenticated,
    retry: false,
    queryFn: () => loadInteraction(interactionUid as string),
  });

  // Fetch the CSRF token only after the interaction itself has loaded —
  // the CSRF endpoint requires the interaction cookie that loadInteraction
  // implicitly forwards via `credentials: include`. Decoupling lets us
  // surface a clearer error if the cookie is missing without conflating
  // it with an expired interaction.
  const csrfQuery = useQuery({
    queryKey: ["oauth", "interaction", interactionUid, "csrf"],
    enabled: Boolean(interactionUid) && interactionQuery.isSuccess,
    retry: false,
    queryFn: () => loadCsrfToken(interactionUid as string),
  });

  const [redirectingTo, setRedirectingTo] = useState<string | null>(null);

  const confirm = useMutation({
    mutationFn: async () => {
      if (!interactionUid) throw new Error("Missing interaction uid");
      if (!csrfQuery.data) throw new Error("CSRF token not ready");
      const token = await getAccessToken();
      return postInteractionDecision(interactionUid, "confirm", token ?? null, csrfQuery.data);
    },
    onSuccess: ({ redirect_to }) => {
      setRedirectingTo(redirect_to);
      window.location.assign(redirect_to);
    },
  });

  const abort = useMutation({
    mutationFn: async () => {
      if (!interactionUid) throw new Error("Missing interaction uid");
      if (!csrfQuery.data) throw new Error("CSRF token not ready");
      return postInteractionDecision(interactionUid, "abort", null, csrfQuery.data);
    },
    onSuccess: ({ redirect_to }) => {
      setRedirectingTo(redirect_to);
      window.location.assign(redirect_to);
    },
  });

  const onAllow = useCallback(() => {
    confirm.mutate();
  }, [confirm]);
  const onCancel = useCallback(() => {
    abort.mutate();
  }, [abort]);

  const guard = renderConsentGuard({
    interactionUid,
    ready,
    authenticated,
    login,
    interactionQuery,
    csrfQuery,
    redirectingTo,
  });
  if (guard) return guard;

  if (!interactionQuery.data) return null;
  const client = interactionQuery.data.client;
  const clientName = client?.clientName ?? client?.clientId ?? "Unknown app";
  const logoUri = client?.logoUri ?? null;
  const clientUri = client?.clientUri ?? null;
  const error = (confirm.error ?? abort.error) as Error | null;
  const submitting = confirm.isPending || abort.isPending;

  return (
    <Layout>
      <div className="flex items-center gap-4">
        <ClientLogo logoUri={logoUri} clientName={clientName} />
        <div className="min-w-0">
          <h1 className="truncate text-lg font-semibold text-foreground">
            {clientName} wants to connect to Karma
          </h1>
          {clientUri ? (
            <a
              href={clientUri}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-muted-foreground underline-offset-4 hover:underline"
            >
              {new URL(clientUri).hostname}
            </a>
          ) : null}
        </div>
      </div>

      <ul className="mt-6 space-y-2 text-sm text-foreground">
        <li className="flex items-start gap-2">
          <Bullet />
          Use the Karma MCP tools on your behalf — view your projects, grants, and impact data.
        </li>
        <li className="flex items-start gap-2">
          <Bullet />
          Take actions you can take yourself: create projects, post updates, and submit milestone
          evidence.
        </li>
      </ul>

      {address ? (
        <p className="mt-6 text-xs text-muted-foreground">
          Signed in as{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 text-foreground">
            {shortenAddress(address)}
          </code>
        </p>
      ) : null}

      {error ? (
        <p className="mt-4 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {error.message}
        </p>
      ) : null}

      <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button variant="outline" disabled={submitting} onClick={onCancel}>
          {abort.isPending ? "Cancelling…" : "Cancel"}
        </Button>
        <Button disabled={submitting} onClick={onAllow}>
          {confirm.isPending ? "Approving…" : "Allow"}
        </Button>
      </div>
    </Layout>
  );
}

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-[80vh] items-center justify-center bg-background px-4 py-16">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-sm">
        {children}
      </div>
    </main>
  );
}

function ClientLogo({ logoUri, clientName }: { logoUri: string | null; clientName: string }) {
  if (logoUri) {
    return (
      <Image
        src={logoUri}
        alt={`${clientName} logo`}
        width={48}
        height={48}
        unoptimized
        className="h-12 w-12 rounded-lg border border-border bg-muted object-contain"
      />
    );
  }
  return (
    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted text-lg font-semibold text-foreground">
      {clientName.slice(0, 1).toUpperCase()}
    </div>
  );
}

function Bullet() {
  return (
    <span
      aria-hidden
      className="mt-1.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-primary"
    />
  );
}

function Skeleton() {
  return (
    <output aria-label="Loading authorization details" className="block space-y-4">
      <div className="flex items-center gap-4">
        <div className="h-12 w-12 animate-pulse rounded-lg bg-muted" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-48 animate-pulse rounded bg-muted" />
          <div className="h-3 w-32 animate-pulse rounded bg-muted" />
        </div>
      </div>
      <div className="h-3 w-full animate-pulse rounded bg-muted" />
      <div className="h-3 w-3/4 animate-pulse rounded bg-muted" />
      <div className="flex justify-end gap-3 pt-4">
        <div className="h-9 w-20 animate-pulse rounded bg-muted" />
        <div className="h-9 w-20 animate-pulse rounded bg-muted" />
      </div>
    </output>
  );
}
