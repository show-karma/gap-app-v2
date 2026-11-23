"use client";

import { CheckIcon, ChevronDownIcon, ChevronRightIcon } from "@heroicons/react/20/solid";
import pluralize from "pluralize";
import { type FC, type ReactNode, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { SimocracyVerdictRow } from "@/services/fundingApplicationIntegrations.service";
import { cn } from "@/utilities/tailwind";
import { SimSectionHeading } from "./SimIdentity";
import { VerdictCard, type VerdictFeedbackContext } from "./VerdictCard";
import { SubjectIcon, SubjectTitle } from "./VerdictSubject";
import {
  countVerdicts,
  groupVerdictsBySubject,
  inVerdictBucket,
  milestoneSubjectKey,
  type VerdictCounts,
  type VerdictFilter,
  type VerdictSubjectGroup,
  verdictSubjectKey,
} from "./verdictSubjects";

type Filter = VerdictFilter;
type Counts = VerdictCounts;

// Dismissal exists on the API but is off the desk for now.
const FILTERS: { key: Filter; label: string; dot?: string }[] = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending human review", dot: "bg-amber-500" },
  { key: "published", label: "Published", dot: "bg-green-500" },
];

const DOT: Record<keyof Counts, string> = {
  pending: "bg-amber-500",
  published: "bg-green-500",
  dismissed: "bg-gray-400",
};

const CountSummary: FC<{ counts: Counts; compact?: boolean }> = ({ counts, compact = false }) => {
  const parts = (Object.keys(DOT) as (keyof Counts)[]).filter(
    (key) => counts[key] > 0 && key !== "dismissed"
  );
  return (
    <span className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs font-normal tabular-nums text-gray-500 dark:text-gray-400">
      {parts.map((key) => (
        <span
          key={key}
          className="inline-flex items-center gap-1.5"
          title={compact ? `${counts[key]} ${key}` : undefined}
        >
          <span aria-hidden="true" className={cn("h-1.5 w-1.5 rounded-full", DOT[key])} />
          {counts[key]}
          {!compact && ` ${key}`}
        </span>
      ))}
    </span>
  );
};

const FilterChips: FC<{
  value: Filter;
  counts: Counts & { all: number };
  onChange: (next: Filter) => void;
}> = ({ value, counts, onChange }) => (
  <fieldset
    aria-label="Filter Sim verdicts"
    className="inline-flex items-center gap-1 rounded-lg border-0 bg-gray-100 p-1 dark:bg-zinc-800"
  >
    {FILTERS.map((filter) => {
      const active = filter.key === value;
      return (
        <Button
          key={filter.key}
          type="button"
          variant="ghost"
          size="chip"
          aria-pressed={active}
          aria-label={`${filter.label} (${counts[filter.key]})`}
          onClick={() => onChange(filter.key)}
          className={cn(
            "gap-1.5 font-medium",
            active
              ? "bg-white text-gray-950 shadow-sm hover:bg-white dark:bg-zinc-900 dark:text-white dark:hover:bg-zinc-900"
              : "text-gray-600 hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-zinc-700"
          )}
        >
          {filter.dot && (
            <span aria-hidden="true" className={cn("h-1.5 w-1.5 rounded-full", filter.dot)} />
          )}
          {filter.label}
          <span className="tabular-nums text-gray-400 dark:text-gray-500">
            {counts[filter.key]}
          </span>
        </Button>
      );
    })}
  </fieldset>
);

const EMPTY: Record<Filter, string> = {
  all: "No Sim verdicts on this application yet.",
  pending: "Nothing waiting for review.",
  published: "No Sim verdict has been published yet.",
  dismissed: "No dismissed Sim verdicts.",
};

interface SubjectOption {
  key: string;
  subject: VerdictSubjectGroup["subject"];
  title: string;
  counts: Counts;
  total: number;
}

const ALL_SUBJECTS = "All Sim verdicts";

