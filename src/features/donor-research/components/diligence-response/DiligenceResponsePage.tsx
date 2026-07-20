"use client";

import { KarmaLogo } from "@/components/Icons/Karma";
import { EmptyState, ErrorState } from "@/components/Pages/Dashboard/v3/primitives";
import { useDiligenceResponseContext } from "@/hooks/useDiligence";
import { TokenPageShell } from "@/src/features/donor-research/components/common/TokenPageShell";
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
          <div className="h-7 w-2/3 animate-pulse rounded-sf-tile bg-sf-skeleton" />
          <div className="h-4 w-1/2 animate-pulse rounded-sf-tile bg-sf-skeleton" />
          <div className="mt-4 h-32 animate-pulse rounded-sf-tile bg-sf-skeleton" />
          <div className="h-32 animate-pulse rounded-sf-tile bg-sf-skeleton" />
        </div>
      </Shell>
    );
  }

  if (isError) {
    return (
      <Shell>
        <ErrorState message="Couldn't load this request" onRetry={() => void refetch()} />
      </Shell>
    );
  }

  // Unknown / expired token — collapsed to a single generic state so the page
  // never reveals whether a token ever existed.
  if (!data) {
    return (
      <Shell>
        {/* EmptyState's title is an h3 (it's reused inside sectioned pages
         * that supply their own h1/h2) — this route has no other document
         * heading, so give it one here, matching the visible copy. */}
        <h1 className="sr-only">This link is no longer valid</h1>
        <EmptyState
          icon="alert"
          title="This link is no longer valid"
          body="This research request link is no longer available. If you still need to respond, please ask whoever sent it for an updated link."
        />
      </Shell>
    );
  }

  const expiresLabel = formatDate(data.expiresAt, "local", "MMM D, YYYY");

  return (
    <Shell>
      <header className="flex flex-col gap-1.5">
        <h1 className="text-xl font-semibold tracking-[-0.01em] text-sf-heading sm:text-2xl">
          You've received a research request
          {data.orgName ? (
            <>
              {" "}
              for <span className="text-brand-emphasis dark:text-brand-subtle">{data.orgName}</span>
            </>
          ) : null}
        </h1>
        <p className="text-[13.5px] leading-[1.55] text-sf-muted">
          A donor advisor is researching organizations like yours. Your answers help complete this
          research. You can answer as many questions as you like.
        </p>
      </header>

      {data.alreadySubmitted ? (
        <EmptyState
          brand
          icon="check"
          title="Thanks — your answers were received"
          body="We've already recorded a response for this request. There's nothing more you need to do."
        />
      ) : (
        <DiligenceResponseForm token={token} questions={data.questions} />
      )}

      {expiresLabel ? (
        <p className="text-center text-[12px] text-sf-muted">
          This link expires on {expiresLabel}.
        </p>
      ) : null}
    </Shell>
  );
}

/**
 * Self-contained, centered single card (spec 2.3) — rendered outside the
 * advisor chrome. `TokenPageShell` scopes the `--sf-*` tokens the card and
 * its states below read; the Karma mark sits above the card, matching the
 * donor share view's top bar treatment.
 */
function Shell({ children }: { children: React.ReactNode }) {
  return (
    <TokenPageShell maxWidthClassName="max-w-2xl">
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-2">
          <KarmaLogo className="h-6 w-6 text-sf-ink" />
          <span className="text-[13.5px] font-[650] tracking-[-0.01em] text-sf-heading">Karma</span>
        </div>
        <div className="rounded-sf-card border border-sf-line bg-sf-card p-6 sm:p-8">
          <div className="flex flex-col gap-6">{children}</div>
        </div>
      </div>
    </TokenPageShell>
  );
}
