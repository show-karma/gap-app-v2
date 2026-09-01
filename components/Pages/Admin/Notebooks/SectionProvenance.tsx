import type {
  NotebookProvenanceEntry,
  NotebookProvenanceKind,
} from "@/services/notebooks/notebook-generation.types";

/**
 * Where a generated section's content came from, shown beside the section.
 *
 * BESIDE THE SECTION, not in a summary paragraph. "Surface the provenance so
 * the reviewer can check" becomes theatre the moment it is a wall of prose at
 * the top of the page: a reviewer checks one section at a time, so the
 * evidence has to be where they are looking.
 *
 * `authored` IS CALLED OUT DIFFERENTLY ON PURPOSE. A metric id is a claim a
 * reviewer verifies by looking at the rendered figure, which our own query
 * layer computed. Model-written prose has nothing behind it to check against —
 * it is the one thing on the page whose only source is the model. Marking it
 * as a distinct kind, in the warning colour, is what stops it being read with
 * the same confidence as a number.
 */

const KIND_LABELS: Readonly<Record<NotebookProvenanceKind, string>> = {
  metric: "Metric",
  kernel: "Kernel",
  funding: "Funding",
  authored: "Written by AI",
};

export function SectionProvenance({ entry }: { entry?: NotebookProvenanceEntry }) {
  if (!entry) return null;

  return (
    <div className="flex flex-col gap-1 rounded-xl border border-border bg-muted/30 p-3">
      <p className="text-xs text-muted-foreground">{entry.summary}</p>
      {entry.sources.length > 0 ? (
        <ul className="flex flex-row flex-wrap gap-2">
          {entry.sources.map((source) => (
            <li
              key={`${source.kind}-${source.id ?? source.label}`}
              className={`rounded-full px-2 py-0.5 text-xs ${
                source.kind === "authored"
                  ? "bg-warning-50 text-warning-900"
                  : "bg-background text-muted-foreground"
              }`}
            >
              {KIND_LABELS[source.kind]}: {source.label}
              {source.id && source.kind !== "authored" ? (
                <span className="ml-1 opacity-70">({source.id})</span>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

/**
 * What is true about a page the model proposed, said in two parts.
 *
 * THE TWO CLAIMS HAVE DIFFERENT LIFETIMES, and bundling them made the weaker
 * one expire the stronger. "Not saved" stops being true the moment an admin
 * saves — but SAVING IS NOT VERIFYING. The point at which a human vouches for
 * figures going live under their community's name is PUBLISH, and until then
 * "nobody has checked these numbers" is still the truth about the page.
 *
 * So the unsaved half lives in the browser and clears on save, while the
 * unverified half is keyed off the row's persisted `source: "ai"` — which the
 * indexer clears to `manual` on publish. That means an AI draft saved today
 * and reopened next week still says so, which is exactly the case the bundled
 * version got wrong.
 */
export function AiDraftNotice({
  unsaved,
  warnings,
}: {
  /** True only for a proposal the admin has not saved yet. */
  unsaved: boolean;
  warnings: readonly string[];
}) {
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-warning-500 bg-warning-50 p-4">
      <p className="text-sm font-medium text-warning-900">
        {unsaved
          ? "Proposed by AI — not saved, not published, figures not yet verified."
          : "Proposed by AI — figures not yet verified."}
      </p>
      <p className="text-sm text-warning-900">
        The numbers below are real and come from your community&apos;s data. Check that each section
        shows what you meant, then publish — publishing is how you vouch for this page.
      </p>
      {warnings.length > 0 ? (
        <ul className="flex list-disc flex-col gap-1 pl-5 text-sm text-warning-900">
          {warnings.map((warning) => (
            <li key={warning}>{warning}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
