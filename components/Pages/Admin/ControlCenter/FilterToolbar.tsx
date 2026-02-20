"use client";

import { XMarkIcon } from "@heroicons/react/20/solid";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { ProgramFilter } from "@/components/Pages/Communities/Impact/ProgramFilter";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// ─── Filter label maps ──────────────────────────────────────────────────────

const FILTER_LABELS: Record<string, Record<string, string>> = {
  agreementStatus: { signed: "Signed", not_signed: "Not Signed" },
  invoiceStatus: {
    all_received: "All Received",
    needs_invoices: "Needs Invoices",
    has_invoices: "In Progress",
  },
  status: { NOT_STARTED: "Not Started", IN_PROGRESS: "In Progress", COMPLETED: "Completed" },
  kycStatus: {
    NOT_STARTED: "Not Started",
    PENDING: "Pending",
    VERIFIED: "Verified",
    REJECTED: "Rejected",
    EXPIRED: "Expired",
  },
};

const FILTER_DISPLAY_NAMES: Record<string, string> = {
  agreementStatus: "Agreement",
  invoiceStatus: "Invoice",
  status: "Status",
  kycStatus: "KYB",
};

// ─── Active filter chips ─────────────────────────────────────────────────────

function ActiveFilterChips({
  agreementFilter,
  invoiceFilter,
  disbursementFilter,
  kycFilter,
  searchQuery,
  onRemoveFilter,
  onClearSearch,
  onClearAll,
}: {
  agreementFilter?: string;
  invoiceFilter?: string;
  disbursementFilter?: string;
  kycFilter?: string;
  searchQuery: string;
  onRemoveFilter: (key: string, value: string | null) => void;
  onClearSearch: () => void;
  onClearAll: () => void;
}) {
  const chips: { key: string; label: string; onRemove: () => void }[] = [];

  if (agreementFilter) {
    chips.push({
      key: "agreementStatus",
      label: `${FILTER_DISPLAY_NAMES.agreementStatus}: ${FILTER_LABELS.agreementStatus[agreementFilter] || agreementFilter}`,
      onRemove: () => onRemoveFilter("agreementStatus", null),
    });
  }
  if (invoiceFilter) {
    chips.push({
      key: "invoiceStatus",
      label: `${FILTER_DISPLAY_NAMES.invoiceStatus}: ${FILTER_LABELS.invoiceStatus[invoiceFilter] || invoiceFilter}`,
      onRemove: () => onRemoveFilter("invoiceStatus", null),
    });
  }
  if (disbursementFilter) {
    chips.push({
      key: "status",
      label: `${FILTER_DISPLAY_NAMES.status}: ${FILTER_LABELS.status[disbursementFilter] || disbursementFilter}`,
      onRemove: () => onRemoveFilter("status", null),
    });
  }
  if (kycFilter) {
    chips.push({
      key: "kycStatus",
      label: `${FILTER_DISPLAY_NAMES.kycStatus}: ${FILTER_LABELS.kycStatus[kycFilter] || kycFilter}`,
      onRemove: () => onRemoveFilter("kycStatus", null),
    });
  }
  if (searchQuery) {
    chips.push({
      key: "search",
      label: `Search: ${searchQuery}`,
      onRemove: onClearSearch,
    });
  }

  if (chips.length === 0) return null;

  return (
    <>
      {chips.map((chip) => (
        <span
          key={chip.key}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 text-xs font-medium"
        >
          {chip.label}
          <button
            onClick={chip.onRemove}
            className="ml-0.5 hover:text-blue-900 dark:hover:text-blue-100 transition-colors"
            aria-label={`Remove ${chip.label} filter`}
          >
            <XMarkIcon className="h-3 w-3" />
          </button>
        </span>
      ))}
      {chips.length >= 2 && (
        <button
          onClick={onClearAll}
          className="text-xs text-gray-500 hover:text-gray-700 dark:text-zinc-400 dark:hover:text-zinc-200 underline ml-1"
        >
          Clear all
        </button>
      )}
    </>
  );
}

// ─── FilterToolbar ───────────────────────────────────────────────────────────

export interface FilterToolbarProps {
  localSearch: string;
  onLocalSearchChange: (value: string) => void;
  onSearch: () => void;
  onProgramChange: (programId: string | null) => void;
  agreementFilter?: string;
  invoiceFilter?: string;
  disbursementFilter?: string;
  kycFilter?: string;
  isKycEnabled: boolean;
  searchQuery: string;
  onFilterChange: (key: string, value: string | null) => void;
  onClearSearch: () => void;
  onClearAll: () => void;
  itemsPerPage: number;
  onItemsPerPageChange: (value: string) => void;
}

