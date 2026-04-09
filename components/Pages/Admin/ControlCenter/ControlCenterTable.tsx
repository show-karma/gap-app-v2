"use client";

import { Cog6ToothIcon } from "@heroicons/react/24/outline";
import { memo } from "react";
import { KycStatusBadge } from "@/components/KycStatusIcon";
import { Spinner } from "@/components/Utilities/Spinner";
import TablePagination from "@/components/Utilities/TablePagination";
import type {
  CommunityPayoutAgreementInfo,
  CommunityPayoutInvoiceInfo,
  CommunityPayoutsSorting,
  TokenTotal,
} from "@/src/features/payout-disbursement";
import { formatDisplayAmount, TokenBreakdown } from "@/src/features/payout-disbursement";
import type { KycStatusResponse } from "@/types/kyc";
import { formatAddressForDisplay } from "@/utilities/donations/helpers";
import { cn } from "@/utilities/tailwind";
import { SortIcon } from "./ControlCenterColumns";
import { AgreementBadge, PendingDisbursalBadge, ProgressCell } from "./StatusBadges";

export interface TableRow {
  grantUid: string;
  projectUid: string;
  projectName: string;
  projectSlug: string;
  grantName: string;
  grantProgramId: string;
  grantChainId: number;
  projectChainId: number;
  currentPayoutAddress?: string;
  currentAmount?: string;
  currency?: string;
}

interface DisbursementMapEntry {
  totalsByToken: TokenTotal[];
  status: string;
}

// ─── Memoized table row ──────────────────────────────────────────────────────

interface ControlCenterTableRowProps {
  item: TableRow;
  isSelected: boolean;
  checkboxDisabled: boolean;
  checkboxReason: string | null;
  isFullyDisbursed: boolean;
  agreement: CommunityPayoutAgreementInfo | null;
  invoices: CommunityPayoutInvoiceInfo[];
  totalsByToken: TokenTotal[];
  paidMilestoneCount: number;
  invoiceRequired: boolean;
  isKycEnabled: boolean;
  isLoadingKycStatuses: boolean;
  kycStatus: KycStatusResponse | null;
  onSelectGrant?: (uid: string, checked: boolean) => void;
  onOpenDetails: (item: TableRow) => void;
  readOnly?: boolean;
}

const ControlCenterTableRow = memo(function ControlCenterTableRow({
  item,
  isSelected,
  checkboxDisabled,
  checkboxReason,
  isFullyDisbursed,
  agreement,
  invoices,
  totalsByToken,
  paidMilestoneCount,
  invoiceRequired,
  isKycEnabled,
  isLoadingKycStatuses,
  kycStatus,
  onSelectGrant,
  onOpenDetails,
  readOnly,
}: ControlCenterTableRowProps) {
  return (
    <tr
      key={`${item.grantUid}-${item.projectUid}`}
      className={cn(
        "transition-colors",
        isSelected && "bg-blue-50 dark:bg-blue-900/20",
        isFullyDisbursed && "bg-green-50/50 dark:bg-green-900/10",
        checkboxDisabled && !isFullyDisbursed && "bg-gray-50/50 dark:bg-zinc-900/50"
      )}
    >
      {/* Checkbox */}
      {!readOnly && (
        <td className="px-2 py-3 text-center">
          <input
            type="checkbox"
            className={cn(
              "h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500",
              checkboxDisabled && "opacity-50 cursor-not-allowed"
            )}
            checked={isSelected}
            onChange={(e) => onSelectGrant?.(item.grantUid, e.target.checked)}
            disabled={checkboxDisabled}
            title={checkboxReason || "Select for disbursement"}
          />
        </td>
      )}

      {/* Project */}
      <td className="px-4 py-3">
        <div>
          <span
            className="font-medium text-gray-900 dark:text-zinc-100 text-sm group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate max-w-[250px] block"
            title={item.projectName}
          >
            {item.projectName}
          </span>
          <p
            className="text-xs text-gray-500 dark:text-zinc-500 mt-0.5 truncate max-w-[250px]"
            title={item.grantName}
          >
            {item.grantName}
          </p>
        </div>
      </td>

      {/* KYB */}
      {isKycEnabled && (
        <td className="px-4 py-3 text-left">
          {isLoadingKycStatuses ? (
            <Spinner className="w-4 h-4" />
          ) : (
            <KycStatusBadge status={kycStatus} showValidityInLabel={false} className="px-2.5" />
          )}
        </td>
      )}

      {/* Agreement */}
      <td className="px-4 py-3 text-left">
        <AgreementBadge agreement={agreement} />
      </td>

      {/* Payout Address */}
      <td className="px-4 py-3">
        <span
          className="font-mono text-sm text-gray-700 dark:text-gray-300"
          title={item.currentPayoutAddress || "Not configured"}
        >
          {item.currentPayoutAddress ? (
            formatAddressForDisplay(item.currentPayoutAddress)
          ) : (
            <span className="text-gray-400 dark:text-zinc-600">&mdash;</span>
          )}
        </span>
      </td>

      {/* Progress */}
      <td className="px-4 py-3 text-left">
        <div className="space-y-1">
          <ProgressCell
            invoices={invoices}
            paidMilestoneCount={paidMilestoneCount}
            invoiceRequired={invoiceRequired}
          />
          <PendingDisbursalBadge invoices={invoices} />
        </div>
      </td>

      {/* Total Grant */}
      <td className="px-4 py-3 text-right tabular-nums text-sm font-medium text-gray-900 dark:text-zinc-100">
        {item.currentAmount && parseFloat(item.currentAmount) > 0 ? (
          formatDisplayAmount(item.currentAmount, 6)
        ) : (
          <span className="text-gray-400 dark:text-zinc-600">&mdash;</span>
        )}
      </td>

      {/* Disbursed */}
      <td className="px-4 py-3 text-right">
        <TokenBreakdown totalsByToken={totalsByToken} size="sm" />
      </td>

      {/* Actions */}
      <td className="px-2 py-3 text-center w-12">
        <button
          type="button"
          onClick={() => onOpenDetails(item)}
          className="p-1.5 rounded-md text-gray-400 hover:text-gray-700 dark:text-zinc-500 dark:hover:text-zinc-200 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
          aria-label={`Open details for ${item.projectName}`}
        >
          <Cog6ToothIcon className="h-5 w-5" />
        </button>
      </td>
    </tr>
  );
});

