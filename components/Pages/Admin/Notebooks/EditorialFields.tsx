"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  extractNarrativeTokens,
  NOTEBOOK_BREADCRUMB_COUNT_MAX,
  NOTEBOOK_EYEBROW_MAX,
  NOTEBOOK_HEADLINE_MAX,
  NOTEBOOK_KPI_METRIC_LABELS,
  NOTEBOOK_NARRATIVE_BODY_MAX,
  NOTEBOOK_NARRATIVE_TOKENS,
  NOTEBOOK_SECTION_DESCRIPTION_MAX,
  NOTEBOOK_SECTION_TITLE_MAX,
  type NotebookHeaderSection,
  type NotebookHeroSection,
  type NotebookNarrativeSection,
} from "@/services/notebooks/notebook-spec";

/**
 * Composer fields for the editorial sections.
 *
 * Split out of SectionComposer, which was becoming a file you scroll rather
 * than read. Each of these is a form over one section type and nothing else.
 */

export function HeaderFields({
  fieldId,
  section,
  onFieldChange,
}: {
  fieldId: string;
  section: NotebookHeaderSection;
  onFieldChange: (next: NotebookHeaderSection) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <label className="flex flex-col gap-1 text-sm" htmlFor={`${fieldId}-eyebrow`}>
        <span className="font-medium text-foreground">
          Eyebrow <span className="text-muted-foreground">(optional)</span>
        </span>
        <Input
          id={`${fieldId}-eyebrow`}
          type="text"
          value={section.eyebrow ?? ""}
          maxLength={NOTEBOOK_EYEBROW_MAX}
          placeholder="KERNEL - INDEPENDENT MONITORING"
          onChange={(event) =>
            onFieldChange({
              ...section,
              // An emptied field means absent, not empty: the schema rejects a
              // blank string but accepts its absence.
              eyebrow: event.target.value.trim() === "" ? undefined : event.target.value,
            })
          }
        />
      </label>

      <label className="flex flex-col gap-1 text-sm" htmlFor={`${fieldId}-breadcrumbs`}>
        <span className="font-medium text-foreground">
          Breadcrumbs <span className="text-muted-foreground">(optional)</span>
        </span>
        <Input
          id={`${fieldId}-breadcrumbs`}
          type="text"
          value={(section.breadcrumbs ?? []).join(" / ")}
          placeholder="filpgf.io / Kernel / Monitoring"
          onChange={(event) => {
            const crumbs = event.target.value
              .split("/")
              .map((crumb) => crumb.trim())
              .filter((crumb) => crumb.length > 0)
              .slice(0, NOTEBOOK_BREADCRUMB_COUNT_MAX);
            onFieldChange({ ...section, breadcrumbs: crumbs.length > 0 ? crumbs : undefined });
          }}
        />
        {/* Said out loud because a breadcrumb usually IS a link, so an author
            will reasonably expect these to be. */}
        <span className="text-xs text-muted-foreground">
          Separate with a slash. These are labels, not links.
        </span>
      </label>
    </div>
  );
}

export function HeroFields({
  fieldId,
  section,
  onFieldChange,
}: {
  fieldId: string;
  section: NotebookHeroSection;
  onFieldChange: (next: NotebookHeroSection) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <label className="flex flex-col gap-1 text-sm" htmlFor={`${fieldId}-headline`}>
        <span className="font-medium text-foreground">Headline</span>
        <Input
          id={`${fieldId}-headline`}
          type="text"
          value={section.headline}
          maxLength={NOTEBOOK_HEADLINE_MAX}
          placeholder="What is being watched."
          onChange={(event) => onFieldChange({ ...section, headline: event.target.value })}
        />
      </label>

      <label className="flex flex-col gap-1 text-sm" htmlFor={`${fieldId}-subheadline`}>
        <span className="font-medium text-foreground">
          Standfirst <span className="text-muted-foreground">(optional)</span>
        </span>
        <Textarea
          id={`${fieldId}-subheadline`}
          value={section.subheadline ?? ""}
          maxLength={NOTEBOOK_SECTION_DESCRIPTION_MAX}
          onChange={(event) =>
            onFieldChange({
              ...section,
              subheadline: event.target.value.trim() === "" ? undefined : event.target.value,
            })
          }
        />
      </label>
    </div>
  );
}

export function NarrativeFields({
  fieldId,
  section,
  onFieldChange,
}: {
  fieldId: string;
  section: NotebookNarrativeSection;
  onFieldChange: (next: NotebookNarrativeSection) => void;
}) {
  // Surfaced as the author types. The server refuses an unknown token, and
  // learning that here beats learning it from a failed save.
  const known = new Set<string>(NOTEBOOK_NARRATIVE_TOKENS);
  const unknown = Array.from(
    new Set(extractNarrativeTokens(section.body).filter((token) => !known.has(token)))
  );

  const insertToken = (token: string) =>
    onFieldChange({ ...section, body: `${section.body}{{${token}}}` });

  return (
    <div className="flex flex-col gap-3">
      <label className="flex flex-col gap-1 text-sm" htmlFor={`${fieldId}-narrative-title`}>
        <span className="font-medium text-foreground">
          Heading <span className="text-muted-foreground">(optional)</span>
        </span>
        <Input
          id={`${fieldId}-narrative-title`}
          type="text"
          value={section.title ?? ""}
          maxLength={NOTEBOOK_SECTION_TITLE_MAX}
          onChange={(event) =>
            onFieldChange({
              ...section,
              title: event.target.value.trim() === "" ? undefined : event.target.value,
            })
          }
        />
      </label>

      <label className="flex flex-col gap-1 text-sm" htmlFor={`${fieldId}-narrative-body`}>
        <span className="font-medium text-foreground">Text</span>
        <Textarea
          id={`${fieldId}-narrative-body`}
          className="min-h-32"
          value={section.body}
          maxLength={NOTEBOOK_NARRATIVE_BODY_MAX}
          onChange={(event) => onFieldChange({ ...section, body: event.target.value })}
        />
        <span className="text-xs text-muted-foreground">
          Plain text. Insert a live figure below — it shows the same number as the matching KPI
          tile.
        </span>
      </label>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-xs text-muted-foreground">Insert a figure</legend>
        <div className="flex flex-row flex-wrap gap-2">
          {NOTEBOOK_NARRATIVE_TOKENS.map((token) => (
            <Button
              key={token}
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => insertToken(token)}
            >
              {NOTEBOOK_KPI_METRIC_LABELS[token]}
            </Button>
          ))}
        </div>
      </fieldset>

      {unknown.length > 0 ? (
        <p role="alert" className="text-xs text-destructive">
          Unknown {unknown.length === 1 ? "figure" : "figures"}: {unknown.join(", ")}. Saving is
          refused until corrected.
        </p>
      ) : null}
    </div>
  );
}