export function FilterToolbar({
  localSearch,
  onLocalSearchChange,
  onSearch,
  onProgramChange,
  agreementFilter,
  invoiceFilter,
  disbursementFilter,
  kycFilter,
  isKycEnabled,
  searchQuery,
  onFilterChange,
  onClearSearch,
  onClearAll,
  itemsPerPage,
  onItemsPerPageChange,
}: FilterToolbarProps) {
  return (
    <>
      {/* Row 1: Primary controls */}
      <div className="flex items-center justify-between gap-4 px-4 pb-3 border-b border-gray-100 dark:border-zinc-800/50">
        <ProgramFilter onChange={onProgramChange} />

        <div className="relative flex-shrink-0 w-[280px]">
          <MagnifyingGlassIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            value={localSearch}
            onChange={(e) => onLocalSearchChange(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onSearch()}
            placeholder="Search projects..."
            className="pl-8 h-9 w-full text-sm bg-white dark:bg-zinc-900"
          />
        </div>
      </div>

      {/* Row 2: Secondary filters + entries */}
      <div className="flex items-center justify-between gap-3 px-4 -mt-3">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Agreement filter */}
          <Select
            value={agreementFilter || "all"}
            onValueChange={(v) => onFilterChange("agreementStatus", v === "all" ? null : v)}
          >
            <SelectTrigger className="w-[140px] bg-white dark:bg-zinc-900 h-8 text-xs text-gray-600 dark:text-zinc-400">
              <SelectValue placeholder="Agreement" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Agreements</SelectItem>
              <SelectItem value="signed">Signed</SelectItem>
              <SelectItem value="not_signed">Not Signed</SelectItem>
            </SelectContent>
          </Select>

          {/* Invoice filter */}
          <Select
            value={invoiceFilter || "all"}
            onValueChange={(v) => onFilterChange("invoiceStatus", v === "all" ? null : v)}
          >
            <SelectTrigger className="w-[140px] bg-white dark:bg-zinc-900 h-8 text-xs text-gray-600 dark:text-zinc-400">
              <SelectValue placeholder="Invoices" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Invoices</SelectItem>
              <SelectItem value="all_received">All Received</SelectItem>
              <SelectItem value="needs_invoices">Needs Invoices</SelectItem>
              <SelectItem value="has_invoices">In Progress</SelectItem>
            </SelectContent>
          </Select>

          {/* Disbursement status filter */}
          <Select
            value={disbursementFilter || "all"}
            onValueChange={(v) => onFilterChange("status", v === "all" ? null : v)}
          >
            <SelectTrigger className="w-[140px] bg-white dark:bg-zinc-900 h-8 text-xs text-gray-600 dark:text-zinc-400">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="NOT_STARTED">Not Started</SelectItem>
              <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
              <SelectItem value="COMPLETED">Completed</SelectItem>
            </SelectContent>
          </Select>

          {/* KYB filter */}
          {isKycEnabled && (
            <Select
              value={kycFilter || "all"}
              onValueChange={(v) => onFilterChange("kycStatus", v === "all" ? null : v)}
            >
              <SelectTrigger className="w-[140px] bg-white dark:bg-zinc-900 h-8 text-xs text-gray-600 dark:text-zinc-400">
                <SelectValue placeholder="KYB" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All KYB</SelectItem>
                <SelectItem value="NOT_STARTED">Not Started</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="VERIFIED">Verified</SelectItem>
                <SelectItem value="REJECTED">Rejected</SelectItem>
                <SelectItem value="EXPIRED">Expired</SelectItem>
              </SelectContent>
            </Select>
          )}

          {/* Active filter chips */}
          <ActiveFilterChips
            agreementFilter={agreementFilter}
            invoiceFilter={invoiceFilter}
            disbursementFilter={disbursementFilter}
            kycFilter={kycFilter}
            searchQuery={searchQuery}
            onRemoveFilter={onFilterChange}
            onClearSearch={onClearSearch}
            onClearAll={onClearAll}
          />
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-xs text-gray-500 dark:text-zinc-400">Show</span>
          <Select value={itemsPerPage.toString()} onValueChange={onItemsPerPageChange}>
            <SelectTrigger className="w-[60px] bg-white dark:bg-zinc-900 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="20">20</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
              <SelectItem value="200">200</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-xs text-gray-500 dark:text-zinc-400">entries</span>
        </div>
      </div>
    </>
  );
}
