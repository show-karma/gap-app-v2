"use client";

import { CalendarIcon } from "@heroicons/react/24/outline";
import type { LucideIcon } from "lucide-react";
import { BadgeCheck, CircleDollarSign, Goal, Rss } from "lucide-react";
import { useCallback, useEffect, useId, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import type { MilestoneStatusFilter } from "@/services/milestone-status-filter.service";
import { MILESTONE_STATUS_OPTIONS } from "@/services/milestone-status-filter.service";
import type { ActivityFilterType, SortOption } from "@/types/v2/project-profile.types";
import { ACTIVITY_FILTER_OPTIONS } from "@/types/v2/project-profile.types";
import { cn } from "@/utilities/tailwind";

// Re-export types for backward compatibility
export type { ActivityFilterType, SortOption } from "@/types/v2/project-profile.types";

interface ActivityFiltersProps {
  activeFilters: ActivityFilterType[];
  onFilterToggle: (filter: ActivityFilterType) => void;
  sortBy?: SortOption;
  onSortChange?: (sort: SortOption) => void;
  counts?: Partial<Record<ActivityFilterType, number>>;
  milestonesCount?: number;
  completedCount?: number;
  milestoneStatusFilter?: MilestoneStatusFilter;
  onMilestoneStatusChange?: (status: MilestoneStatusFilter) => void;
  className?: string;
  /** ISO 8601 start of the date range. Undefined = no lower bound. */
  dateFrom?: string;
  /** ISO 8601 end of the date range. Undefined = no upper bound. */
  dateTo?: string;
  /**
   * Called when the user changes the date range picker.
   * Pass undefined for either argument to clear that bound.
   */
  onDateRangeChange?: (from: string | undefined, to: string | undefined) => void;
  /**
   * Whether to restrict results to items with an AI evaluation.
   */
  hasAIEvaluation?: boolean;
  /** Minimum AI score (integer 0–10). */
  aiScoreMin?: number;
  /** Maximum AI score (integer 0–10). */
  aiScoreMax?: number;
  /**
   * Called when the user changes the AI evaluation filter controls.
   */
  onAIFilterChange?: (filter: {
    hasEvaluation?: boolean;
    scoreMin?: number;
    scoreMax?: number;
  }) => void;
}

// Visible filter types
const VISIBLE_FILTERS: ActivityFilterType[] = ["funding", "milestones", "endorsements", "updates"];

// Icon and color config per filter category (matches Figma designs)
const FILTER_CONFIG: Partial<Record<ActivityFilterType, { icon: LucideIcon; iconClass: string }>> =
  {
    funding: { icon: CircleDollarSign, iconClass: "text-emerald-600 dark:text-emerald-400" },
    milestones: { icon: Goal, iconClass: "text-indigo-600 dark:text-indigo-400" },
    updates: { icon: Rss, iconClass: "text-violet-600 dark:text-violet-400" },
    endorsements: { icon: BadgeCheck, iconClass: "text-pink-500 dark:text-pink-400" },
  };

// ─── Score color helpers (mirrors MilestoneAIEvaluationBadge) ────────────────

function getScoreColorClass(score: number): string {
  if (score >= 8) return "text-green-600 dark:text-green-400";
  if (score >= 5) return "text-yellow-600 dark:text-yellow-400";
  return "text-red-600 dark:text-red-400";
}

function getScoreBgClass(score: number): string {
  if (score >= 8) return "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800";
  if (score >= 5)
    return "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800";
  return "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800";
}

// ─── Date helpers ─────────────────────────────────────────────────────────────

function toISODateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function subtractDays(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  d.setUTCHours(0, 0, 0, 0);
  return toISODateString(d);
}

function formatDateLabel(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${iso}T00:00:00Z`));
}

function buildDateLabel(from: string | undefined, to: string | undefined): string {
  if (!from && !to) return "All time";
  const today = toISODateString(new Date());
  const sevenDaysAgo = subtractDays(7);
  const thirtyDaysAgo = subtractDays(30);
  const ninetyDaysAgo = subtractDays(90);

  if (from === sevenDaysAgo && !to) return "Last 7 days";
  if (from === thirtyDaysAgo && !to) return "Last 30 days";
  if (from === ninetyDaysAgo && !to) return "Last 90 days";

  const toLabel = to ? formatDateLabel(to) : formatDateLabel(today);
  if (from) {
    return `${formatDateLabel(from)} – ${toLabel}`;
  }
  return `Until ${toLabel}`;
}

// ─── Date Range Picker ────────────────────────────────────────────────────────

interface DateRangePickerProps {
  dateFrom?: string;
  dateTo?: string;
  onDateRangeChange?: (from: string | undefined, to: string | undefined) => void;
}

function DateRangePicker({ dateFrom, dateTo, onDateRangeChange }: DateRangePickerProps) {
  const [open, setOpen] = useState(false);
  const [customFrom, setCustomFrom] = useState(dateFrom ?? "");
  const [customTo, setCustomTo] = useState(dateTo ?? "");
  const fromId = useId();
  const toId = useId();

  const label = buildDateLabel(dateFrom, dateTo);
  const isActive = !!(dateFrom || dateTo);

  const applyPreset = useCallback(
    (from: string | undefined) => {
      setCustomFrom(from ?? "");
      setCustomTo("");
      onDateRangeChange?.(from, undefined);
      setOpen(false);
    },
    [onDateRangeChange]
  );

  const applyCustom = useCallback(() => {
    let from: string | undefined = customFrom || undefined;
    let to: string | undefined = customTo || undefined;
    // Swap if from > to
    if (from && to && from > to) {
      [from, to] = [to, from];
      setCustomFrom(from);
      setCustomTo(to);
    }
    onDateRangeChange?.(from, to);
    setOpen(false);
  }, [customFrom, customTo, onDateRangeChange]);

  const clearFilter = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setCustomFrom("");
      setCustomTo("");
      onDateRangeChange?.(undefined, undefined);
    },
    [onDateRangeChange]
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <div className="relative inline-flex">
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label={`Date range filter: ${label}`}
            aria-expanded={open}
            aria-haspopup="dialog"
            className={cn(
              "inline-flex items-center gap-1.5 py-[5px] rounded-full border text-[12px] font-medium transition-colors",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-neutral-500 dark:focus-visible:ring-neutral-400",
              isActive
                ? "pl-2.5 pr-7 border-foreground bg-foreground text-background"
                : "px-2.5 border-border bg-secondary text-foreground hover:bg-secondary/80"
            )}
          >
            <CalendarIcon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span>{label}</span>
          </button>
        </PopoverTrigger>
        {isActive && (
          <button
            type="button"
            aria-label="Clear date filter"
            onClick={clearFilter}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-background hover:opacity-70 cursor-pointer leading-none focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-neutral-400 rounded"
          >
            ×
          </button>
        )}
      </div>

      <PopoverContent
        align="start"
        className="w-72 p-3 space-y-3 bg-white dark:bg-zinc-900 border-border"
      >
        {/* Preset buttons */}
        <div className="flex flex-col gap-1">
          {(
            [
              { label: "Last 7 days", days: 7 },
              { label: "Last 30 days", days: 30 },
              { label: "Last 90 days", days: 90 },
            ] as const
          ).map(({ label: presetLabel, days }) => {
            const from = subtractDays(days);
            const isSelected = dateFrom === from && !dateTo;
            return (
              <button
                key={presetLabel}
                type="button"
                onClick={() => applyPreset(from)}
                aria-pressed={isSelected}
                className={cn(
                  "w-full text-left px-3 py-1.5 rounded text-sm transition-colors",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-neutral-500 dark:focus-visible:ring-neutral-400",
                  isSelected
                    ? "bg-foreground text-background font-medium"
                    : "hover:bg-secondary text-foreground"
                )}
              >
                {presetLabel}
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => applyPreset(undefined)}
            aria-pressed={!dateFrom && !dateTo}
            className={cn(
              "w-full text-left px-3 py-1.5 rounded text-sm transition-colors",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-neutral-500 dark:focus-visible:ring-neutral-400",
              !dateFrom && !dateTo
                ? "bg-foreground text-background font-medium"
                : "hover:bg-secondary text-foreground"
            )}
          >
            All time
          </button>
        </div>

        {/* Divider */}
        <hr className="border-border" />

        {/* Custom range */}
        <fieldset className="space-y-2">
          <legend className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Custom range
          </legend>

          <div className="space-y-1.5">
            <label htmlFor={fromId} className="block text-xs font-medium text-foreground">
              From
            </label>
            <input
              id={fromId}
              type="date"
              value={customFrom}
              max={customTo || undefined}
              onChange={(e) => setCustomFrom(e.target.value)}
              className={cn(
                "w-full rounded-md border border-border bg-background px-2 py-1 text-sm text-foreground",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-neutral-500 dark:focus-visible:ring-neutral-400",
                "dark:bg-zinc-800 dark:border-zinc-700"
              )}
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor={toId} className="block text-xs font-medium text-foreground">
              To
            </label>
            <input
              id={toId}
              type="date"
              value={customTo}
              min={customFrom || undefined}
              onChange={(e) => setCustomTo(e.target.value)}
              className={cn(
                "w-full rounded-md border border-border bg-background px-2 py-1 text-sm text-foreground",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-neutral-500 dark:focus-visible:ring-neutral-400",
                "dark:bg-zinc-800 dark:border-zinc-700"
              )}
            />
          </div>

          <button
            type="button"
            onClick={applyCustom}
            disabled={!customFrom && !customTo}
            className={cn(
              "w-full mt-1 px-3 py-1.5 rounded text-sm font-medium transition-colors",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-neutral-500 dark:focus-visible:ring-neutral-400",
              "bg-foreground text-background hover:opacity-90",
              "disabled:opacity-40 disabled:cursor-not-allowed"
            )}
          >
            Apply
          </button>
        </fieldset>
      </PopoverContent>
    </Popover>
  );
}

// ─── AI Evaluation sub-filter ─────────────────────────────────────────────────

interface AIEvaluationFilterProps {
  hasAIEvaluation?: boolean;
  aiScoreMin?: number;
  aiScoreMax?: number;
  onAIFilterChange?: (filter: {
    hasEvaluation?: boolean;
    scoreMin?: number;
    scoreMax?: number;
  }) => void;
}

const SCORE_MIN = 0;
const SCORE_MAX = 10;

function AIEvaluationFilter({
  hasAIEvaluation,
  aiScoreMin,
  aiScoreMax,
  onAIFilterChange,
}: AIEvaluationFilterProps) {
  const toggleId = useId();

  const isOn = !!(
    hasAIEvaluation ||
    (aiScoreMin !== undefined && aiScoreMin > SCORE_MIN) ||
    (aiScoreMax !== undefined && aiScoreMax < SCORE_MAX)
  );

  const committedMin = aiScoreMin ?? SCORE_MIN;
  const committedMax = aiScoreMax ?? SCORE_MAX;

  // Local draft state drives the slider visually while dragging;
  // committed only on value-commit (pointer/key release via onValueCommit).
  const [draftRange, setDraftRange] = useState<[number, number]>([committedMin, committedMax]);

  useEffect(() => {
    setDraftRange([committedMin, committedMax]);
  }, [committedMin, committedMax]);

  const handleToggle = useCallback(
    (checked: boolean) => {
      if (!checked) {
        onAIFilterChange?.({ hasEvaluation: undefined, scoreMin: undefined, scoreMax: undefined });
      } else {
        onAIFilterChange?.({ hasEvaluation: true, scoreMin: undefined, scoreMax: undefined });
      }
    },
    [onAIFilterChange]
  );

  const commitRange = useCallback(
    (values: number[]) => {
      const [min, max] = values as [number, number];
      const isDefault = min === SCORE_MIN && max === SCORE_MAX;
      if (isDefault) {
        // Range is [0,10] — keep hasEvaluation=true but clear score params
        onAIFilterChange?.({ hasEvaluation: true, scoreMin: undefined, scoreMax: undefined });
      } else {
        onAIFilterChange?.({
          hasEvaluation: undefined,
          scoreMin: min === SCORE_MIN ? undefined : min,
          scoreMax: max === SCORE_MAX ? undefined : max,
        });
      }
    },
    [onAIFilterChange]
  );

  const [draftMin, draftMax] = draftRange;
  const isDefaultRange = draftMin === SCORE_MIN && draftMax === SCORE_MAX;

  return (
    <fieldset className="flex flex-wrap items-center gap-3 border border-border rounded-lg px-3 py-2 bg-secondary/40 dark:bg-zinc-800/40">
      <legend className="text-xs font-semibold text-muted-foreground uppercase tracking-wide shrink-0 px-0.5">
        AI Evaluation
      </legend>

      {/* Toggle: Has AI evaluation */}
      <div className="flex items-center gap-1.5">
        <input
          id={toggleId}
          type="checkbox"
          checked={isOn}
          onChange={(e) => handleToggle(e.target.checked)}
          className={cn(
            "h-4 w-4 rounded border-border text-primary",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-neutral-500 dark:focus-visible:ring-neutral-400",
            "cursor-pointer accent-foreground"
          )}
        />
        <label
          htmlFor={toggleId}
          className="text-xs font-medium text-foreground cursor-pointer whitespace-nowrap select-none"
        >
          Has AI evaluation
        </label>
      </div>

      {/* Range slider: only when toggle is on */}
      {isOn && (
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground whitespace-nowrap select-none">
            Score range
          </span>
          <Slider
            min={SCORE_MIN}
            max={SCORE_MAX}
            step={1}
            value={draftRange}
            onValueChange={(values) => setDraftRange(values as [number, number])}
            onValueCommit={commitRange}
            className="w-32"
            thumbLabels={["Minimum score", "Maximum score"]}
          />
          {isDefaultRange ? (
            <span className="text-xs text-muted-foreground" aria-hidden="true">
              Any
            </span>
          ) : (
            <span className="flex items-center gap-1" aria-hidden="true">
              <span
                className={cn(
                  "inline-flex items-center justify-center rounded-full border px-1.5 py-0.5 text-[11px] font-semibold tabular-nums",
                  getScoreBgClass(draftMin),
                  getScoreColorClass(draftMin)
                )}
              >
                {`\u2265\u00a0${draftMin}`}
              </span>
              <span className="text-xs text-muted-foreground">{"\u2014"}</span>
              <span
                className={cn(
                  "inline-flex items-center justify-center rounded-full border px-1.5 py-0.5 text-[11px] font-semibold tabular-nums",
                  getScoreBgClass(draftMax),
                  getScoreColorClass(draftMax)
                )}
              >
                {`\u2264\u00a0${draftMax}`}
              </span>
            </span>
          )}
        </div>
      )}
    </fieldset>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

/**
 * ActivityFilters provides filtering controls for the activity feed.
 * Includes:
 * - Date range picker (always visible)
 * - Sort dropdown (Newest/Oldest)
 * - Filter pills with icon + label + count chip (Figma design)
 * - Milestone status filter (when milestones active)
 * - AI evaluation filter (when milestones + completed/verified active)
 */
export function ActivityFilters({
  activeFilters,
  onFilterToggle,
  sortBy,
  onSortChange,
  counts = {},
  milestonesCount: _milestonesCount = 0,
  completedCount: _completedCount = 0,
  milestoneStatusFilter,
  onMilestoneStatusChange,
  className,
  dateFrom,
  dateTo,
  onDateRangeChange,
  hasAIEvaluation,
  aiScoreMin,
  aiScoreMax,
  onAIFilterChange,
}: ActivityFiltersProps) {
  const filterOptions = ACTIVITY_FILTER_OPTIONS.filter((option) =>
    VISIBLE_FILTERS.includes(option.value)
  ).sort((a, b) => {
    const aEmpty = !counts[a.value];
    const bEmpty = !counts[b.value];
    if (aEmpty === bEmpty) return 0;
    return aEmpty ? 1 : -1;
  });

  const totalCount = Object.values(counts).reduce((sum, c) => sum + (c || 0), 0);

  // Show milestone status filter only when the Milestones pill is explicitly active
  const showMilestoneStatusFilter =
    milestoneStatusFilter !== undefined &&
    onMilestoneStatusChange !== undefined &&
    activeFilters.includes("milestones");

  // AI evaluation filter: show when Milestones active, unless status is Pending
  // (pending milestones never have evaluations, so the filter would always empty the list).
  // Also show whenever any AI URL param is already active, so users can always see and
  // clear the filter they landed on — never hide state that is affecting results.
  const hasActiveAIFilter =
    hasAIEvaluation !== undefined || aiScoreMin !== undefined || aiScoreMax !== undefined;
  const showAIEvaluationFilter =
    (activeFilters.includes("milestones") || hasActiveAIFilter) &&
    milestoneStatusFilter !== "pending";

  return (
    <div className={cn("flex flex-col gap-4", className)} data-testid="activity-filters">
      {/* Top row: Filter pills + date picker on left, Sort on right */}
      <div className="flex flex-row items-center justify-between flex-wrap gap-4">
        {/* Filter pills + date range picker */}
        <div className="flex flex-row flex-wrap gap-2 items-center" data-testid="filter-badges">
          {/* All button */}
          <button
            type="button"
            onClick={() => {
              if (activeFilters.length > 0) {
                for (const filter of activeFilters) onFilterToggle(filter);
              }
            }}
            data-testid="filter-everything"
            aria-pressed={activeFilters.length === 0}
            aria-label="Show everything"
            className={cn(
              "flex items-center gap-1.5 px-2 py-[5px] rounded-full transition-colors",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-neutral-500 dark:focus-visible:ring-neutral-400",
              activeFilters.length === 0 ? "bg-foreground" : "bg-secondary"
            )}
          >
            <span
              className={cn(
                "text-[12px] font-medium tracking-[0.18px] leading-[1.5]",
                activeFilters.length === 0 ? "text-background" : "text-foreground"
              )}
            >
              All
            </span>
            {totalCount > 0 && (
              <span
                className={cn(
                  "flex items-center justify-center border rounded-full w-[18px] h-[18px] text-[11px] font-medium tabular-nums leading-none",
                  activeFilters.length === 0
                    ? "border-background/20 text-background/70"
                    : "border-border text-muted-foreground"
                )}
              >
                {totalCount}
              </span>
            )}
          </button>

          {/* Category filter pills */}
          {filterOptions.map((filter) => {
            const isActive = activeFilters.includes(filter.value);
            const count = counts[filter.value];
            const isEmpty = !count;
            const config = FILTER_CONFIG[filter.value];
            const Icon = config?.icon;

            return (
              <button
                key={filter.value}
                type="button"
                onClick={() => onFilterToggle(filter.value)}
                disabled={isEmpty}
                data-testid={`filter-${filter.value}`}
                aria-pressed={isActive}
                aria-label={`Filter by ${filter.label}`}
                className={cn(
                  "flex items-center gap-1.5 px-2 py-[5px] rounded-full transition-colors",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-neutral-500 dark:focus-visible:ring-neutral-400",
                  "disabled:cursor-not-allowed disabled:opacity-40",
                  isEmpty && "max-lg:hidden",
                  isActive ? "bg-foreground" : "bg-secondary"
                )}
              >
                {Icon && <Icon className={cn("w-[13px] h-[13px] shrink-0", config?.iconClass)} />}
                <span
                  className={cn(
                    "text-[12px] font-medium tracking-[0.18px] leading-[1.5] whitespace-nowrap",
                    isActive ? "text-background" : "text-foreground"
                  )}
                >
                  {filter.label}
                </span>
                {count !== undefined && count > 0 && (
                  <span
                    className={cn(
                      "flex items-center justify-center border rounded-full w-[18px] h-[18px] text-[11px] font-medium tabular-nums leading-none",
                      isActive
                        ? "border-background/20 text-background/70"
                        : "border-border text-muted-foreground"
                    )}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}

          {/* Date range picker — always visible, applies to all activity types */}
          <DateRangePicker
            dateFrom={dateFrom}
            dateTo={dateTo}
            onDateRangeChange={onDateRangeChange}
          />
        </div>

        {/* Right-side controls: milestone status filter + sort */}
        <div className="flex flex-row items-center gap-2">
          {/* Milestone Status Filter */}
          {showMilestoneStatusFilter && (
            <Select
              value={milestoneStatusFilter}
              onValueChange={(value) => onMilestoneStatusChange(value as MilestoneStatusFilter)}
            >
              <SelectTrigger className="w-[150px]" data-testid="milestone-status-filter">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                {MILESTONE_STATUS_OPTIONS.map((option) => (
                  <SelectItem
                    key={option.value}
                    value={option.value}
                    data-testid={`milestone-status-${option.value}`}
                  >
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Sort Dropdown */}
          {sortBy && onSortChange && (
            <Select value={sortBy} onValueChange={(value) => onSortChange(value as SortOption)}>
              <SelectTrigger className="w-[140px]" data-testid="sort-select">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest" data-testid="sort-newest">
                  Newest first
                </SelectItem>
                <SelectItem value="oldest" data-testid="sort-oldest">
                  Oldest first
                </SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {/* Sub-filter row: AI evaluation filter (gated to milestones + completed/verified) */}
      {showAIEvaluationFilter && (
        <div className="flex flex-row flex-wrap gap-2 items-center">
          <AIEvaluationFilter
            hasAIEvaluation={hasAIEvaluation}
            aiScoreMin={aiScoreMin}
            aiScoreMax={aiScoreMax}
            onAIFilterChange={onAIFilterChange}
          />
        </div>
      )}
    </div>
  );
}
