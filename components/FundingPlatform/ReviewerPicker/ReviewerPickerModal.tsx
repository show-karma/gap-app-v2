"use client";

import { MagnifyingGlassIcon, PlusIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import pluralize from "pluralize";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-hot-toast";
import { Spinner } from "@/components/Utilities/Spinner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCommunityReviewerPrograms } from "@/hooks/useCommunityReviewerPrograms";
import { useCommunityReviewers } from "@/hooks/useCommunityReviewers";
import type {
  CommunityReviewer,
  CommunityReviewerRole,
} from "@/services/community-reviewers/community-reviewers.types";
import { milestoneReviewersService } from "@/services/milestone-reviewers.service";
import { programReviewersService } from "@/services/program-reviewers.service";
import { QUERY_KEYS } from "@/utilities/queryKeys";
import { cn } from "@/utilities/tailwind";
import EmptyState from "./EmptyState";
import type {
  ReviewerPickerModalProps,
  ReviewerRoleSelection,
  SelectedRow,
} from "./ReviewerPickerModal.types";
import {
  emptyNewRow,
  isRowDirty,
  poolRowFromReviewer,
  roleSelectionFromCommunityRole,
} from "./ReviewerPickerModal.types";
import { validateReviewerRow } from "./reviewer-validation";

const DEBOUNCE_DELAY_MS = 250;

function generateNewRowId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `new-${crypto.randomUUID()}`;
  }
  return `new-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

// ─── Role badge ──────────────────────────────────────────────────────────────

function RoleBadge({ role }: { role: CommunityReviewerRole }) {
  const isApp = role === "program-reviewer";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide",
        isApp
          ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
          : "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300"
      )}
    >
      {isApp ? "App" : "Milestone"}
    </span>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

const ReviewerPickerModal = ({
  open,
  onOpenChange,
  communityUID,
  programId,
  reviewerType,
  assignedAddresses,
  onCompleted,
  initialMode = "pool",
}: ReviewerPickerModalProps) => {
  const queryClient = useQueryClient();
  const defaultRole: ReviewerRoleSelection = reviewerType;

  const [rows, setRows] = useState<SelectedRow[]>([]);
  const [rawSearch, setRawSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [programFilter, setProgramFilter] = useState<string>("all");
  const [roleFilter, setRoleFilter] = useState<"all" | "program" | "milestone">("all");

  // Debounce search
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedSearch(rawSearch), DEBOUNCE_DELAY_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [rawSearch]);

  // ── Data ───────────────────────────────────────────────────────────────────
  const {
    items: poolItems,
    isLoading: isPoolLoading,
    isError: isPoolError,
    error: poolError,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useCommunityReviewers({
    communityUID,
    programId: programFilter === "all" ? undefined : programFilter,
    search: debouncedSearch || undefined,
    enabled: open,
  });

  const { data: programsData } = useCommunityReviewerPrograms({
    communityUID,
    enabled: open,
  });
  const reviewerPrograms = programsData?.items ?? [];

  const assignedSet = useMemo(
    () => new Set(assignedAddresses.map((a) => a.toLowerCase())),
    [assignedAddresses]
  );
  const selectedAddressSet = useMemo(
    () => new Set(rows.flatMap((r) => (r.kind === "pool" ? [r.publicAddress.toLowerCase()] : []))),
    [rows]
  );

  const visiblePoolItems = useMemo(() => {
    return poolItems
      .filter((r) => !assignedSet.has(r.publicAddress.toLowerCase()))
      .filter((r) => {
        if (roleFilter === "all") return true;
        const needed: CommunityReviewerRole =
          roleFilter === "program" ? "program-reviewer" : "milestone-reviewer";
        return r.roles.includes(needed);
      });
  }, [poolItems, assignedSet, roleFilter]);

  // ── Row mutations ──────────────────────────────────────────────────────────
  const handleRemoveRow = useCallback((id: string) => {
    setRows((prev) => prev.filter((r) => r.id !== id));
  }, []);

  const handleAddNew = useCallback(() => {
    setRows((prev) => [...prev, emptyNewRow(generateNewRowId(), defaultRole)]);
  }, [defaultRole]);

  const handleTogglePool = useCallback(
    (reviewer: CommunityReviewer) => {
      const existing = rows.find((r) => r.id === reviewer.publicAddress);
      if (existing) {
        handleRemoveRow(reviewer.publicAddress);
      } else {
        setRows((prev) => [...prev, poolRowFromReviewer(reviewer, defaultRole)]);
      }
    },
    [rows, handleRemoveRow, defaultRole]
  );

  const handleFieldChange = useCallback(
    (id: string, field: "name" | "email" | "telegram" | "slack", value: string) => {
      setRows((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
    },
    []
  );

  const handleToggleRole = useCallback((id: string, role: ReviewerRoleSelection) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        const has = r.roles.includes(role);
        const next = has ? r.roles.filter((x) => x !== role) : [...r.roles, role];
        return { ...r, roles: next };
      })
    );
  }, []);

  // Auto-seed blank row when opened in addNew mode
  const didSeedAddNewRef = useRef(false);
  useEffect(() => {
    if (open && initialMode === "addNew" && !didSeedAddNewRef.current) {
      didSeedAddNewRef.current = true;
      handleAddNew();
    }
    if (!open) {
      didSeedAddNewRef.current = false;
    }
  }, [open, initialMode, handleAddNew]);

  // ── Save (mutation) ───────────────────────────────────────────────────────
  const saveMutation = useMutation({
    mutationFn: async (toSave: SelectedRow[]) => {
      const settled = await Promise.allSettled(
        toSave.map(async (row) => {
          const basePayload = {
            name: row.name,
            email: row.email,
            telegram: row.telegram || undefined,
            slack: row.slack || undefined,
          };

          // PATCH dirty contact info once (pool rows only) — applies cross-program
          if (row.kind === "pool" && isRowDirty(row)) {
            await programReviewersService.updateReviewerContact(programId, {
              email: row.original.email,
              telegram: row.telegram || undefined,
              slack: row.slack || undefined,
            });
          }

          const calls = row.roles.map((r) =>
            r === "program"
              ? programReviewersService.addReviewer(programId, basePayload)
              : milestoneReviewersService.addReviewer(programId, basePayload)
          );
          await Promise.all(calls);
          return row.id;
        })
      );

      const failures = settled
        .map((result, i) => ({ result, row: toSave[i] }))
        .filter((x) => x.result.status === "rejected");

      return { totalCount: toSave.length, failures };
    },
    onSuccess: async ({ totalCount, failures }) => {
      // Always invalidate — even partial-success refreshes the parent list.
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.REVIEWERS.PROGRAM(programId) }),
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.REVIEWERS.MILESTONE(programId) }),
      ]);

      if (failures.length === 0) {
        toast.success(`${totalCount} ${pluralize("reviewer", totalCount)} added successfully.`);
        setRows([]);
        onOpenChange(false);
        onCompleted?.();
        return;
      }

      // Partial failure: keep only failed rows annotated with their error.
      const failedIds = new Set(failures.map((f) => f.row.id));
      setRows((prev) =>
        prev
          .filter((r) => failedIds.has(r.id))
          .map((r) => {
            const failure = failures.find((f) => f.row.id === r.id);
            const reason = failure?.result.status === "rejected" ? failure.result.reason : null;
            const errorMsg = reason instanceof Error ? reason.message : "Failed to add";
            return { ...r, error: errorMsg };
          })
      );
      const successCount = totalCount - failures.length;
      if (successCount > 0) {
        toast.success(
          `${successCount} ${pluralize("reviewer", successCount)} added; ${failures.length} failed.`
        );
        onCompleted?.();
      } else {
        toast.error(
          `${failures.length} ${pluralize("reviewer", failures.length)} could not be added.`
        );
      }
    },
  });

  const isSaving = saveMutation.isPending;

  const handleSave = useCallback(() => {
    if (rows.length === 0) return;
    const rowsMissingRoles = rows.filter((r) => r.roles.length === 0);
    if (rowsMissingRoles.length > 0) {
      toast.error(
        `Each reviewer needs at least one role selected (${rowsMissingRoles.length} missing).`
      );
      return;
    }

    // Client-side field validation mirroring backend ReviewerDataSchema.
    const validationErrors = new Map<string, string>();
    for (const row of rows) {
      const result = validateReviewerRow({
        name: row.name,
        email: row.email,
        telegram: row.telegram,
        slack: row.slack,
      });
      if (!result.ok && result.error) {
        validationErrors.set(row.id, result.error);
      }
    }
    if (validationErrors.size > 0) {
      setRows((prev) =>
        prev.map((r) =>
          validationErrors.has(r.id) ? { ...r, error: validationErrors.get(r.id) ?? null } : r
        )
      );
      toast.error(
        `${validationErrors.size} ${pluralize("reviewer", validationErrors.size)} ${
          validationErrors.size === 1 ? "has" : "have"
        } invalid contact info.`
      );
      return;
    }

    saveMutation.mutate(rows);
  }, [rows, saveMutation]);

  // ── Close handler ──────────────────────────────────────────────────────────
  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (isSaving) return;
      if (!next) {
        setRows([]);
        setRawSearch("");
        setDebouncedSearch("");
        setProgramFilter("all");
        setRoleFilter("all");
      }
      onOpenChange(next);
    },
    [isSaving, onOpenChange]
  );

  // Only show "no community reviewers yet" when the raw pool is truly empty —
  // not just when all items are hidden by the assigned/role filters.
  const isPoolEmpty = !isPoolLoading && !isPoolError && poolItems.length === 0 && rows.length === 0;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="max-w-2xl w-full max-h-[85vh] flex flex-col p-0 gap-0 overflow-hidden"
        data-testid="reviewer-picker-modal"
      >
        <DialogHeader className="px-6 pt-5 pb-4 flex-shrink-0">
          <DialogTitle className="text-lg font-semibold">Add reviewers</DialogTitle>
          <DialogDescription className="sr-only">
            Add reviewers to this program by selecting from your community pool or adding new ones.
          </DialogDescription>
        </DialogHeader>

        {/* Search + filters */}
        <div className="px-6 pb-3 flex-shrink-0 space-y-2">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            <Input
              value={rawSearch}
              onChange={(e) => setRawSearch(e.target.value)}
              placeholder="Search name, email, or wallet…"
              className="pl-9 h-10 text-sm"
              aria-label="Search community reviewers"
              data-testid="picker-search"
            />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Select value={programFilter} onValueChange={setProgramFilter}>
              <SelectTrigger
                className="h-8 w-auto min-w-[160px] text-xs"
                data-testid="picker-program-filter"
              >
                <SelectValue placeholder="All programs" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All programs</SelectItem>
                {reviewerPrograms.map((p) => (
                  <SelectItem key={p.programId} value={p.programId}>
                    {p.name} <span className="text-gray-400">({p.reviewerCount})</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="inline-flex rounded-md border border-gray-200 dark:border-gray-700 overflow-hidden h-8 text-xs">
              {(["all", "program", "milestone"] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setRoleFilter(v)}
                  className={cn(
                    "px-3 transition-colors",
                    roleFilter === v
                      ? "bg-brand-blue text-white"
                      : "bg-white text-gray-600 hover:bg-gray-50 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
                  )}
                  data-testid={`picker-role-filter-${v}`}
                >
                  {v === "all" ? "All" : v === "program" ? "App" : "Milestone"}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Main scroll area */}
        <div className="flex-1 min-h-0 overflow-y-auto px-6">
          {/* Selected chips */}
          {rows.length > 0 && (
            <div className="mb-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">
                Selected ({rows.length})
              </p>
              <div className="space-y-2">
                {rows.map((row) => (
                  <SelectedRowCard
                    key={row.id}
                    row={row}
                    onFieldChange={handleFieldChange}
                    onToggleRole={handleToggleRole}
                    onRemove={handleRemoveRow}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Add new CTA — always available */}
          <button
            type="button"
            onClick={handleAddNew}
            className="w-full flex items-center justify-center gap-2 py-2.5 mb-4 rounded-md border border-dashed border-gray-300 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-300 hover:border-brand-blue hover:text-brand-blue transition-colors"
            data-testid="add-new-reviewer-btn"
          >
            <PlusIcon className="h-4 w-4" />
            Add new reviewer
          </button>

          {/* Pool */}
          <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">
            Community pool
          </p>
          {isPoolLoading ? (
            <div className="flex items-center justify-center py-10">
              <Spinner className="h-6 w-6" />
              <span className="sr-only">Loading reviewers…</span>
            </div>
          ) : isPoolError ? (
            <div className="py-6 text-center text-sm text-red-600 dark:text-red-400">
              {poolError?.message ?? "Failed to load community reviewers."}
            </div>
          ) : isPoolEmpty ? (
            <div className="py-6">
              <EmptyState onAddNew={handleAddNew} />
            </div>
          ) : (
            <ul className="space-y-1 pb-4">
              {visiblePoolItems.map((r) => {
                const isSelected = selectedAddressSet.has(r.publicAddress.toLowerCase());
                return (
                  <li key={r.publicAddress}>
                    <button
                      type="button"
                      onClick={() => handleTogglePool(r)}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2 rounded-md text-left transition-colors cursor-pointer",
                        isSelected
                          ? "bg-blue-50 dark:bg-blue-900/20"
                          : "hover:bg-gray-50 dark:hover:bg-gray-800/50"
                      )}
                      data-testid={`pool-item-${r.publicAddress}`}
                    >
                      <Checkbox
                        checked={isSelected}
                        tabIndex={-1}
                        aria-label={`Select ${r.name || r.email}`}
                        className="pointer-events-none"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                            {r.name || r.email}
                          </p>
                          <span className="flex items-center gap-1">
                            {r.roles.map((role) => (
                              <RoleBadge key={role} role={role} />
                            ))}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          {r.email}
                        </p>
                      </div>
                    </button>
                  </li>
                );
              })}
              {hasNextPage && (
                <li className="pt-2 text-center">
                  <button
                    type="button"
                    onClick={() => fetchNextPage()}
                    disabled={isFetchingNextPage}
                    className="text-xs text-brand-blue underline hover:no-underline disabled:opacity-50"
                  >
                    {isFetchingNextPage ? "Loading…" : "Load more"}
                  </button>
                </li>
              )}
            </ul>
          )}
        </div>

        <DialogFooter className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={isSaving || rows.length === 0}
            data-testid="save-btn"
          >
            {isSaving ? (
              <>
                <Spinner className="h-4 w-4 mr-2 border-2" />
                Saving…
              </>
            ) : (
              `Save${rows.length > 0 ? ` (${rows.length} ${pluralize("reviewer", rows.length)})` : ""}`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ─── Selected row card ───────────────────────────────────────────────────────

interface SelectedRowCardProps {
  row: SelectedRow;
  onFieldChange: (
    id: string,
    field: "name" | "email" | "telegram" | "slack",
    value: string
  ) => void;
  onToggleRole: (id: string, role: ReviewerRoleSelection) => void;
  onRemove: (id: string) => void;
}

const SelectedRowCard = memo(function SelectedRowCard({
  row,
  onFieldChange,
  onToggleRole,
  onRemove,
}: SelectedRowCardProps) {
  const isPool = row.kind === "pool";
  const hasError = !!row.error;
  const dirty = isPool && isRowDirty(row);

  return (
    <div
      className={cn(
        "rounded-lg border bg-white dark:bg-gray-900/60 p-3",
        hasError ? "border-red-300 dark:border-red-700" : "border-gray-200 dark:border-gray-700"
      )}
      data-testid={`selected-row-${row.id}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          {isPool ? (
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                {row.name || row.email}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{row.email}</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <Input
                value={row.name}
                onChange={(e) => onFieldChange(row.id, "name", e.target.value)}
                placeholder="Name *"
                className="h-9 text-sm"
                aria-label="Reviewer name"
              />
              <Input
                value={row.email}
                onChange={(e) => onFieldChange(row.id, "email", e.target.value)}
                placeholder="Email *"
                className="h-9 text-sm"
                aria-label="Reviewer email"
              />
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={() => onRemove(row.id)}
          className="p-1 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
          aria-label="Remove reviewer"
          data-testid={`remove-row-${row.id}`}
        >
          <XMarkIcon className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-2 grid grid-cols-2 gap-2">
        <Input
          value={row.telegram}
          onChange={(e) => onFieldChange(row.id, "telegram", e.target.value)}
          placeholder="Telegram (optional)"
          className="h-8 text-xs"
          aria-label="Telegram"
        />
        <Input
          value={row.slack}
          onChange={(e) => onFieldChange(row.id, "slack", e.target.value)}
          placeholder="Slack (optional)"
          className="h-8 text-xs"
          aria-label="Slack"
        />
      </div>

      <div className="mt-2 flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-3">
          <label
            htmlFor={`role-program-${row.id}`}
            className="inline-flex items-center gap-1.5 text-xs text-gray-700 dark:text-gray-300 cursor-pointer"
          >
            <Checkbox
              id={`role-program-${row.id}`}
              checked={row.roles.includes("program")}
              onCheckedChange={() => onToggleRole(row.id, "program")}
              aria-label="App reviewer role"
            />
            App reviewer
          </label>
          <label
            htmlFor={`role-milestone-${row.id}`}
            className="inline-flex items-center gap-1.5 text-xs text-gray-700 dark:text-gray-300 cursor-pointer"
          >
            <Checkbox
              id={`role-milestone-${row.id}`}
              checked={row.roles.includes("milestone")}
              onCheckedChange={() => onToggleRole(row.id, "milestone")}
              aria-label="Milestone reviewer role"
            />
            Milestone reviewer
          </label>
        </div>
        {dirty && (
          <span className="text-[10px] text-amber-700 dark:text-amber-400">
            Contact edits apply across all programs.
          </span>
        )}
      </div>

      {hasError && (
        <p
          className="mt-2 text-xs text-red-600 dark:text-red-400"
          data-testid={`row-error-${row.id}`}
        >
          {row.error}
        </p>
      )}
    </div>
  );
});

export default ReviewerPickerModal;

// Re-export the helper so other modules can derive role from API types
export { roleSelectionFromCommunityRole };
