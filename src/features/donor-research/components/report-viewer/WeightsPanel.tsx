"use client";

import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Minus, Plus, SlidersHorizontal } from "lucide-react";
import pluralize from "pluralize";
import { memo, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useReorderReport, useUpdateReportConfig } from "@/hooks/useUpdateReportConfig";
import type { CompositeWeights, ResearchReportDetail } from "@/types/donor-research";
import { DEFAULT_TOP_COUNT } from "../report-brief/scoring";
import { humanizeCase } from "../report-brief/text-utils";
import { WeightsAllocator } from "../weights/WeightsAllocator";
import { isValidWeights, weightsEqual } from "../weights/weights-allocation";
import { CommitWeightsDialog } from "./CommitWeightsDialog";
import { useLiveRankedCandidates } from "./use-live-ranked-candidates";

const MIN_TOP_COUNT = 1;
const MAX_TOP_COUNT = 25;

interface WeightsPanelProps {
  report: ResearchReportDetail;
}

function candidateName(name: string | null): string {
  return name ? humanizeCase(name, "title") : "Unidentified nonprofit";
}

/** Confirm-dialog copy for a commit that re-flags the featured set. */
function featuredOnePagerCopy(enteringCount: number, lead: string): string {
  if (enteringCount === 0) {
    return `${lead} No one-pagers will regenerate.`;
  }
  return `${lead} Regenerates one-pagers for ${enteringCount} ${pluralize(
    "candidate",
    enteringCount
  )} entering the featured set (and removes them for any leaving).`;
}

/**
 * Advisor-only ranking-control panel (DEV-418 U8). Opens as a right-side sheet
 * with three tabs that all share one draft state and one Save:
 *
 *  - **Weights** — five independent slider + number-input allocators (total 100%).
 *  - **Configs** — a stepper for the featured-set size (`topCount`, 1–25).
 *  - **Reorder** — drag rows into an explicit order (`manualPosition`).
 *
 * A single live ranking list sits below the tabs, shared by all three: it
 * re-ranks under the draft weights, marks the top `topCount` as featured, and is
 * draggable. A manual drag locks the display order (it wins over the weight
 * ranking and isn't disturbed by later weight changes). One **Save changes**
 * commits every dirty slice together — weights/topCount via the config endpoint,
 * then the manual order via reorder so it lands last. Rendered as the trigger
 * button only; mounted next to the share control in the masthead.
 */
export function WeightsPanel({ report }: WeightsPanelProps) {
  const [open, setOpen] = useState(false);
  // Reset the panel's drafts whenever the server-confirmed report changes (e.g.
  // after a commit refetch) by remounting PanelBody via this key — the
  // React-idiomatic alternative to syncing props into state with effects.
  const syncKey = useMemo(
    () =>
      JSON.stringify({
        weights: report.weights,
        topCount: report.topCount,
        order: report.candidates.map(
          (c) => `${c.id}:${c.featuredFlag ? 1 : 0}:${c.manualPosition ?? ""}`
        ),
      }),
    [report]
  );
  const persistedWeights = report.weights;

  if (!persistedWeights) return null;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-muted"
        >
          <SlidersHorizontal aria-hidden className="h-4 w-4" />
          Adjust ranking
        </button>
      </SheetTrigger>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 overflow-y-auto sm:max-w-md"
        // Radix listens for Escape at the document level, so a child
        // stopPropagation can't reach it. When a reorder grip has focus, prevent
        // the close here — Escape should cancel the drag (dnd-kit), not dismiss
        // the whole panel (QA finding C-DOG-1).
        onEscapeKeyDown={(event) => {
          const active = document.activeElement;
          if (active instanceof HTMLElement && active.closest("[data-reorder-grip]")) {
            event.preventDefault();
          }
        }}
      >
        <PanelBody
          key={syncKey}
          report={report}
          persistedWeights={persistedWeights}
          onClose={() => setOpen(false)}
        />
      </SheetContent>
    </Sheet>
  );
}

interface PanelBodyProps {
  report: ResearchReportDetail;
  persistedWeights: CompositeWeights;
  onClose: () => void;
}