// Desktop: a rail beside the cards, the way the Action Items queue sits
// beside its detail. The application sits on top, then one row per milestone
// under its own label, each with its state tally.
const SubjectRail: FC<{
  options: SubjectOption[];
  value: string | null;
  onChange: (key: string | null) => void;
}> = ({ options, value, onChange }) => {
  const application = options.find((option) => option.subject === "application");
  const milestones = options.filter((option) => option.subject === "milestone");
  return (
    <nav aria-label="Sim verdict subjects" className="space-y-0.5">
      <RailRow
        active={value === null}
        title={ALL_SUBJECTS}
        trailing={
          <span className="tabular-nums text-xs text-gray-500 dark:text-gray-400">
            {options.reduce((sum, option) => sum + option.total, 0)}
          </span>
        }
        onClick={() => onChange(null)}
      />
      {application && (
        <RailRow
          active={value === application.key}
          icon={<SubjectIcon kind="application" />}
          title="Application"
          trailing={<CountSummary counts={application.counts} compact />}
          onClick={() => onChange(application.key)}
        />
      )}
      {milestones.length > 0 && (
        <div className="pt-3">
          <p
            id="sim-verdict-rail-milestones"
            className="flex items-center gap-2 px-3 pb-1 text-xs font-medium text-gray-500 dark:text-gray-400"
          >
            <SubjectIcon kind="milestone" className="h-3.5 w-3.5" />
            Milestones
          </p>
          <ul aria-labelledby="sim-verdict-rail-milestones" className="space-y-0.5">
            {milestones.map((option) => (
              <li key={option.key}>
                <RailRow
                  active={value === option.key}
                  title={option.title}
                  trailing={<CountSummary counts={option.counts} compact />}
                  onClick={() => onChange(option.key)}
                />
              </li>
            ))}
          </ul>
        </div>
      )}
    </nav>
  );
};

const RailRow: FC<{
  active: boolean;
  title: string;
  icon?: ReactNode;
  trailing: ReactNode;
  onClick: () => void;
}> = ({ active, title, icon, trailing, onClick }) => (
  <Button
    type="button"
    variant="ghost"
    aria-pressed={active}
    aria-current={active ? "true" : undefined}
    onClick={onClick}
    className={cn(
      "h-auto w-full justify-between gap-3 rounded-md px-3 py-2 text-left font-medium",
      active
        ? "bg-gray-100 text-gray-950 hover:bg-gray-100 dark:bg-zinc-800 dark:text-white dark:hover:bg-zinc-800"
        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-zinc-800/60 dark:hover:text-gray-100"
    )}
  >
    <span className="flex min-w-0 items-center gap-2">
      {icon}
      <span className="truncate text-sm" title={title}>
        {title}
      </span>
    </span>
    <span className="shrink-0">{trailing}</span>
  </Button>
);

