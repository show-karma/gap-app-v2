"use client";

import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  NOTEBOOK_BAR_METRIC_LABELS,
  NOTEBOOK_BAR_SOURCE_LABELS,
  NOTEBOOK_BAR_SOURCES,
  NOTEBOOK_KPI_METRIC_LABELS,
  NOTEBOOK_KPI_METRICS,
  NOTEBOOK_SECTION_DESCRIPTION_MAX,
  NOTEBOOK_SECTION_TITLE_MAX,
  NOTEBOOK_SPEC_MAX_SECTIONS,
  type NotebookBarsSection,
  type NotebookKpisSection,
  type NotebookSection,
  type NotebookSpec,
} from "@/services/notebooks/notebook-spec";
import {
  addSection,
  canAddSection,
  moveSection,
  removeSection,
  setBarSource,
  toggleKpiMetric,
  updateSection,
} from "@/services/notebooks/notebook-spec-draft";

interface Props {
  spec: NotebookSpec;
  onChange: (next: NotebookSpec) => void;
}

/**
 * Compose a page from the closed vocabulary.
 *
 * Every control here is bounded by what the server accepts: the KPI list is
 * the enum, the source list is the enum, and a bar section's metric is derived
 * from its source rather than chosen, because each source expresses exactly
 * one series. An author is never offered a combination that would come back a
 * 400 — but the server still rejects one if it arrives, because this form is a
 * convenience, not the boundary.
 *
 * Order is the render order, so up/down is the whole layout language.
 */
export function SectionComposer({ spec, onChange }: Props) {
  const atLimit = !canAddSection(spec);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-base font-semibold text-foreground">Sections</h2>
        <p className="text-sm text-muted-foreground">
          Sections render top to bottom in this order. Two bar sections in a row sit side by side.
        </p>
      </div>

      {spec.sections.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          This page has no sections yet. Add one below.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {spec.sections.map((section, index) => (
            <li
              // Sections are an ordered list with no stable id of their own;
              // the position IS the identity here, and reordering re-renders
              // both affected rows either way.
              key={`${index}-${section.type}`}
              className="flex flex-col gap-3 rounded-2xl border border-border bg-background p-4"
            >
              <div className="flex flex-row items-center justify-between gap-3">
                <span className="text-sm font-semibold text-foreground">
                  {sectionLabel(section)}
                </span>
                <div className="flex flex-row items-center gap-1">
                  <Button
                    variant="secondary"
                    size="sm"
                    aria-label={`Move section ${index + 1} up`}
                    disabled={index === 0}
                    onClick={() => onChange(moveSection(spec, index, -1))}
                  >
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    aria-label={`Move section ${index + 1} down`}
                    disabled={index === spec.sections.length - 1}
                    onClick={() => onChange(moveSection(spec, index, 1))}
                  >
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    aria-label={`Remove section ${index + 1}`}
                    onClick={() => onChange(removeSection(spec, index))}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {section.type === "kpis" ? (
                <KpiFields
                  section={section}
                  onToggle={(metric) => onChange(toggleKpiMetric(spec, index, metric))}
                />
              ) : null}

              {section.type === "bars" ? (
                <BarFields
                  section={section}
                  onSourceChange={(source) => onChange(setBarSource(spec, index, source))}
                  onFieldChange={(next) => onChange(updateSection(spec, index, next))}
                />
              ) : null}

              {section.type === "applications" ? (
                <p className="text-sm text-muted-foreground">
                  Approved, under review and not approved counts. Nothing to configure.
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-row flex-wrap items-center gap-2">
        <span className="text-sm text-muted-foreground">Add a section:</span>
        {(["kpis", "bars", "applications"] as const).map((type) => (
          <Button
            key={type}
            variant="secondary"
            size="sm"
            disabled={atLimit}
            onClick={() => onChange(addSection(spec, type))}
          >
            <Plus className="h-4 w-4" />
            {SECTION_TYPE_LABELS[type]}
          </Button>
        ))}
      </div>
      {atLimit ? (
        <p className="text-xs text-muted-foreground">
          A page can hold up to {NOTEBOOK_SPEC_MAX_SECTIONS} sections.
        </p>
      ) : null}
    </div>
  );
}

const SECTION_TYPE_LABELS: Record<NotebookSection["type"], string> = {
  kpis: "KPI tiles",
  bars: "Bar chart",
  applications: "Applications",
};

function sectionLabel(section: NotebookSection): string {
  if (section.type === "bars") {
    return `Bar chart — ${NOTEBOOK_BAR_SOURCE_LABELS[section.source]}`;
  }
  return SECTION_TYPE_LABELS[section.type];
}

function KpiFields({
  section,
  onToggle,
}: {
  section: NotebookKpisSection;
  onToggle: (metric: (typeof NOTEBOOK_KPI_METRICS)[number]) => void;
}) {
  const onlyOne = section.metrics.length === 1;

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="text-sm text-muted-foreground">
        Which figures to show, in the order you tick them.
      </legend>
      <div className="flex flex-row flex-wrap gap-4">
        {NOTEBOOK_KPI_METRICS.map((metric) => {
          const checked = section.metrics.includes(metric);
          return (
            <label
              key={metric}
              className="flex flex-row items-center gap-2 text-sm text-foreground"
            >
              <Checkbox
                checked={checked}
                // The last remaining metric cannot be unticked: an empty KPI
                // row renders nothing and the server rejects it, so this keeps
                // the author in a state that can actually be saved.
                disabled={checked && onlyOne}
                onCheckedChange={() => onToggle(metric)}
              />
              {NOTEBOOK_KPI_METRIC_LABELS[metric]}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

function BarFields({
  section,
  onSourceChange,
  onFieldChange,
}: {
  section: NotebookBarsSection;
  onSourceChange: (source: (typeof NOTEBOOK_BAR_SOURCES)[number]) => void;
  onFieldChange: (next: NotebookBarsSection) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-foreground">Data</span>
        <Select
          value={section.source}
          onValueChange={(value) => onSourceChange(value as (typeof NOTEBOOK_BAR_SOURCES)[number])}
        >
          <SelectTrigger aria-label="Data">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {NOTEBOOK_BAR_SOURCES.map((source) => (
              <SelectItem key={source} value={source}>
                {NOTEBOOK_BAR_SOURCE_LABELS[source]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {/* The metric is derived, not chosen: each source expresses exactly
            one series, so offering it as a second dropdown would imply a
            choice that does not exist. Stated so the author knows what they
            will get. */}
        <span className="text-xs text-muted-foreground">
          Shows: {NOTEBOOK_BAR_METRIC_LABELS[section.metric]}
        </span>
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-foreground">Heading</span>
        <Input
          type="text"
          value={section.title}
          maxLength={NOTEBOOK_SECTION_TITLE_MAX}
          onChange={(event) => onFieldChange({ ...section, title: event.target.value })}
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-foreground">
          Description <span className="text-muted-foreground">(optional)</span>
        </span>
        <Textarea
          value={section.description ?? ""}
          maxLength={NOTEBOOK_SECTION_DESCRIPTION_MAX}
          onChange={(event) =>
            onFieldChange({
              ...section,
              // An emptied field means "no description", not an empty one —
              // the schema rejects a blank string but accepts its absence.
              description: event.target.value.trim() === "" ? undefined : event.target.value,
            })
          }
        />
      </label>
    </div>
  );
}