function PanelBody({ report, persistedWeights, onClose }: PanelBodyProps) {
  const updateConfig = useUpdateReportConfig();
  const reorder = useReorderReport();

  const persistedOrder = useMemo(() => report.candidates.map((c) => c.id), [report.candidates]);
  const persistedTopCount = report.topCount ?? DEFAULT_TOP_COUNT;

  // One shared draft across all three tabs.
  const [draftWeights, setDraftWeights] = useState<CompositeWeights>(persistedWeights);
  const [draftTopCount, setDraftTopCount] = useState<number>(persistedTopCount);
  // null = follow the weight ranking; a value = an explicit manual order that
  // wins over the ranking and is left untouched by later weight changes.
  const [draftOrder, setDraftOrder] = useState<string[] | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const candidatesById = useMemo(
    () => new Map(report.candidates.map((c) => [c.id, c])),
    [report.candidates]
  );

  // Scores + the weight-ranked order under the draft weights/topCount.
  const live = useLiveRankedCandidates(report.candidates, draftWeights, draftTopCount);
  const scoreOrder = useMemo(() => live.ranked.map((e) => e.candidate.id), [live.ranked]);
  const compositeById = useMemo(
    () => new Map(live.ranked.map((e) => [e.candidate.id, e.composite])),
    [live.ranked]
  );

  // The display order is the manual order if one was set, else the weight rank.
  const orderIds = draftOrder ?? scoreOrder;
  const wasFeatured = useMemo(
    () => new Set(report.candidates.filter((c) => c.featuredFlag).map((c) => c.id)),
    [report.candidates]
  );

  const rows = useMemo(
    () =>
      orderIds.map((id, index): RankingRow => {
        const candidate = candidatesById.get(id);
        const featured = index < draftTopCount;
        const flip: RankingRow["flip"] = featured
          ? wasFeatured.has(id)
            ? null
            : "entered"
          : wasFeatured.has(id)
            ? "left"
            : null;
        return {
          id,
          name: candidateName(candidate?.organizationName ?? null),
          composite: Math.round((compositeById.get(id) ?? candidate?.composite ?? 0) * 100),
          featured,
          flip,
        };
      }),
    [orderIds, draftTopCount, wasFeatured, candidatesById, compositeById]
  );
  const enteringCount = rows.filter((r) => r.flip === "entered").length;

  const weightsDirty = !weightsEqual(draftWeights, persistedWeights);
  const weightsBalanced = isValidWeights(draftWeights);
  const topCountDirty = draftTopCount !== persistedTopCount;
  const orderDirty = draftOrder !== null && draftOrder.some((id, i) => id !== persistedOrder[i]);
  const anyDirty = weightsDirty || topCountDirty || orderDirty;

  const isPending = updateConfig.isPending || reorder.isPending;

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setDraftOrder((prev) => {
      const base = prev ?? scoreOrder;
      const from = base.indexOf(String(active.id));
      const to = base.indexOf(String(over.id));
      return from === -1 || to === -1 ? base : arrayMove(base, from, to);
    });
  };

  const resetAll = () => {
    setDraftWeights(persistedWeights);
    setDraftTopCount(persistedTopCount);
    setDraftOrder(null);
  };

  // One Save commits every dirty slice. Config goes first because it re-ranks
  // and clears any manual order server-side; reorder then lands last so the
  // advisor's manual order wins.
  const commitAll = async () => {
    try {
      if (weightsDirty || topCountDirty) {
        await updateConfig.mutateAsync({
          reportId: report.id,
          ...(weightsDirty ? { weights: draftWeights } : {}),
          ...(topCountDirty ? { topCount: draftTopCount } : {}),
        });
      }
      if (orderDirty && draftOrder) {
        await reorder.mutateAsync({ reportId: report.id, orderedCandidateIds: draftOrder });
      }
      toast.success("Ranking updated.");
      setConfirmOpen(false);
      onClose();
    } catch (error) {
      toast.error((error as Error).message || "Couldn't update the ranking.");
    }
  };

  const confirmDescription = featuredOnePagerCopy(
    enteringCount,
    "This re-ranks every candidate under your changes."
  );

  return (
    <>
      <SheetHeader className="text-left">
        <SheetTitle>Adjust ranking</SheetTitle>
        <SheetDescription>
          Tune the composite weights, how many results are featured, or drag a manual order. Every
          change previews in the list below and applies together when you save.
        </SheetDescription>
      </SheetHeader>

      <Tabs defaultValue="weights" className="mt-4 flex flex-col">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="weights">Weights</TabsTrigger>
          <TabsTrigger value="config">Configs</TabsTrigger>
          <TabsTrigger value="reorder">Reorder</TabsTrigger>
        </TabsList>

        <TabsContent value="weights" className="mt-4">
          <WeightsAllocator
            value={draftWeights}
            onChange={setDraftWeights}
            resetValue={persistedWeights}
            disabled={isPending}
          />
        </TabsContent>

        <TabsContent value="config" className="mt-4 flex flex-col gap-2">
          <p className="text-sm font-medium text-foreground">Featured results</p>
          <p className="text-xs text-muted-foreground">
            The top{" "}
            <span className="font-medium text-foreground">
              {draftTopCount} of {report.candidates.length}
            </span>{" "}
            candidates are featured with an AI one-pager. Choose between {MIN_TOP_COUNT} and{" "}
            {MAX_TOP_COUNT}.
          </p>
          <TopCountStepper value={draftTopCount} onChange={setDraftTopCount} disabled={isPending} />
        </TabsContent>

        <TabsContent value="reorder" className="mt-4">
          <p className="text-xs text-muted-foreground">
            Drag the rows in the list below into the order you want donors to see. A manual order
            sticks even if you change the weights, and the top {draftTopCount} stay featured.
          </p>
        </TabsContent>
      </Tabs>

      <RankingList
        rows={rows}
        sensors={sensors}
        onDragEnd={handleDragEnd}
        manual={draftOrder !== null}
      />

      <div className="mt-5 flex items-center justify-between gap-3">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={!anyDirty || isPending}
          onClick={resetAll}
        >
          Reset
        </Button>
        <Button
          type="button"
          disabled={!anyDirty || !weightsBalanced || isPending}
          onClick={() => setConfirmOpen(true)}
        >
          Save changes
        </Button>
      </div>

      <CommitWeightsDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Update report ranking?"
        description={confirmDescription}
        confirmLabel="Save changes"
        isPending={isPending}
        onConfirm={commitAll}
      />
    </>
  );
}

