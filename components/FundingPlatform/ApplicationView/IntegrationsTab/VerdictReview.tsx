"use client";

import { CheckIcon, ChevronDownIcon } from "@heroicons/react/20/solid";
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
import type { SimocracyMilestoneVerdictRow } from "@/services/fundingApplicationIntegrations.service";
import { cn } from "@/utilities/tailwind";
import { SimSectionHeading } from "./SimIdentity";
import { VerdictCard, type VerdictFeedbackContext } from "./VerdictCard";

type Filter = "all" | "pending" | "published" | "dismissed";

// Dismissal exists on the API but is off the desk for now.
const FILTERS: { key: Filter; label: string; dot?: string }[] = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending human review", dot: "bg-amber-500" },
  { key: "published", label: "Published", dot: "bg-green-500" },
];

type Bucket = Exclude<Filter, "all">;

// A pair holds one slot on Simocracy, so it can sit in two buckets at once:
// a version live (published) while a newer one waits (pending).
function buckets(verdict: SimocracyMilestoneVerdictRow): Bucket[] {
  const out: Bucket[] = [];
  if (verdict.publishedRevision !== null) out.push("published");
  if (verdict.status === "dismissed") out.push("dismissed");
  else if (verdict.status !== "published") out.push("pending");
  return out;
}

function inBucket(verdict: SimocracyMilestoneVerdictRow, filter: Filter): boolean {
  return filter === "all" || buckets(verdict).includes(filter);
}

interface Counts {
  pending: number;
  published: number;
  dismissed: number;
}

function count(verdicts: SimocracyMilestoneVerdictRow[]): Counts {
  const counts: Counts = { pending: 0, published: 0, dismissed: 0 };
  for (const verdict of verdicts) for (const key of buckets(verdict)) counts[key] += 1;
  return counts;
}

interface MilestoneGroup {
  milestoneUid: string;
  title: string;
  verdicts: SimocracyMilestoneVerdictRow[];
  counts: Counts;
}

// Milestones in the order the reviewer meets them on the application: the
// ones still waiting first, then by title. Sims alphabetical inside.
function groupByMilestone(verdicts: SimocracyMilestoneVerdictRow[]): MilestoneGroup[] {
  const groups = new Map<string, MilestoneGroup>();
  for (const verdict of verdicts) {
    const key = verdict.milestoneUid.toLowerCase();
    const group = groups.get(key) ?? {
      milestoneUid: verdict.milestoneUid,
      title: verdict.milestoneTitle ?? "Untitled milestone",
      verdicts: [],
      counts: { pending: 0, published: 0, dismissed: 0 },
    };
    group.verdicts.push(verdict);
    groups.set(key, group);
  }
  const list = [...groups.values()].map((group) => ({
    ...group,
    verdicts: [...group.verdicts].sort((a, b) => a.simName.localeCompare(b.simName)),
    counts: count(group.verdicts),
  }));
  return list.sort(
    (a, b) =>
      Number(b.counts.pending > 0) - Number(a.counts.pending > 0) || a.title.localeCompare(b.title)
  );
}

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

interface MilestoneOption {
  uid: string;
  title: string;
  counts: Counts;
  total: number;
}

const ALL_MILESTONES = "All milestones";

// Desktop: a rail beside the cards, the way the Action Items queue sits
// beside its detail. One row per milestone with its state tally.
const MilestoneRail: FC<{
  options: MilestoneOption[];
  value: string | null;
  onChange: (uid: string | null) => void;
}> = ({ options, value, onChange }) => (
  <nav aria-label="Milestones" className="space-y-0.5">
    <RailRow
      active={value === null}
      title={ALL_MILESTONES}
      trailing={
        <span className="tabular-nums text-xs text-gray-500 dark:text-gray-400">
          {options.reduce((sum, option) => sum + option.total, 0)}
        </span>
      }
      onClick={() => onChange(null)}
    />
    {options.map((option) => (
      <RailRow
        key={option.uid}
        active={value === option.uid}
        title={option.title}
        trailing={<CountSummary counts={option.counts} compact />}
        onClick={() => onChange(option.uid)}
      />
    ))}
  </nav>
);

const RailRow: FC<{
  active: boolean;
  title: string;
  trailing: ReactNode;
  onClick: () => void;
}> = ({ active, title, trailing, onClick }) => (
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
    <span className="min-w-0 truncate text-sm">{title}</span>
    <span className="shrink-0">{trailing}</span>
  </Button>
);

