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
import { Dialog, Transition } from "@headlessui/react";
import { AlertTriangle, GripVertical, Plus, Search, Sparkles, X } from "lucide-react";
import { Fragment, memo, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { useAutosyncedIndicators } from "@/hooks/useAutosyncedIndicators";
import type { Indicator } from "@/utilities/queries/getIndicatorsByCommunity";

interface ChartSectionPickerProps {
  // Kept for API symmetry with the form; system indicators are global, so
  // communityId is currently unused but reserved for future scoping.
  communityId: string;
  value: string[];
  onChange: (next: string[]) => void;
}

const WARN_THRESHOLD = 10;

export function ChartSectionPicker({ value, onChange }: ChartSectionPickerProps) {
  const [isDialogOpen, setDialogOpen] = useState(false);
  const { data: autosyncedIndicators = [], isLoading } = useAutosyncedIndicators();

  // De-dupe by id in case the API ever returns duplicates.
  const catalog = useMemo(() => {
    const seen = new Set<string>();
    const list: Indicator[] = [];
    for (const ind of autosyncedIndicators) {
      if (!seen.has(ind.id)) {
        seen.add(ind.id);
        list.push(ind);
      }
    }
    return list;
  }, [autosyncedIndicators]);

  const indicatorById = useMemo(() => {
    const map = new Map<string, Indicator>();
    for (const ind of catalog) map.set(ind.id, ind);
    return map;
  }, [catalog]);

  const selectedIndicators = useMemo(
    () => value.map((id) => indicatorById.get(id)).filter((i): i is Indicator => Boolean(i)),
    [value, indicatorById]
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = value.indexOf(String(active.id));
    const newIndex = value.indexOf(String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;
    onChange(arrayMove(value, oldIndex, newIndex));
  };

  const handleRemove = (id: string) => {
    onChange(value.filter((v) => v !== id));
  };

  const handleDialogSave = (next: string[]) => {
    onChange(next);
    setDialogOpen(false);
  };

  const showWarning = value.length > WARN_THRESHOLD;

  return (
    <div>
      {showWarning && (
        <div className="mb-2 flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
          <span>
            Rendering charts for {value.length} indicators will make the report larger and slower to
            generate. Consider keeping the list under {WARN_THRESHOLD}.
          </span>
        </div>
      )}

      {selectedIndicators.length === 0 ? (
        <div className="rounded-md border border-dashed border-zinc-300 px-4 py-6 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
          No indicators selected. Charts will be skipped for this report.
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={value} strategy={verticalListSortingStrategy}>
            <ul className="space-y-2">
              {selectedIndicators.map((indicator, idx) => (
                <SortableIndicatorRow
                  key={indicator.id}
                  indicator={indicator}
                  index={idx}
                  onRemove={handleRemove}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}

      <div className="mt-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setDialogOpen(true)}
          disabled={isLoading}
        >
          <Plus className="mr-1.5 h-4 w-4" />
          {selectedIndicators.length === 0 ? "Add indicators" : "Edit selection"}
        </Button>
      </div>

      <IndicatorPickerDialog
        isOpen={isDialogOpen}
        onClose={() => setDialogOpen(false)}
        onSave={handleDialogSave}
        initialSelection={value}
        catalog={catalog}
        isLoading={isLoading}
      />
    </div>
  );
}

interface SortableIndicatorRowProps {
  indicator: Indicator;
  index: number;
  onRemove: (id: string) => void;
}

const SortableIndicatorRow = memo(function SortableIndicatorRow({
  indicator,
  onRemove,
}: SortableIndicatorRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: indicator.id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 rounded-md border border-zinc-200 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800"
    >
      <button
        type="button"
        className="cursor-grab touch-none text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
        aria-label="Drag to reorder"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium text-zinc-800 dark:text-zinc-100">
            {indicator.name}
          </span>
          {indicator.syncType === "auto" && <AutoBadge />}
        </div>
      </div>
      <button
        type="button"
        onClick={() => onRemove(indicator.id)}
        aria-label={`Remove ${indicator.name}`}
        className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-700 dark:hover:text-zinc-200"
      >
        <X className="h-4 w-4" />
      </button>
    </li>
  );
});

interface IndicatorPickerDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (selected: string[]) => void;
  initialSelection: string[];
  catalog: Indicator[];
  isLoading: boolean;
}

function IndicatorPickerDialog({
  isOpen,
  onClose,
  onSave,
  initialSelection,
  catalog,
  isLoading,
}: IndicatorPickerDialogProps) {
  const [selection, setSelection] = useState<Set<string>>(new Set(initialSelection));
  const [query, setQuery] = useState("");

  // Reset local state when the dialog opens — picks up any external changes to
  // the selection that happened while the dialog was closed.
  const initialKey = useMemo(() => initialSelection.join("|"), [initialSelection]);
  useEffect(() => {
    if (isOpen) {
      setSelection(new Set(initialSelection));
      setQuery("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, initialKey]);

  const toggle = (id: string) => {
    const next = new Set(selection);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelection(next);
  };

  const handleSave = () => {
    // Preserve the order from the initial selection, then append newly-added IDs
    // in catalog order.
    const ordered: string[] = [];
    for (const id of initialSelection) {
      if (selection.has(id)) ordered.push(id);
    }
    for (const ind of catalog) {
      if (selection.has(ind.id) && !ordered.includes(ind.id)) {
        ordered.push(ind.id);
      }
    }
    onSave(ordered);
  };

  const filter = (list: Indicator[]) =>
    query.trim()
      ? list.filter((i) => i.name.toLowerCase().includes(query.trim().toLowerCase()))
      : list;

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/30" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-200"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-150"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-lg bg-white dark:bg-zinc-800 p-6 text-left align-middle shadow-xl transition-all">
                <div className="flex items-start justify-between gap-4">
                  <Dialog.Title className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                    Select chart indicators
                  </Dialog.Title>
                  <button
                    type="button"
                    onClick={onClose}
                    aria-label="Close"
                    className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-700"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                  Charts are rendered as sparklines, one row per project, with data since Jan 1 of
                  the report year.
                </p>

                <div className="mt-4 flex items-center gap-2 rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-600">
                  <Search className="h-4 w-4 text-zinc-400" />
                  <input
                    type="search"
                    placeholder="Search indicators..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="w-full bg-transparent text-sm focus:outline-none"
                  />
                </div>

                <div className="mt-4 max-h-[420px] overflow-y-auto pr-1">
                  {isLoading ? (
                    <div className="py-8 text-center text-sm text-zinc-500">
                      Loading indicators...
                    </div>
                  ) : catalog.length === 0 ? (
                    <div className="py-8 text-center text-sm text-zinc-500">
                      No indicators available.
                    </div>
                  ) : (
                    <IndicatorGroup
                      title="System indicators"
                      items={filter(catalog)}
                      selection={selection}
                      onToggle={toggle}
                    />
                  )}
                </div>

                <div className="mt-4 flex items-center justify-between gap-2 border-t border-zinc-200 pt-4 dark:border-zinc-700">
                  <span className="text-xs text-zinc-500">{selection.size} selected</span>
                  <div className="flex items-center gap-2">
                    <Button type="button" variant="outline" onClick={onClose}>
                      Cancel
                    </Button>
                    <Button type="button" onClick={handleSave}>
                      Save selection
                    </Button>
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}

interface IndicatorGroupProps {
  title: string;
  items: Indicator[];
  selection: Set<string>;
  onToggle: (id: string) => void;
}

function AutoBadge() {
  return (
    <span className="inline-flex flex-shrink-0 items-center rounded bg-blue-100 px-1.5 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900 dark:text-blue-300">
      <Sparkles className="mr-0.5 h-3 w-3" />
      Auto
    </span>
  );
}

function IndicatorGroup({ title, items, selection, onToggle }: IndicatorGroupProps) {
  if (items.length === 0) return null;
  return (
    <div className="mb-4">
      <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
        {title}
      </h4>
      <ul className="space-y-1">
        {items.map((indicator) => {
          const checked = selection.has(indicator.id);
          return (
            <li key={indicator.id}>
              <label className="flex cursor-pointer items-start gap-3 rounded px-2 py-1.5 hover:bg-zinc-50 dark:hover:bg-zinc-700/50">
                <input
                  type="checkbox"
                  className="mt-0.5 rounded border-zinc-300"
                  checked={checked}
                  onChange={() => onToggle(indicator.id)}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-zinc-800 dark:text-zinc-100">
                      {indicator.name}
                    </span>
                    {indicator.syncType === "auto" && <AutoBadge />}
                  </div>
                </div>
              </label>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
