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
 * The banner over a page the model proposed and nobody has approved yet.
 *
 * It says what has NOT happened — nothing saved, nothing published, figures
 * unverified — because that is the state a reviewer needs to hold in mind.
 * It disappears when they publish, which is the moment a person takes
 * responsibility for the page carrying their community's name.
 */
export function UnverifiedDraftNotice({ warnings }: { warnings: readonly string[] }) {
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-warning-500 bg-warning-50 p-4">
      <p className="text-sm font-medium text-warning-900">
        Proposed by AI — not saved, not published, figures not yet verified.
      </p>
      <p className="text-sm text-warning-900">
        The numbers below are real and come from your community&apos;s data. Check that each section
        shows what you meant before you save or publish it.
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
