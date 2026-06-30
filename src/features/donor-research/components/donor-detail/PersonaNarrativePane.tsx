"use client";

interface PersonaNarrativePaneProps {
  narrative: string | null;
  /**
   * Set to a non-empty string immediately after a successful refine so the
   * polite live region announces it (e.g. "Persona narrative updated"). Kept
   * separate from the visible narrative so screen readers get a stable,
   * intentional message rather than re-reading the whole summary.
   */
  announcement?: string;
}

const EMPTY_PLACEHOLDER = "No narrative yet. Paste notes above and click Refine to generate one.";

/**
 * Read-only narrative summary produced by the refine step. Renders an
 * explicit empty-state placeholder when absent, and exposes a polite
 * `aria-live` region for post-refine announcements.
 */
export function PersonaNarrativePane({ narrative, announcement }: PersonaNarrativePaneProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-medium">Narrative</span>
      <div className="rounded-md border border-border bg-muted/10 p-3 text-sm">
        {narrative ? (
          <p className="whitespace-pre-wrap text-foreground">{narrative}</p>
        ) : (
          <p className="text-muted-foreground">{EMPTY_PLACEHOLDER}</p>
        )}
      </div>
      <output className="sr-only" aria-live="polite">
        {announcement ?? ""}
      </output>
    </div>
  );
}
