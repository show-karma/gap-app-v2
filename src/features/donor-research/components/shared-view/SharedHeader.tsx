interface SharedHeaderProps {
  displayName: string | null;
  introText: string | null;
  reportFinalizedAt: string | null;
}

/**
 * Donor-facing header (U14). The advisor's `shareDisplayName` is the
 * only identity element rendered — the backend strips the real
 * `advisor.id` / `donorHandleId` from the response so this view has no
 * mechanism for leaking them even if a future bug tried.
 */
export function SharedHeader({ displayName, introText, reportFinalizedAt }: SharedHeaderProps) {
  const finalizedAt = reportFinalizedAt ? new Date(reportFinalizedAt) : null;

  return (
    <header className="rounded-xl border border-border bg-card p-6">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">Philanthropy research</p>
      <h1 className="mt-1 text-2xl font-semibold">
        Prepared for you by {displayName ?? "your advisor"}
        {finalizedAt ? (
          <span className="ml-1 text-base font-normal text-muted-foreground">
            on {finalizedAt.toLocaleDateString()}
          </span>
        ) : null}
      </h1>
      <p className="mt-3 text-sm">
        {introText ??
          "Your advisor researched a set of organizations matching your interests. The top picks are recommended based on freshness of impact data, alignment with your interests, and compliance verification."}
      </p>
    </header>
  );
}
