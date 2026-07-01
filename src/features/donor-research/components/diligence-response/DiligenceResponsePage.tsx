"use client";

import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDiligenceResponseContext } from "@/hooks/useDiligence";
import { formatDate } from "@/utilities/formatDate";
import { DiligenceResponseForm } from "./DiligenceResponseForm";

interface DiligenceResponsePageProps {
  token: string;
}

/**
 * Public nonprofit response page (DEV-428).
 *
 * Unauthenticated — the token in the URL IS the capability. Anonymous until
 * Connect: this surface never renders who is asking beyond the optional org
 * name the backend chooses to expose. No advisor / donor / contact identity.
 *
 * Three states:
 *   - loading  → skeleton
 *   - error    → generic card with a retry button
 *   - data === null (unknown OR expired token, collapsed to one case by the
 *     service) → generic "link no longer valid" card
 *
 * When the context loads, an already-submitted token shows a thank-you state
 * instead of the form (the submit mutation flips `alreadySubmitted` in the
 * cache, so a successful submit re-renders into that state).
 */
export function DiligenceResponsePage({ token }: DiligenceResponsePageProps) {
  const { data, isLoading, isError, refetch } = useDiligenceResponseContext(token);

  if (isLoading) {
    return (
      <Shell>
        <div className="flex flex-col gap-4">
          <div className="h-7 w-2/3 animate-pulse rounded bg-muted" />
          <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
          <div className="mt-4 h-32 animate-pulse rounded-xl bg-muted" />
          <div className="h-32 animate-pulse rounded-xl bg-muted" />
        </div>
      </Shell>
    );
  }

  if (isError) {
    return (
      <Shell>
        <div className="flex flex-col items-center gap-4 rounded-xl border border-border p-8 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
            <AlertTriangle className="h-6 w-6 text-amber-600 dark:text-amber-400" />
          </div>
          <h1 className="text-xl font-semibold text-foreground">Couldn't load this request</h1>
          <p className="text-sm text-muted-foreground">
            Something went wrong loading this research request. Please try again.
          </p>
          <Button type="button" variant="outline" onClick={() => void refetch()}>
            Try again
          </Button>
        </div>
      </Shell>
    );
  }

  // Unknown / expired token — collapsed to a single generic state so the page
  // never reveals whether a token ever existed.
  if (!data) {
    return (
      <Shell>
        <div className="flex flex-col items-center gap-4 rounded-xl border border-border p-8 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
            <AlertTriangle className="h-6 w-6 text-amber-600 dark:text-amber-400" />
          </div>
          <h1 className="text-xl font-semibold text-foreground">This link is no longer valid</h1>
          <p className="text-sm text-muted-foreground">
            This research request link is no longer available. If you still need to respond, please
            ask whoever sent it for an updated link.
          </p>
        </div>
      </Shell>
    );
  }

  const expiresLabel = formatDate(data.expiresAt, "local", "MMM D, YYYY");

  return (
    <Shell>
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          You've received a research request
          {data.orgName ? (
            <>
              {" "}
              for <span className="text-brand-emphasis dark:text-brand-subtle">{data.orgName}</span>
            </>
          ) : null}
        </h1>
        <p className="text-sm text-muted-foreground">
          Your answers help complete this research. You can answer as many questions as you like.
        </p>
      </header>

      {data.alreadySubmitted ? (
        <div className="flex flex-col items-center gap-4 rounded-xl border border-border bg-card p-8 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand/10">
            <CheckCircle2 className="h-6 w-6 text-brand-emphasis dark:text-brand-subtle" />
          </div>
          <h2 className="text-lg font-semibold text-foreground">
            Thanks — your answers were received
          </h2>
          <p className="text-sm text-muted-foreground">
            We've already recorded a response for this request. There's nothing more you need to do.
          </p>
        </div>
      ) : (
        <DiligenceResponseForm token={token} questions={data.questions} />
      )}

      {expiresLabel ? (
        <p className="text-center text-xs text-muted-foreground">
          This link expires on {expiresLabel}.
        </p>
      ) : null}
    </Shell>
  );
}

/** Self-contained, centered container — rendered outside the advisor chrome. */
function Shell({ children }: { children: React.ReactNode }) {
  return <main className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-12">{children}</main>;
}