// Below xl the rail folds into the same searchable picker the inbox uses.
const MilestonePicker: FC<{
  options: MilestoneOption[];
  value: string | null;
  onChange: (uid: string | null) => void;
}> = ({ options, value, onChange }) => {
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.uid === value);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant={selected ? "secondary" : "outline"}
          size="chip"
          aria-pressed={!!selected}
          aria-label={selected ? `Milestone: ${selected.title}` : "Filter by milestone"}
          className={cn(
            "max-w-[min(320px,calc(100vw-2rem))] font-medium",
            selected && "border border-primary-500 text-primary-700 dark:text-primary-300"
          )}
        >
          <span className="truncate">{selected ? selected.title : ALL_MILESTONES}</span>
          <ChevronDownIcon className="h-4 w-4 shrink-0 text-gray-400" aria-hidden="true" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 p-0">
        <Command>
          <CommandInput placeholder="Search milestones" />
          <CommandList>
            <CommandEmpty>No milestone matches.</CommandEmpty>
            <CommandGroup>
              <CommandItem
                value={ALL_MILESTONES}
                onSelect={() => {
                  onChange(null);
                  setOpen(false);
                }}
              >
                <CheckIcon
                  className={cn("mr-2 h-4 w-4", selected ? "opacity-0" : "opacity-100")}
                  aria-hidden="true"
                />
                {ALL_MILESTONES}
              </CommandItem>
              {options.map((option) => (
                <CommandItem
                  key={option.uid}
                  value={`${option.title} ${option.uid}`}
                  onSelect={() => {
                    onChange(option.uid);
                    setOpen(false);
                  }}
                >
                  <CheckIcon
                    className={cn(
                      "mr-2 h-4 w-4",
                      option.uid === value ? "opacity-100" : "opacity-0"
                    )}
                    aria-hidden="true"
                  />
                  <span className="min-w-0 flex-1 truncate">{option.title}</span>
                  <CountSummary counts={option.counts} compact />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

interface VerdictReviewProps {
  referenceNumber: string;
  verdicts: SimocracyMilestoneVerdictRow[];
  avatars: Map<string, string | null>;
  feedback?: VerdictFeedbackContext;
  /** Set when the surface is already scoped to one milestone. */
  milestoneUid?: string;
}

// The reviewer's desk: every Sim verdict of the application, one card per
// milestone × Sim with its versions. A milestone rail picks what is on the
// desk; the state filter narrows it further.
export const VerdictReview: FC<VerdictReviewProps> = ({
  referenceNumber,
  verdicts,
  avatars,
  feedback,
  milestoneUid,
}) => {
  const [picked, setPicked] = useState<string | null>(null);
  const selectedUid = milestoneUid ?? picked;
  const options = useMemo<MilestoneOption[]>(
    () =>
      groupByMilestone(verdicts).map((group) => ({
        uid: group.milestoneUid,
        title: group.title,
        counts: group.counts,
        total: group.verdicts.length,
      })),
    [verdicts]
  );
  const scoped = useMemo(
    () =>
      selectedUid
        ? verdicts.filter((v) => v.milestoneUid.toLowerCase() === selectedUid.toLowerCase())
        : verdicts,
    [verdicts, selectedUid]
  );
  const counts = useMemo(() => ({ ...count(scoped), all: scoped.length }), [scoped]);
  const [filter, setFilter] = useState<Filter>(() => (counts.pending > 0 ? "pending" : "all"));
  const groups = useMemo(() => {
    const visible = scoped.filter((v) => inBucket(v, filter));
    return groupByMilestone(visible);
  }, [scoped, filter]);

  if (verdicts.length === 0) {
    return (
      <div className="space-y-2">
        {!milestoneUid && <SimSectionHeading title="Sim evaluations" />}
        <p className="text-sm text-gray-500 dark:text-gray-400">{EMPTY.all}</p>
      </div>
    );
  }

  const cards = (group: MilestoneGroup) =>
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
  const flat = !!selectedUid;

  const desk = (
    <div className="min-w-0 space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        {showRail && (
          <div className="xl:hidden">
            <MilestonePicker options={options} value={picked} onChange={setPicked} />
          </div>
        )}
        <FilterChips value={filter} counts={counts} onChange={setFilter} />
      </div>

      {groups.length === 0 && (
        <p className="text-sm text-gray-500 dark:text-gray-400">{EMPTY[filter]}</p>
      )}

      {flat
        ? groups.map((group) => (
            <div key={group.milestoneUid} className="space-y-3">
              {!milestoneUid && (
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                    {group.title}
                  </h4>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {group.verdicts.length} {pluralize("Sim", group.verdicts.length)}
                  </span>
                </div>
              )}
              {cards(group)}
            </div>
          ))
        : groups.map((group) => (
            <details key={group.milestoneUid} open className="group">
              <summary className="flex cursor-pointer list-none flex-wrap items-baseline gap-x-3 gap-y-1 rounded py-1 focus-visible:outline-2 focus-visible:outline-offset-2 [&::-webkit-details-marker]:hidden">
                <span
                  aria-hidden="true"
                  className="text-gray-400 transition-transform duration-150 group-open:rotate-90"
                >
                  ▸
                </span>
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                  {group.title}
                </h4>
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
      {!milestoneUid && <SimSectionHeading title="Sim evaluations" />}
      {showRail ? (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(220px,280px)_minmax(0,1fr)]">
          <aside className="hidden min-w-0 xl:sticky xl:top-4 xl:block xl:max-h-[calc(100vh-2rem)] xl:self-start xl:overflow-y-auto">
            <MilestoneRail options={options} value={picked} onChange={setPicked} />
          </aside>
          {desk}
        </div>
      ) : (
        desk
      )}
    </section>
  );
};
