"use client";

import { useQuery } from "@tanstack/react-query";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { createAuthenticatedApiClient } from "@/utilities/auth/api-client";
import { envVars } from "@/utilities/enviromentVars";

interface ConsentSession {
  clientId: string;
  clientName: string;
  logoUri: string | null;
  clientUri: string | null;
  scope: string;
  redirectUri: string;
  resource: string;
  hasExistingConsent: boolean;
}

const RECONNECT_DELAY_MS = 1500;

function shortenAddress(address: string): string {
  if (address.length <= 14) return address;
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

function consentApiClient() {
  return createAuthenticatedApiClient(envVars.NEXT_PUBLIC_GAP_INDEXER_URL);
}

export function OAuthConsentClient() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session");
  const { ready, authenticated, login, address } = useAuth();
  const [submission, setSubmission] = useState<
    | { state: "idle" }
    | { state: "submitting"; decision: "allow" | "deny" }
    | { state: "redirecting"; url: string }
    | { state: "error"; message: string }
  >({ state: "idle" });
  const autoSubmittedRef = useRef(false);

  const sessionQuery = useQuery({
    queryKey: ["oauth", "consent-session", sessionId],
    enabled: Boolean(sessionId) && ready && authenticated,
    retry: false,
    queryFn: async () => {
      const response = await consentApiClient().get<ConsentSession>(
        `/v2/oauth/consent/session/${encodeURIComponent(sessionId ?? "")}`
      );
      return response.data;
    },
  });

  const submitDecision = useMemo(
    () => async (decision: "allow" | "deny") => {
      if (!sessionId) return;
      setSubmission({ state: "submitting", decision });
      try {
        const response = await consentApiClient().post<{ redirect_to: string }>(
          "/v2/oauth/consent",
          { session: sessionId, decision }
        );
        setSubmission({ state: "redirecting", url: response.data.redirect_to });
        window.location.assign(response.data.redirect_to);
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Could not record your decision. Please try again.";
        setSubmission({ state: "error", message });
      }
    },
    [sessionId]
  );

  useEffect(() => {
    if (
      sessionQuery.data?.hasExistingConsent &&
      submission.state === "idle" &&
      !autoSubmittedRef.current
    ) {
      autoSubmittedRef.current = true;
      const timer = window.setTimeout(() => {
        void submitDecision("allow");
      }, RECONNECT_DELAY_MS);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [sessionQuery.data, submission.state, submitDecision]);

  if (!sessionId) {
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

  if (sessionQuery.isLoading) {
    return (
      <Layout>
        <Skeleton />
      </Layout>
    );
  }

  if (sessionQuery.isError || !sessionQuery.data) {
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

  if (submission.state === "redirecting") {
    return (
      <Layout>
        <h1 className="text-xl font-semibold text-foreground">
          Redirecting back to {sessionQuery.data.clientName}…
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          If your browser doesn't redirect automatically,{" "}
          <a
            href={submission.url}
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            click here
          </a>
          .
        </p>
      </Layout>
    );
  }

  const { clientName, logoUri, clientUri, hasExistingConsent } = sessionQuery.data;

  if (hasExistingConsent && submission.state !== "error") {
    return (
      <Layout>
        <div className="flex items-center gap-4">
          <ClientLogo logoUri={logoUri} clientName={clientName} />
          <div>
            <h1 className="text-lg font-semibold text-foreground">Reconnecting {clientName}…</h1>
            <p className="text-sm text-muted-foreground">
              You've already approved {clientName} on this account.
            </p>
          </div>
        </div>
        <div className="mt-6 flex justify-end">
          <Button
            variant="outline"
            disabled={submission.state === "submitting"}
            onClick={() => {
              autoSubmittedRef.current = true;
              void submitDecision("deny");
            }}
          >
            Cancel
          </Button>
        </div>
      </Layout>
    );
  }

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

      {submission.state === "error" ? (
        <p className="mt-4 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {submission.message}
        </p>
      ) : null}

      <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button
          variant="outline"
          disabled={submission.state === "submitting"}
          onClick={() => {
            void submitDecision("deny");
          }}
        >
          Cancel
        </Button>
        <Button
          disabled={submission.state === "submitting"}
          onClick={() => {
            void submitDecision("allow");
          }}
        >
          {submission.state === "submitting" && submission.decision === "allow"
            ? "Approving…"
            : "Allow"}
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