// Below xl the rail folds into the same searchable picker the inbox uses.
const SubjectPicker: FC<{
  options: SubjectOption[];
  value: string | null;
  onChange: (key: string | null) => void;
}> = ({ options, value, onChange }) => {
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.key === value);
  const application = options.find((option) => option.subject === "application");
  const milestones = options.filter((option) => option.subject === "milestone");
  const pick = (key: string | null) => {
    onChange(key);
    setOpen(false);
  };
  const check = (active: boolean) => (
    <CheckIcon
      className={cn("mr-2 h-4 w-4 shrink-0", active ? "opacity-100" : "opacity-0")}
      aria-hidden="true"
    />
  );
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant={selected ? "secondary" : "outline"}
          size="chip"
          aria-pressed={!!selected}
          aria-label={
            selected
              ? selected.subject === "application"
                ? "Showing the application's Sim verdicts"
                : `Showing milestone: ${selected.title}`
              : "Filter by application or milestone"
          }
          className={cn(
            "max-w-[min(320px,calc(100vw-2rem))] font-medium",
            selected && "border border-primary-500 text-primary-700 dark:text-primary-300"
          )}
        >
          {selected && <SubjectIcon kind={selected.subject} className="text-current" />}
          <span className="truncate">{selected ? selected.title : ALL_SUBJECTS}</span>
          <ChevronDownIcon className="h-4 w-4 shrink-0 text-gray-400" aria-hidden="true" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 p-0">
        <Command>
          <CommandInput placeholder="Search application or milestones" />
          <CommandList>
            <CommandEmpty>Nothing matches.</CommandEmpty>
            <CommandGroup>
              <CommandItem value={ALL_SUBJECTS} onSelect={() => pick(null)}>
                {check(!selected)}
                {ALL_SUBJECTS}
              </CommandItem>
              {application && (
                <CommandItem value="Application" onSelect={() => pick(application.key)}>
                  {check(application.key === value)}
                  <SubjectIcon kind="application" className="mr-2" />
                  <span className="min-w-0 flex-1 truncate">Application</span>
                  <CountSummary counts={application.counts} compact />
                </CommandItem>
              )}
            </CommandGroup>
            {milestones.length > 0 && (
              <CommandGroup heading="Milestones">
                {milestones.map((option) => (
                  <CommandItem
                    key={option.key}
                    value={`${option.title} ${option.key}`}
                    onSelect={() => pick(option.key)}
                  >
                    {check(option.key === value)}
                    <span className="min-w-0 flex-1 truncate">{option.title}</span>
                    <CountSummary counts={option.counts} compact />
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

const GroupHeading: FC<{ group: VerdictSubjectGroup }> = ({ group }) => (
  <h4 className="flex min-w-0 items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
    <SubjectIcon kind={group.subject} />
    <span className="min-w-0">
      <SubjectTitle
        subject={
          group.subject === "application"
            ? { kind: "application" }
            : { kind: "milestone", title: group.title }
        }
      />
    </span>
  </h4>
);

interface VerdictReviewProps {
  referenceNumber: string;
  verdicts: SimocracyVerdictRow[];
  avatars: Map<string, string | null>;
  feedback?: VerdictFeedbackContext;
  /** Set when the surface is already scoped to one milestone. */
  milestoneUid?: string;
}

// The reviewer's desk: every Sim verdict of the application, one card per
// subject × Sim with its versions. The application's own verdicts sit above
// the milestones'; a rail picks what is on the desk and the state filter
// narrows it further.
export const VerdictReview: FC<VerdictReviewProps> = ({
  referenceNumber,
  verdicts,
  avatars,
  feedback,
  milestoneUid,
}) => {
  const [picked, setPicked] = useState<string | null>(null);
  const selectedKey = milestoneUid ? milestoneSubjectKey(milestoneUid) : picked;
  const options = useMemo<SubjectOption[]>(
    () =>
      groupVerdictsBySubject(verdicts).map((group) => ({
        key: group.key,
        subject: group.subject,
        title: group.title,
        counts: group.counts,
        total: group.verdicts.length,
      })),
    [verdicts]
  );
  const scoped = useMemo(
    () =>
      selectedKey
        ? verdicts.filter((verdict) => verdictSubjectKey(verdict) === selectedKey)
        : verdicts,
    [verdicts, selectedKey]
  );
  const counts = useMemo(() => ({ ...countVerdicts(scoped), all: scoped.length }), [scoped]);
  const [filter, setFilter] = useState<Filter>(() => (counts.pending > 0 ? "pending" : "all"));
  const groups = useMemo(
    () => groupVerdictsBySubject(scoped.filter((verdict) => inVerdictBucket(verdict, filter))),
    [scoped, filter]
  );

  if (verdicts.length === 0) {
    return (
      <div className="space-y-2">
        {!milestoneUid && <SimSectionHeading title="Sim verdicts" />}
        <p className="text-sm text-gray-500 dark:text-gray-400">{EMPTY.all}</p>
      </div>
    );
  }

  const cards = (group: VerdictSubjectGroup) =>
    group.verdicts.map((verdict) => (
      <VerdictCard
        key={`${verdict.verdictId}-${filter}`}
        verdict={verdict}
        openOn={filter === "published" ? (verdict.publishedRevision ?? undefined) : undefined}
        avatar={avatars.get(verdict.simUri)}
        referenceNumber={referenceNumber}
        feedback={feedback}
      />
    ));

  const showRail = !milestoneUid && options.length > 1;
  const flat = !!selectedKey;

  const desk = (
    <div className="min-w-0 space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        {showRail && (
          <div className="xl:hidden">
            <SubjectPicker options={options} value={picked} onChange={setPicked} />
          </div>
        )}
        <FilterChips value={filter} counts={counts} onChange={setFilter} />
      </div>

      {groups.length === 0 && (
        <p className="text-sm text-gray-500 dark:text-gray-400">{EMPTY[filter]}</p>
      )}

      {flat
        ? groups.map((group) => (
            <div key={group.key} className="space-y-3">
              {!milestoneUid && (
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <GroupHeading group={group} />
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {group.verdicts.length} {pluralize("Sim", group.verdicts.length)}
                  </span>
                </div>
              )}
              {cards(group)}
            </div>
          ))
        : groups.map((group) => (
            <details key={group.key} open className="group">
              <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-3 gap-y-1 rounded py-1 focus-visible:outline-2 focus-visible:outline-offset-2 [&::-webkit-details-marker]:hidden">
                <ChevronRightIcon
                  aria-hidden="true"
                  className="h-4 w-4 shrink-0 text-gray-400 transition-transform duration-150 group-open:rotate-90 motion-reduce:transition-none"
                />
                <GroupHeading group={group} />
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {group.verdicts.length} {pluralize("Sim", group.verdicts.length)}
                </span>
                <CountSummary counts={group.counts} />
              </summary>
              <div className="mt-2 space-y-3">{cards(group)}</div>
            </details>
          ))}
    </div>
  );

  return (
    <section className="space-y-4" aria-label="Sim verdicts">
      {!milestoneUid && <SimSectionHeading title="Sim verdicts" />}
      {showRail ? (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(220px,280px)_minmax(0,1fr)]">
          <aside className="hidden min-w-0 xl:sticky xl:top-4 xl:block xl:max-h-[calc(100vh-2rem)] xl:self-start xl:overflow-y-auto">
            <SubjectRail options={options} value={picked} onChange={setPicked} />
          </aside>
          {desk}
        </div>
      ) : (
        desk
      )}
    </section>
  );
};