// ─── Table ───────────────────────────────────────────────────────────────────

export interface ControlCenterTableProps {
  paginatedData: TableRow[];
  selectedGrants?: Set<string>;
  selectableGrants?: TableRow[];
  onSelectGrant?: (uid: string, checked: boolean) => void;
  onSelectAll?: (checked: boolean) => void;
  onOpenDetails: (item: TableRow) => void;
  onSort: (column: CommunityPayoutsSorting["sortBy"]) => void;
  sortBy?: CommunityPayoutsSorting["sortBy"];
  sortOrder?: "asc" | "desc";
  isKycEnabled: boolean;
  isLoadingKycStatuses: boolean;
  kycStatuses: Map<string, KycStatusResponse | null>;
  disbursementMap: Record<string, DisbursementMapEntry>;
  agreementMap: Record<string, CommunityPayoutAgreementInfo | null>;
  invoiceMap: Record<string, CommunityPayoutInvoiceInfo[]>;
  paidMilestoneCountMap: Record<string, number>;
  invoiceRequiredMap: Record<string, boolean>;
  getCheckboxDisabledState?: (item: TableRow) => { disabled: boolean; reason: string | null };
  hasActiveFilters: boolean;
  onClearFilters: () => void;
  readOnly?: boolean;
  // Pagination
  currentPage: number;
  onPageChange: (page: number) => void;
  itemsPerPage: number;
  totalItems: number;
}

