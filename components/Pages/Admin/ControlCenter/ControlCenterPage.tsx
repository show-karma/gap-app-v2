"use client";

import { BanknotesIcon } from "@heroicons/react/24/outline";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { Skeleton } from "@/components/Utilities/Skeleton";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import {
  type CommunityPayoutsSorting,
  CreateDisbursementModal,
  type GrantDisbursementInfo,
  getPaidAllocationIds,
  PayoutConfigurationModal,
  PayoutHistoryDrawer,
} from "@/src/features/payout-disbursement";
import { MESSAGES } from "@/utilities/messages";
import { PAGES } from "@/utilities/pages";
import { cn } from "@/utilities/tailwind";
import type { TableRow } from "./ControlCenterTable";
import { ControlCenterTable } from "./ControlCenterTable";
import { FilterToolbar } from "./FilterToolbar";
import { ProjectDetailsModal } from "./ProjectDetailsModal";
import { useControlCenterData } from "./useControlCenterData";

// ─── Main component ──────────────────────────────────────────────────────────

export function ControlCenterPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { ready: authReady } = useAuth();
  const params = useParams();
  const communityId = params.communityId as string;

  // URL-driven state
  const selectedProgramId = searchParams.get("programId");
  const itemsPerPage = Number(searchParams.get("limit")) || 25;
  const currentPage = Number(searchParams.get("page")) || 1;
  const searchQuery = searchParams.get("search") || "";
  const sortBy = (searchParams.get("sortBy") as CommunityPayoutsSorting["sortBy"]) || undefined;
  const sortOrder = (searchParams.get("sortOrder") as "asc" | "desc") || undefined;
  const agreementFilter = searchParams.get("agreementStatus") as
    | "signed"
    | "not_signed"
    | undefined;
  const invoiceFilter = searchParams.get("invoiceStatus") as
    | "all_received"
    | "needs_invoices"
    | "has_invoices"
    | undefined;
  const disbursementFilter = searchParams.get("status") as
    | "NOT_STARTED"
    | "IN_PROGRESS"
    | "COMPLETED"
    | undefined;
  const kycFilter = searchParams.get("kycStatus") || undefined;
  const filterSignature = JSON.stringify({
    selectedProgramId,
    agreementFilter,
    invoiceFilter,
    disbursementFilter,
    kycFilter,
    searchQuery,
  });

  // Local state
  const [localSearch, setLocalSearch] = useState(searchQuery);
  const [selectedGrants, setSelectedGrants] = useState<Set<string>>(new Set());

  // Sync localSearch when URL changes (browser back/forward)
  useEffect(() => {
    setLocalSearch(searchQuery);
  }, [searchQuery]);

  // Clear selections when filters, page, or program change
  useEffect(() => {
    setSelectedGrants(new Set());
  }, [
    currentPage,
    selectedProgramId,
    agreementFilter,
    invoiceFilter,
    disbursementFilter,
    kycFilter,
    searchQuery,
  ]);

  // Modal states
  const [isDisbursementModalOpen, setIsDisbursementModalOpen] = useState(false);
  const [grantsForDisbursement, setGrantsForDisbursement] = useState<GrantDisbursementInfo[]>([]);

  const [isHistoryDrawerOpen, setIsHistoryDrawerOpen] = useState(false);
  const [historyGrant, setHistoryGrant] = useState<{
    grantUID: string;
    grantName: string;
    projectName: string;
    approvedAmount?: string;
  } | null>(null);

  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [configGrant, setConfigGrant] = useState<{
    grantUID: string;
    projectUID: string;
    grantName: string;
    projectName: string;
  } | null>(null);

  // Details modal state
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [detailsModalGrant, setDetailsModalGrant] = useState<TableRow | null>(null);

  // URL param helper
  const createQueryString = useCallback(
    (updates: Record<string, string | null>) => {
      const newParams = new URLSearchParams(searchParams.toString());
      Object.entries(updates).forEach(([key, value]) => {
        if (value === null || value === "") {
          newParams.delete(key);
        } else {
          newParams.set(key, value);
        }
      });
      return newParams.toString();
    },
    [searchParams]
  );

  const previousFilterSignature = useRef(filterSignature);

  // Safety net: whenever any filter changes, force page back to 1.
  // This covers cases where a child component updates query params directly.
  useEffect(() => {
    if (previousFilterSignature.current === filterSignature) {
      return;
    }

    previousFilterSignature.current = filterSignature;

    if (currentPage === 1) {
      return;
    }

    const query = createQueryString({ page: "1" });
    router.replace(`${pathname}?${query}`);
  }, [createQueryString, currentPage, filterSignature, pathname, router]);

  // ─── Data fetching (extracted hook) ───────────────────────────────────────

  const {
    community,
    isLoadingCommunity,
    communityError,
    hasAccess,
    loadingAdmin,
    isLoadingPayouts,
    payoutsError,
    payoutsData,
    refreshPayouts,
    totalItems,
    paginatedData,
    selectableGrants,
    disbursementMap,
    agreementMap,
    invoiceMap,
    paidMilestoneCountMap,
    invoiceRequiredMap,
    payoutConfigMap,
    hasInvoicePrograms,
    isKycEnabled,
    isLoadingKycStatuses,
    kycStatuses,
    getCheckboxDisabledState,
  } = useControlCenterData(communityId, authReady, {
    programId: selectedProgramId,
    agreementFilter,
    invoiceFilter,
    disbursementFilter,
    kycFilter,
    searchQuery,
    sortBy,
    sortOrder,
    currentPage,
    itemsPerPage,
  });

  // ─── URL param handlers ──────────────────────────────────────────────────

  const handleProgramChange = (programId: string | null) => {
    const query = createQueryString({ programId, page: "1" });
    router.push(`${pathname}?${query}`);
  };

  const handleItemsPerPageChange = (value: string) => {
    const query = createQueryString({ limit: value, page: "1" });
    router.push(`${pathname}?${query}`);
  };

  const handlePageChange = (page: number) => {
    const query = createQueryString({ page: page.toString() });
    router.push(`${pathname}?${query}`);
  };

  const handleSort = (column: CommunityPayoutsSorting["sortBy"]) => {
    let newSortOrder: "asc" | "desc" = "asc";
    if (sortBy === column) {
      newSortOrder = sortOrder === "asc" ? "desc" : "asc";
    }
    const query = createQueryString({
      sortBy: column || null,
      sortOrder: newSortOrder,
      page: "1",
    });
    router.push(`${pathname}?${query}`);
  };

  const handleSearch = () => {
    const query = createQueryString({ search: localSearch || null, page: "1" });
    router.push(`${pathname}?${query}`);
  };

  const handleFilterChange = (key: string, value: string | null) => {
    const query = createQueryString({ [key]: value, page: "1" });
    router.push(`${pathname}?${query}`);
  };

  // ─── Selection handlers ──────────────────────────────────────────────────

  const handleSelectGrant = (uid: string, checked: boolean) => {
    setSelectedGrants((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(uid);
      } else {
        next.delete(uid);
      }
      return next;
    });
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedGrants(new Set(selectableGrants.map((item) => item.grantUid)));
    } else {
      setSelectedGrants(new Set());
    }
  };

  // ─── Modal handlers ──────────────────────────────────────────────────────

  const handleOpenDisbursementModal = () => {
    const selectedItems = paginatedData.filter(
      (item) => selectedGrants.has(item.grantUid) && !getCheckboxDisabledState(item).disabled
    );

    if (selectedItems.length === 0) {
      toast.error("Please select grants with valid payout addresses and amounts");
      return;
    }

    const grantsInfo: GrantDisbursementInfo[] = selectedItems.map((item) => {
      const payoutAddress = item.currentPayoutAddress || "";
      const approvedAmount = item.currentAmount || "0";

      const payoutConfig = payoutConfigMap[item.grantUid];
      const milestoneAllocations = payoutConfig?.milestoneAllocations || [];

      const disbursementHistory = disbursementMap[item.grantUid]?.history || [];
      const paidAllocationIds = getPaidAllocationIds(disbursementHistory);

      return {
        grantUID: item.grantUid,
        projectUID: item.projectUid,
        grantName: item.grantName,
        projectName: item.projectName,
        payoutAddress,
        approvedAmount,
        totalsByToken: disbursementMap[item.grantUid]?.totalsByToken || [],
        milestoneAllocations,
        paidAllocationIds,
      };
    });

    setGrantsForDisbursement(grantsInfo);
    setIsDisbursementModalOpen(true);
  };

  const handleOpenHistoryDrawer = (item: TableRow) => {
    setHistoryGrant({
      grantUID: item.grantUid,
      grantName: item.grantName,
      projectName: item.projectName,
      approvedAmount: item.currentAmount || "0",
    });
    setIsHistoryDrawerOpen(true);
  };

  const handleOpenConfigModal = (item: TableRow) => {
    setConfigGrant({
      grantUID: item.grantUid,
      projectUID: item.projectUid,
      grantName: item.grantName,
      projectName: item.projectName,
    });
    setIsConfigModalOpen(true);
  };

  const handleConfigModalClose = () => {
    setIsConfigModalOpen(false);
    setConfigGrant(null);
  };

  const handleConfigSuccess = () => {
    handleConfigModalClose();
    refreshPayouts();
  };

  const handleDisbursementModalClose = () => {
    setIsDisbursementModalOpen(false);
    setGrantsForDisbursement([]);
  };

  const handleDisbursementSuccess = () => {
    setSelectedGrants(new Set());
    refreshPayouts();
  };

  // ─── Row click → open details modal ─────────────────────────────────────

  const handleRowClick = (item: TableRow, e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest("input[type='checkbox']") || target.closest("button")) {
      return;
    }
    setDetailsModalGrant(item);
    setDetailsModalOpen(true);
  };

  // ─── Computed layout values ─────────────────────────────────────────────

  const hasActiveFilters = !!(
    agreementFilter ||
    invoiceFilter ||
    disbursementFilter ||
    kycFilter ||
    searchQuery ||
    selectedProgramId
  );

  const handleClearFilters = () => {
    setLocalSearch("");
    router.push(pathname);
  };

  // ─── Error / redirect handling ───────────────────────────────────────────

  useEffect(() => {
    if (
      communityError?.message === "Community not found" ||
      communityError?.message?.includes("422")
    ) {
      router.push(PAGES.NOT_FOUND);
    }
  }, [communityError]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Error state (checked before loading to avoid infinite skeleton) ────

  if (
    communityError &&
    !communityError.message?.includes("422") &&
    communityError.message !== "Community not found"
  ) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <p className="text-lg text-red-600 dark:text-red-400">Failed to load community data</p>
        <Button onClick={() => window.location.reload()}>Retry</Button>
      </div>
    );
  }

  // ─── Loading state ───────────────────────────────────────────────────────

  if (!authReady || isLoadingCommunity || !community || loadingAdmin || isLoadingPayouts) {
    const skeletonCols = 9;
    return (
      <div className="my-4 flex flex-col gap-6 w-full">
        <div className="flex flex-col gap-1 px-4">
          <div className="flex items-center gap-2 mb-1">
            <Skeleton className="h-4 w-40" />
          </div>
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-80 mt-1" />
        </div>

        <div className="flex flex-wrap items-center gap-3 px-4">
          <Skeleton className="h-9 w-[150px] rounded-md" />
          <Skeleton className="h-9 w-[150px] rounded-md" />
          <Skeleton className="h-9 w-[150px] rounded-md" />
          <Skeleton className="h-9 w-[150px] rounded-md" />
          <Skeleton className="h-9 w-[200px] rounded-md" />
        </div>

        <div className="px-4">
          <div className="w-full overflow-hidden rounded-lg border border-gray-200 dark:border-zinc-800">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-zinc-800">
              <thead>
                <tr className="bg-gray-50 dark:bg-zinc-900">
                  {Array.from({ length: skeletonCols }).map((_, i) => (
                    <th key={i} className="h-11 px-4">
                      <Skeleton className="h-3 w-16" />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-zinc-800 bg-white dark:bg-zinc-950">
                {Array.from({ length: 6 }).map((_, rowIdx) => (
                  <tr key={rowIdx}>
                    {Array.from({ length: skeletonCols }).map((_, colIdx) => (
                      <td key={colIdx} className="px-4 py-3">
                        <Skeleton
                          className={cn(
                            "h-4",
                            colIdx === 0 ? "w-4" : colIdx === 1 ? "w-32" : "w-20"
                          )}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // ─── Payouts error state ───────────────────────────────────────────────

  if (payoutsError && !payoutsData) {
    return (
      <div className="my-4 flex flex-col gap-6 w-full">
        <div className="flex flex-col gap-1 px-4">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-zinc-100 tracking-tight">
            Control Center
          </h1>
          <p className="text-sm text-gray-500 dark:text-zinc-400 mt-0.5">
            Overview of project KYB, agreements, milestones, invoices, and payments
          </p>
        </div>
        <div className="flex flex-col items-center justify-center h-64 gap-3">
          <p className="text-sm text-red-600 dark:text-red-400">
            Failed to load payouts data. Please try again.
          </p>
          <Button variant="outline" size="sm" onClick={refreshPayouts}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  // ─── Not authorized ──────────────────────────────────────────────────────

  if (!hasAccess) {
    return (
      <div className="flex w-full items-center justify-center h-96">
        <p className="text-lg">
          {MESSAGES.ADMIN.NOT_AUTHORIZED(community?.details?.name || "Control Center")}
        </p>
      </div>
    );
  }

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="my-4 flex flex-col gap-6 w-full">
      {/* Page Header */}
      <div className="flex flex-col gap-1 px-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-zinc-100 tracking-tight">
              Control Center
            </h1>
            <p className="text-sm text-gray-500 dark:text-zinc-400 mt-0.5">
              Overview of project KYB, agreements, milestones, invoices, and payments
            </p>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <FilterToolbar
        localSearch={localSearch}
        onLocalSearchChange={setLocalSearch}
        onSearch={handleSearch}
        onProgramChange={handleProgramChange}
        agreementFilter={agreementFilter}
        invoiceFilter={invoiceFilter}
        disbursementFilter={disbursementFilter}
        kycFilter={kycFilter}
        isKycEnabled={isKycEnabled}
        hasInvoicePrograms={hasInvoicePrograms}
        searchQuery={searchQuery}
        onFilterChange={handleFilterChange}
        onClearSearch={() => {
          setLocalSearch("");
          handleFilterChange("search", null);
        }}
        onClearAll={handleClearFilters}
        itemsPerPage={itemsPerPage}
        onItemsPerPageChange={handleItemsPerPageChange}
      />

      {/* Table */}
      <ControlCenterTable
        paginatedData={paginatedData}
        selectedGrants={selectedGrants}
        selectableGrants={selectableGrants}
        onSelectGrant={handleSelectGrant}
        onSelectAll={handleSelectAll}
        onRowClick={handleRowClick}
        onSort={handleSort}
        sortBy={sortBy}
        sortOrder={sortOrder}
        isKycEnabled={isKycEnabled}
        isLoadingKycStatuses={isLoadingKycStatuses}
        kycStatuses={kycStatuses}
        disbursementMap={disbursementMap}
        agreementMap={agreementMap}
        invoiceMap={invoiceMap}
        paidMilestoneCountMap={paidMilestoneCountMap}
        invoiceRequiredMap={invoiceRequiredMap}
        getCheckboxDisabledState={getCheckboxDisabledState}
        onOpenConfigModal={handleOpenConfigModal}
        hasActiveFilters={hasActiveFilters}
        onClearFilters={handleClearFilters}
        currentPage={currentPage}
        onPageChange={handlePageChange}
        itemsPerPage={itemsPerPage}
        totalItems={kycFilter ? paginatedData.length : totalItems}
      />

      {/* Create Disbursement Modal */}
      <CreateDisbursementModal
        isOpen={isDisbursementModalOpen}
        onClose={handleDisbursementModalClose}
        communityUID={community?.uid || ""}
        grants={grantsForDisbursement}
        onSuccess={handleDisbursementSuccess}
      />

      {/* Payout History Drawer */}
      {historyGrant && (
        <PayoutHistoryDrawer
          isOpen={isHistoryDrawerOpen}
          onClose={() => {
            setIsHistoryDrawerOpen(false);
            setHistoryGrant(null);
          }}
          grantUID={historyGrant.grantUID}
          grantName={historyGrant.grantName}
          projectName={historyGrant.projectName}
          approvedAmount={historyGrant.approvedAmount}
        />
      )}

      {/* Payout Configuration Modal */}
      {configGrant && (
        <PayoutConfigurationModal
          isOpen={isConfigModalOpen}
          onClose={handleConfigModalClose}
          grantUID={configGrant.grantUID}
          projectUID={configGrant.projectUID}
          communityUID={community?.uid || ""}
          grantName={configGrant.grantName}
          projectName={configGrant.projectName}
          onSuccess={handleConfigSuccess}
        />
      )}

      {/* Project Details Modal */}
      <ProjectDetailsModal
        grant={detailsModalGrant}
        open={detailsModalOpen}
        onOpenChange={setDetailsModalOpen}
        communityUID={community?.uid || ""}
        invoiceRequired={
          detailsModalGrant ? (invoiceRequiredMap[detailsModalGrant.grantUid] ?? false) : false
        }
        kycStatus={
          detailsModalGrant ? (kycStatuses.get(detailsModalGrant.projectUid) ?? null) : null
        }
        disbursementInfo={
          detailsModalGrant ? (disbursementMap[detailsModalGrant.grantUid] ?? null) : null
        }
        agreement={detailsModalGrant ? (agreementMap[detailsModalGrant.grantUid] ?? null) : null}
        milestoneInvoices={detailsModalGrant ? (invoiceMap[detailsModalGrant.grantUid] ?? []) : []}
        milestoneAllocations={
          detailsModalGrant
            ? (payoutConfigMap[detailsModalGrant.grantUid]?.milestoneAllocations ?? null)
            : null
        }
        onOpenConfigModal={() => {
          if (!detailsModalGrant) return;
          setDetailsModalOpen(false);
          handleOpenConfigModal(detailsModalGrant);
        }}
        onOpenHistoryDrawer={() => {
          if (!detailsModalGrant) return;
          setDetailsModalOpen(false);
          handleOpenHistoryDrawer(detailsModalGrant);
        }}
        onCreateDisbursement={() => {
          if (!detailsModalGrant) return;
          setDetailsModalOpen(false);
          const item = detailsModalGrant;
          const payoutConfig = payoutConfigMap[item.grantUid];
          const disbursementHistory = disbursementMap[item.grantUid]?.history || [];
          setGrantsForDisbursement([
            {
              grantUID: item.grantUid,
              projectUID: item.projectUid,
              grantName: item.grantName,
              projectName: item.projectName,
              payoutAddress: item.currentPayoutAddress || "",
              approvedAmount: item.currentAmount || "0",
              totalsByToken: disbursementMap[item.grantUid]?.totalsByToken || [],
              milestoneAllocations: payoutConfig?.milestoneAllocations || [],
              paidAllocationIds: getPaidAllocationIds(disbursementHistory),
            },
          ]);
          setIsDisbursementModalOpen(true);
        }}
      />

      {/* Floating Create Disbursement Button */}
      {selectedGrants.size > 0 && (
        <div className="fixed bottom-6 right-6 z-40 animate-in slide-in-from-bottom-4 fade-in duration-300">
          <button
            type="button"
            onClick={handleOpenDisbursementModal}
            className="flex items-center gap-3 px-6 py-4 bg-brand-blue hover:bg-brand-blue/80 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 text-base font-semibold"
          >
            <BanknotesIcon className="h-6 w-6" />
            Create Disbursement ({selectedGrants.size})
          </button>
        </div>
      )}
    </div>
  );
}