function TopCountStepper({
  value,
  onChange,
  disabled,
}: {
  value: number;
  onChange: (next: number) => void;
  disabled?: boolean;
}) {
  const clamp = (n: number) => Math.min(MAX_TOP_COUNT, Math.max(MIN_TOP_COUNT, n));
  return (
    <div className="flex items-center gap-3">
      <Button
        type="button"
        variant="outline"
        size="icon-sm"
        aria-label="Fewer featured results"
        disabled={disabled || value <= MIN_TOP_COUNT}
        onClick={() => onChange(clamp(value - 1))}
      >
        <Minus aria-hidden className="h-4 w-4" />
      </Button>
      <output
        aria-live="polite"
        aria-label={`${value} featured results`}
        className="w-8 text-center text-lg font-medium tabular-nums text-foreground"
      >
        {value}
      </output>
      <Button
        type="button"
        variant="outline"
        size="icon-sm"
        aria-label="More featured results"
        disabled={disabled || value >= MAX_TOP_COUNT}
        onClick={() => onChange(clamp(value + 1))}
      >
        <Plus aria-hidden className="h-4 w-4" />
      </Button>
    </div>
  );
}

interface RankingRow {
  id: string;
  name: string;
  composite: number;
  featured: boolean;
  flip: "entered" | "left" | null;
}

function RankingList({
  rows,
  sensors,
  onDragEnd,
  manual,
}: {
  rows: RankingRow[];
  sensors: ReturnType<typeof useSensors>;
  onDragEnd: (event: DragEndEvent) => void;
  manual: boolean;
}) {
  const items = useMemo(() => rows.map((r) => r.id), [rows]);
  return (
    <section aria-label="Live ranking preview" className="mt-5 flex flex-col gap-2">
      <h3 className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
        {manual ? "Manual order (drag to change)" : "Live preview (drag to set a manual order)"}
      </h3>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={items} strategy={verticalListSortingStrategy}>
          <ol className="flex flex-col gap-1.5">
            {rows.map((row, index) => (
              <SortableCandidateRow key={row.id} position={index + 1} {...row} />
            ))}
          </ol>
        </SortableContext>
      </DndContext>
    </section>
  );
}

const SortableCandidateRow = memo(function SortableCandidateRow({
  id,
  position,
  name,
  composite,
  featured,
  flip,
}: RankingRow & { position: number }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-sm ${
        featured ? "border-brand-400/60 bg-brand-50/40 dark:bg-brand-950/20" : "border-border"
      } ${isDragging ? "opacity-70" : ""}`}
    >
      <button
        type="button"
        aria-label={`Drag ${name} to reorder`}
        // Marker the Sheet keys off so Escape on a focused grip cancels the
        // drag instead of dismissing the whole panel (see onEscapeKeyDown).
        data-reorder-grip=""
        className="shrink-0 cursor-grab touch-none text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <GripVertical aria-hidden className="h-4 w-4" />
      </button>
      <span className="w-5 shrink-0 tabular-nums text-muted-foreground">{position}</span>
      <span className="min-w-0 flex-1 truncate">{name}</span>
      {flip === "entered" ? (
        <Badge variant="default" className="shrink-0 text-[10px]">
          Entering featured
        </Badge>
      ) : flip === "left" ? (
        <Badge variant="secondary" className="shrink-0 text-[10px]">
          Leaving featured
        </Badge>
      ) : featured ? (
        <Badge variant="secondary" className="shrink-0 text-[10px]">
          Featured
        </Badge>
      ) : null}
      <span className="w-9 shrink-0 text-right tabular-nums text-muted-foreground">
        {composite}
      </span>
    </li>
  );
});