export function ControlCenterTable({
  paginatedData,
  selectedGrants,
  selectableGrants,
  onSelectGrant,
  onSelectAll,
  onOpenDetails,
  onSort,
  sortBy,
  sortOrder,
  isKycEnabled,
  isLoadingKycStatuses,
  kycStatuses,
  disbursementMap,
  agreementMap,
  invoiceMap,
  paidMilestoneCountMap,
  invoiceRequiredMap,
  getCheckboxDisabledState,
  hasActiveFilters,
  onClearFilters,
  readOnly,
  currentPage,
  onPageChange,
  itemsPerPage,
  totalItems,
}: ControlCenterTableProps) {
  const columnCount = 8 + (isKycEnabled ? 1 : 0) - (readOnly ? 1 : 0);

  return (
    <div className="px-4">
      <div className="w-full overflow-x-auto rounded-lg border border-gray-200 dark:border-zinc-800">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-zinc-800">
          <thead>
            <tr className="bg-gray-50 dark:bg-zinc-900">
              {/* Checkbox */}
              {!readOnly && (
                <th className="h-11 px-2 text-center align-middle w-12">
                  <input
                    type="checkbox"
                    className={cn(
                      "h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500",
                      (selectableGrants?.length ?? 0) === 0 && "opacity-50 cursor-not-allowed"
                    )}
                    checked={
                      (selectableGrants?.length ?? 0) > 0 &&
                      (selectableGrants ?? []).every((p) => selectedGrants?.has(p.grantUid))
                    }
                    onChange={(e) => onSelectAll?.(e.target.checked)}
                    disabled={(selectableGrants?.length ?? 0) === 0}
                    title={
                      (selectableGrants?.length ?? 0) === 0
                        ? "No grants have valid payout address and amount"
                        : `Select all ${selectableGrants?.length ?? 0} eligible grants`
                    }
                  />
                </th>
              )}
              {/* Project - sortable */}
              <th
                className="h-11 px-4 text-left text-xs font-semibold text-gray-600 dark:text-zinc-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-zinc-800 select-none"
                onClick={() => onSort("project_title")}
              >
                <div className="flex items-center gap-1">
                  Project
                  <SortIcon column="project_title" sortBy={sortBy} sortOrder={sortOrder} />
                </div>
              </th>
              {/* KYB */}
              {isKycEnabled && (
                <th className="h-11 px-4 text-left text-xs font-semibold text-gray-600 dark:text-zinc-400 uppercase tracking-wider w-24">
                  KYB
                </th>
              )}
              {/* Agreement */}
              <th className="h-11 px-4 text-left text-xs font-semibold text-gray-600 dark:text-zinc-400 uppercase tracking-wider w-28">
                Agreement
              </th>
              {/* Payout Address */}
              <th className="h-11 px-4 text-left text-xs font-semibold text-gray-600 dark:text-zinc-400 uppercase tracking-wider">
                Payout Address
              </th>
              {/* Progress */}
              <th className="h-11 px-4 text-left text-xs font-semibold text-gray-600 dark:text-zinc-400 uppercase tracking-wider w-52">
                Progress
              </th>
              {/* Total Grant - sortable */}
              <th
                className="h-11 px-4 text-right text-xs font-semibold text-gray-600 dark:text-zinc-400 uppercase tracking-wider w-28 cursor-pointer hover:bg-gray-100 dark:hover:bg-zinc-800 select-none"
                onClick={() => onSort("payout_amount")}
              >
                <div className="flex items-center justify-end gap-1">
                  Total Grant
                  <SortIcon column="payout_amount" sortBy={sortBy} sortOrder={sortOrder} />
                </div>
              </th>
              {/* Disbursed - sortable */}
              <th
                className="h-11 px-4 text-right text-xs font-semibold text-gray-600 dark:text-zinc-400 uppercase tracking-wider w-32 cursor-pointer hover:bg-gray-100 dark:hover:bg-zinc-800 select-none"
                onClick={() => onSort("disbursed_amount")}
              >
                <div className="flex items-center justify-end gap-1">
                  Disbursed
                  <SortIcon column="disbursed_amount" sortBy={sortBy} sortOrder={sortOrder} />
                </div>
              </th>
              {/* Actions */}
              <th className="h-11 px-2 w-12" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-zinc-800 bg-white dark:bg-zinc-950">
            {paginatedData.map((item) => {
              const disbursementInfo = disbursementMap[item.grantUid];
              const checkboxState = getCheckboxDisabledState?.(item) ?? {
                disabled: false,
                reason: null,
              };

              return (
                <ControlCenterTableRow
                  key={`${item.grantUid}-${item.projectUid}`}
                  item={item}
                  isSelected={selectedGrants?.has(item.grantUid) ?? false}
                  checkboxDisabled={checkboxState.disabled}
                  checkboxReason={checkboxState.reason}
                  isFullyDisbursed={checkboxState.reason === "Fully disbursed"}
                  agreement={agreementMap[item.grantUid] ?? null}
                  invoices={invoiceMap[item.grantUid] ?? []}
                  totalsByToken={disbursementInfo?.totalsByToken || []}
                  paidMilestoneCount={paidMilestoneCountMap[item.grantUid] ?? 0}
                  invoiceRequired={invoiceRequiredMap[item.grantUid] ?? false}
                  isKycEnabled={isKycEnabled}
                  isLoadingKycStatuses={isLoadingKycStatuses}
                  kycStatus={kycStatuses.get(item.projectUid) ?? null}
                  onSelectGrant={onSelectGrant}
                  onOpenDetails={onOpenDetails}
                  readOnly={readOnly}
                />
              );
            })}

            {paginatedData.length === 0 && (
              <tr>
                <td colSpan={columnCount} className="px-4 py-12 text-center">
                  <p className="text-sm text-gray-500 dark:text-zinc-400">
                    No projects found matching your filters.
                  </p>
                  {hasActiveFilters && (
                    <button
                      onClick={onClearFilters}
                      className="mt-2 text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400"
                    >
                      Clear all filters
                    </button>
                  )}
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Pagination */}
        {totalItems > 0 && (
          <div className="dark:bg-zinc-900 border-t border-gray-200 dark:border-zinc-800">
            <TablePagination
              currentPage={currentPage}
              setCurrentPage={onPageChange}
              postsPerPage={itemsPerPage}
              totalPosts={totalItems}
            />
          </div>
        )}
      </div>
    </div>
  );
}
