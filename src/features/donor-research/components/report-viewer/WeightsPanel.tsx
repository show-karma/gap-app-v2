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
import { WEIGHT_DIMENSIONS } from "../weights/use-weights-rebalance";
import { WeightsSliders } from "../weights/WeightsSliders";
import { CommitWeightsDialog } from "./CommitWeightsDialog";
import { type LiveRanking, useLiveRankedCandidates } from "./use-live-ranked-candidates";

const MIN_TOP_COUNT = 1;
const MAX_TOP_COUNT = 25;

interface WeightsPanelProps {
  report: ResearchReportDetail;
}

function weightsEqual(a: CompositeWeights, b: CompositeWeights): boolean {
  return WEIGHT_DIMENSIONS.every((d) => a[d] === b[d]);
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
 * so it never disturbs the editorial brief's layout, with three tabs:
 *
 *  - **Weights** — five sum-to-100 sliders with an in-browser live preview of
 *    the resulting ranking and featured-set flip badges.
 *  - **Configs** — a stepper for the featured-set size (`topCount`, 1–25): how
 *    many top candidates receive the AI one-pager.
 *  - **Reorder** — drag candidates into an explicit order (`manualPosition`).
 *
 * Committing any tab re-ranks server-side; the brief reshuffles from the
 * server-confirmed report. Rendered only on five-dimension reports
 * (`report.weights`).
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
        <Button
          type="button"
          variant="outline"
          // Pinned bottom-LEFT so it never collides with the bottom-right
          // support/chat widget on small screens (QA finding D-DOG).
          className="fixed bottom-6 left-6 z-40 shadow-lg sm:bottom-8 sm:left-8"
        >
          <SlidersHorizontal aria-hidden className="mr-2 h-4 w-4" />
          Adjust ranking
        </Button>
      </SheetTrigger>
      <SheetContent
        side="left"
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

  const [draftWeights, setDraftWeights] = useState<CompositeWeights>(persistedWeights);
  const [draftTopCount, setDraftTopCount] = useState<number>(persistedTopCount);
  const [draftOrder, setDraftOrder] = useState<string[]>(persistedOrder);
  const [confirm, setConfirm] = useState<null | "weights" | "config" | "reorder">(null);

  // Each tab previews only its own change: the Weights tab re-ranks under the
  // draft weights at the persisted featured size; the Configs tab moves the
  // featured cutoff at the persisted weights.
  const weightsLive = useLiveRankedCandidates(report.candidates, draftWeights, persistedTopCount);
  const configLive = useLiveRankedCandidates(report.candidates, persistedWeights, draftTopCount);

  const candidatesById = useMemo(
    () => new Map(report.candidates.map((c) => [c.id, c])),
    [report.candidates]
  );

  const weightsDirty = !weightsEqual(draftWeights, persistedWeights);
  const topCountDirty = draftTopCount !== persistedTopCount;
  const orderDirty = draftOrder.some((id, i) => id !== persistedOrder[i]);

  const reorderFlips = useMemo(() => {
    const wasFeatured = new Set(report.candidates.filter((c) => c.featuredFlag).map((c) => c.id));
    return draftOrder.filter((id, i) => i < persistedTopCount && !wasFeatured.has(id)).length;
  }, [draftOrder, report.candidates, persistedTopCount]);

  const isPending = updateConfig.isPending || reorder.isPending;

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setDraftOrder((order) => {
      const from = order.indexOf(String(active.id));
      const to = order.indexOf(String(over.id));
      return from === -1 || to === -1 ? order : arrayMove(order, from, to);
    });
  };

  const commitWeights = () => {
    updateConfig.mutate(
      { reportId: report.id, weights: draftWeights },
      {
        onSuccess: () => {
          toast.success("Ranking updated.");
          setConfirm(null);
          onClose();
        },
        onError: (error) => toast.error(error.message || "Couldn't update the ranking."),
      }
    );
  };

  const commitConfig = () => {
    updateConfig.mutate(
      { reportId: report.id, topCount: draftTopCount },
      {
        onSuccess: () => {
          toast.success("Featured set updated.");
          setConfirm(null);
          onClose();
        },
        onError: (error) => toast.error(error.message || "Couldn't update the featured set."),
      }
    );
  };

  const commitReorder = () => {
    reorder.mutate(
      { reportId: report.id, orderedCandidateIds: draftOrder },
      {
        onSuccess: () => {
          toast.success("Order saved.");
          setConfirm(null);
          onClose();
        },
        onError: (error) => toast.error(error.message || "Couldn't save the order."),
      }
    );
  };

  const weightsDescription = featuredOnePagerCopy(
    weightsLive.flippedCount,
    "This re-ranks every candidate under the new weights."
  );
  const configDescription = featuredOnePagerCopy(
    configLive.flippedCount,
    `This sets the featured set to the top ${draftTopCount}.`
  );
  const reorderDescription = featuredOnePagerCopy(reorderFlips, "This forces your manual order.");

  return (
    <>
      <SheetHeader className="text-left">
        <SheetTitle>Adjust ranking</SheetTitle>
        <SheetDescription>
          Tune the composite weights, how many results are featured, or set a manual order. Changes
          preview here and only apply when you commit.
        </SheetDescription>
      </SheetHeader>

      <Tabs defaultValue="weights" className="mt-4 flex flex-1 flex-col">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="weights">Weights</TabsTrigger>
          <TabsTrigger value="config">Configs</TabsTrigger>
          <TabsTrigger value="reorder">Reorder</TabsTrigger>
        </TabsList>

        <TabsContent value="weights" className="mt-4 flex flex-col gap-5">
          <WeightsSliders value={draftWeights} onChange={setDraftWeights} disabled={isPending} />
          <LivePreviewList live={weightsLive} />
          <div className="flex items-center justify-between gap-3">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={!weightsDirty || isPending}
              onClick={() => setDraftWeights(persistedWeights)}
            >
              Reset
            </Button>
            <Button
              type="button"
              disabled={!weightsDirty || isPending}
              onClick={() => setConfirm("weights")}
            >
              Update weights
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="config" className="mt-4 flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium text-foreground">Featured results</p>
            <p className="text-xs text-muted-foreground">
              The top{" "}
              <span className="font-medium text-foreground">
                {draftTopCount} of {report.candidates.length}
              </span>{" "}
              candidates are featured with an AI one-pager. Choose between {MIN_TOP_COUNT} and{" "}
              {MAX_TOP_COUNT}.
            </p>
            <TopCountStepper
              value={draftTopCount}
              onChange={setDraftTopCount}
              disabled={isPending}
            />
          </div>
          <LivePreviewList live={configLive} />
          <div className="flex items-center justify-between gap-3">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={!topCountDirty || isPending}
              onClick={() => setDraftTopCount(persistedTopCount)}
            >
              Reset
            </Button>
            <Button
              type="button"
              disabled={!topCountDirty || isPending}
              onClick={() => setConfirm("config")}
            >
              Update results
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="reorder" className="mt-4 flex flex-col gap-5">
          <p className="text-xs text-muted-foreground">
            Drag candidates into the order you want donors to see. The top {persistedTopCount}{" "}
            become the featured one-pagers. Changing weights later resets a manual order.
          </p>

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={draftOrder} strategy={verticalListSortingStrategy}>
              <ol className="flex flex-col gap-1.5">
                {draftOrder.map((id, index) => {
                  const candidate = candidatesById.get(id);
                  if (!candidate) return null;
                  return (
                    <SortableCandidateRow
                      key={id}
                      id={id}
                      position={index + 1}
                      name={candidateName(candidate.organizationName)}
                      composite={Math.round(candidate.composite * 100)}
                      featured={index < persistedTopCount}
                    />
                  );
                })}
              </ol>
            </SortableContext>
          </DndContext>

          <div className="flex items-center justify-between gap-3">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={!orderDirty || isPending}
              onClick={() => setDraftOrder(persistedOrder)}
            >
              Reset
            </Button>
            <Button
              type="button"
              disabled={!orderDirty || isPending}
              onClick={() => setConfirm("reorder")}
            >
              Update order
            </Button>
          </div>
        </TabsContent>
      </Tabs>

      <CommitWeightsDialog
        open={confirm === "weights"}
        onOpenChange={(next) => setConfirm(next ? "weights" : null)}
        title="Update report ranking?"
        description={weightsDescription}
        confirmLabel="Update weights"
        isPending={updateConfig.isPending}
        onConfirm={commitWeights}
      />
      <CommitWeightsDialog
        open={confirm === "config"}
        onOpenChange={(next) => setConfirm(next ? "config" : null)}
        title="Update featured results?"
        description={configDescription}
        confirmLabel="Update results"
        isPending={updateConfig.isPending}
        onConfirm={commitConfig}
      />
      <CommitWeightsDialog
        open={confirm === "reorder"}
        onOpenChange={(next) => setConfirm(next ? "reorder" : null)}
        title="Save manual order?"
        description={reorderDescription}
        confirmLabel="Update order"
        isPending={reorder.isPending}
        onConfirm={commitReorder}
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

function LivePreviewList({ live }: { live: LiveRanking }) {
  return (
    <section aria-label="Live ranking preview" className="flex flex-col gap-2">
      <h3 className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
        Live preview
      </h3>
      <ol className="flex flex-col gap-1.5">
        {live.ranked.map((entry, index) => {
          const id = entry.candidate.id;
          const flip = live.entering.has(id) ? "entered" : live.leaving.has(id) ? "left" : null;
          return (
            <li
              key={id}
              data-flipped={flip ?? undefined}
              className={`flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-sm ${
                flip ? "border-brand-400/60 bg-brand-50/40 dark:bg-brand-950/20" : "border-border"
              }`}
            >
              <span className="w-5 shrink-0 tabular-nums text-muted-foreground">{index + 1}</span>
              <span className="min-w-0 flex-1 truncate">
                {candidateName(entry.candidate.organizationName)}
              </span>
              {flip === "entered" ? (
                <Badge variant="default" className="shrink-0 text-[10px]">
                  Entering featured
                </Badge>
              ) : flip === "left" ? (
                <Badge variant="secondary" className="shrink-0 text-[10px]">
                  Leaving featured
                </Badge>
              ) : null}
              <span className="w-9 shrink-0 text-right tabular-nums text-muted-foreground">
                {Math.round(entry.composite * 100)}
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

interface SortableCandidateRowProps {
  id: string;
  position: number;
  name: string;
  composite: number;
  featured: boolean;
}

const SortableCandidateRow = memo(function SortableCandidateRow({
  id,
  position,
  name,
  composite,
  featured,
}: SortableCandidateRowProps) {
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
      {featured ? (
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
