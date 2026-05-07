"use client";

import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { TableRow } from "@/components/Pages/Admin/ControlCenter/ControlCenterTable";
import { ControlCenterTable } from "@/components/Pages/Admin/ControlCenter/ControlCenterTable";
import { FilterToolbar } from "@/components/Pages/Admin/ControlCenter/FilterToolbar";
import { PageHero } from "@/components/Pages/Communities/PageHero";
import { Skeleton } from "@/components/Utilities/Skeleton";
import { Button } from "@/components/ui/button";
import { useCommunityDetails } from "@/hooks/communities/useCommunityDetails";
import { useKycBatchStatusesPublic, useKycConfig } from "@/hooks/useKycStatus";
import type {
  AggregatedDisbursementStatus,
  CommunityPayoutAgreementInfo,
  CommunityPayoutInvoiceInfo,
  CommunityPayoutsOptions,
  CommunityPayoutsSorting,
  PayoutDisbursement,
  PayoutGrantConfig,
  TokenTotal,
} from "@/src/features/payout-disbursement";
import {
  useCommunityPayoutsPublic,
  usePayoutConfigsByCommunityPublic,
} from "@/src/features/payout-disbursement/hooks/use-payout-disbursement";
import { PAGES } from "@/utilities/pages";
import { cn } from "@/utilities/tailwind";
import { PublicProjectDetailsModal } from "./PublicProjectDetailsModal";

interface DisbursementMapEntry {
  totalsByToken: TokenTotal[];
  status: string;
  history: PayoutDisbursement[];
}

const SKELETON_COL_KEYS = Array.from({ length: 7 }, (_, i) => `skeleton-col-${i + 1}`);
const SKELETON_ROW_KEYS = Array.from({ length: 6 }, (_, i) => `skeleton-row-${i + 1}`);

// Stable empty Map to avoid re-renders
const EMPTY_KYC_STATUS_MAP = new Map();

function TableSkeleton() {
  return (
    <div className="px-4">
      <div className="w-full overflow-hidden rounded-lg border border-gray-200 dark:border-zinc-800">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-zinc-800">
          <thead>
            <tr className="bg-gray-50 dark:bg-zinc-900">
              {SKELETON_COL_KEYS.map((key) => (
                <th key={key} className="h-11 px-4">
                  <Skeleton className="h-3 w-16" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-zinc-800 bg-white dark:bg-zinc-950">
            {SKELETON_ROW_KEYS.map((rowKey) => (
              <tr key={rowKey}>
                {SKELETON_COL_KEYS.map((colKey, colIdx) => (
                  <td key={`${rowKey}-${colKey}`} className="px-4 py-3">
                    <Skeleton className={cn("h-4", colIdx === 0 ? "w-32" : "w-20")} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function PublicControlCenter() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
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
  const disbursementFilter = searchParams.get("status") as AggregatedDisbursementStatus | undefined;

  const filterSignature = JSON.stringify({
    selectedProgramId,
    agreementFilter,
    invoiceFilter,
    disbursementFilter,
    searchQuery,
  });

  const [localSearch, setLocalSearch] = useState(searchQuery);

  useEffect(() => {
    setLocalSearch(searchQuery);
  }, [searchQuery]);

  // Details modal state
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [detailsModalGrant, setDetailsModalGrant] = useState<TableRow | null>(null);

  // URL param helper
  const createQueryString = useCallback(
    (updates: Record<string, string | null>) => {
      const newParams = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === "") {
          newParams.delete(key);
        } else {
          newParams.set(key, value);
        }
      }
      return newParams.toString();
    },
    [searchParams]
  );

  const previousFilterSignature = useRef(filterSignature);

  useEffect(() => {
    if (previousFilterSignature.current === filterSignature) return;
    previousFilterSignature.current = filterSignature;
    if (currentPage === 1) return;
    const query = createQueryString({ page: "1" });
    router.replace(`${pathname}?${query}`);
  }, [createQueryString, currentPage, filterSignature, pathname, router]);

  // ─── Data fetching (all parallel, using slug directly) ─────────────────
  const actualProgramId = selectedProgramId?.split("_")[0] || null;

  const apiFilters = useMemo(() => {
    const f: CommunityPayoutsOptions["filters"] = {};
    if (actualProgramId) f.programId = actualProgramId;
    if (agreementFilter) f.agreementStatus = agreementFilter;
    if (invoiceFilter) f.invoiceStatus = invoiceFilter;
    if (disbursementFilter) f.status = disbursementFilter as AggregatedDisbursementStatus;
    if (searchQuery) f.search = searchQuery;
    return Object.keys(f).length > 0 ? f : undefined;
  }, [actualProgramId, agreementFilter, invoiceFilter, disbursementFilter, searchQuery]);

  const payoutsOptions: CommunityPayoutsOptions = {
    page: currentPage,
    limit: itemsPerPage,
    filters: apiFilters,
    sorting: sortBy ? { sortBy, sortOrder: sortOrder || "asc" } : undefined,
  };

  // All queries fire in parallel — no waterfalls
  const { data: community, error: communityError } = useCommunityDetails(communityId);

  const {
    data: payoutsData,
    isLoading: isLoadingPayouts,
    error: payoutsError,
    refetch: refreshPayouts,
  } = useCommunityPayoutsPublic(communityId, payoutsOptions);

  // Payout configs use UID (not slug) — wait for community details.
  // Only used in the modal, so doesn't block initial render.
  const { data: payoutConfigs } = usePayoutConfigsByCommunityPublic(community?.uid || "", {
    enabled: !!community?.uid,
  });

  const { isEnabled: isKycEnabled } = useKycConfig(communityId);

  const payouts = payoutsData?.payload || [];
  const totalItems = payoutsData?.pagination?.totalCount || 0;

  // ─── Derived table data ─────────────────────────────────────────────────
  const tableData: TableRow[] = useMemo(() => {
    return payouts.map((payout) => ({
      grantUid: payout.grant.uid,
      projectUid: payout.project.uid,
      projectName: payout.project.title,
      projectSlug: payout.project.slug,
      grantName: payout.grant.title,
      grantProgramId: payout.grant.programId || "",
      grantChainId: payout.grant.chainID,
      projectChainId: payout.project.chainID,
      currentPayoutAddress: payout.project.adminPayoutAddress || "",
      currentAmount: payout.grant.adminPayoutAmount || payout.grant.payoutAmount || "",
      currency: payout.grant.currency || undefined,
    }));
  }, [payouts]);

  // KYC batch statuses — depends on tableData (needs projectUIDs), non-blocking
  const projectUIDs = useMemo(() => tableData.map((row) => row.projectUid), [tableData]);

  const { statuses: kycStatuses, isLoading: isLoadingKycStatuses } = useKycBatchStatusesPublic(
    communityId,
    projectUIDs,
    { enabled: isKycEnabled && projectUIDs.length > 0 }
  );

  const payoutConfigMap = useMemo(() => {
    const map: Record<string, PayoutGrantConfig> = {};
    if (payoutConfigs) {
      for (const config of payoutConfigs) {
        map[config.grantUID] = config;
      }
    }
    return map;
  }, [payoutConfigs]);

  const { disbursementMap, agreementMap, invoiceMap, paidMilestoneCountMap, invoiceRequiredMap } =
    useMemo(() => {
      const dMap: Record<string, DisbursementMapEntry> = {};
      const aMap: Record<string, CommunityPayoutAgreementInfo | null> = {};
      const iMap: Record<string, CommunityPayoutInvoiceInfo[]> = {};
      const pMap: Record<string, number> = {};
      const irMap: Record<string, boolean> = {};
      for (const payout of payouts) {
        dMap[payout.grant.uid] = {
          totalsByToken: payout.disbursements.totalsByToken || [],
          status: payout.disbursements.status,
          history: payout.disbursements.history,
        };
        aMap[payout.grant.uid] = payout.agreement;
        iMap[payout.grant.uid] = payout.milestoneInvoices || [];
        pMap[payout.grant.uid] = payout.paidMilestoneCount ?? 0;
        irMap[payout.grant.uid] = payout.grant.invoiceRequired === true;
      }
      return {
        disbursementMap: dMap,
        agreementMap: aMap,
        invoiceMap: iMap,
        paidMilestoneCountMap: pMap,
        invoiceRequiredMap: irMap,
      };
    }, [payouts]);

  const hasInvoicePrograms = useMemo(
    () => Object.values(invoiceRequiredMap).some(Boolean),
    [invoiceRequiredMap]
  );

  // ─── URL param handlers ─────────────────────────────────────────────────
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

  // ─── Open details modal ────────────────────────────────────────────────
  const handleOpenDetails = (item: TableRow) => {
    setDetailsModalGrant(item);
    setDetailsModalOpen(true);
  };

  // ─── Computed layout values ───────────────────────────────────────────
  const hasActiveFilters = !!(
    agreementFilter ||
    invoiceFilter ||
    disbursementFilter ||
    searchQuery ||
    selectedProgramId
  );

  const handleClearFilters = () => {
    setLocalSearch("");
    router.push(pathname);
  };

  // ─── Error / redirect handling ────────────────────────────────────────
  useEffect(() => {
    if (
      communityError?.message === "Community not found" ||
      communityError?.message?.includes("422")
    ) {
      router.push(PAGES.NOT_FOUND);
    }
  }, [communityError]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Fatal error state (community failed to load) ─────────────────────
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

  // ─── Progressive render: header + toolbar always visible ───────────────
  return (
    <div className="my-4 flex flex-col gap-6 w-full">
      {/* Page Header — renders immediately */}
      <div className="px-4">
        <PageHero
          compact
          eyebrow="Treasury"
          title="Financials"
          description="Overview of grants, agreements, milestones, and disbursements made through programs in this community."
          kpis={[
            {
              label: "Tracked grants",
              value: totalItems,
              sub: totalItems === 1 ? "grant" : "grants",
            },
            {
              label: "Signed agreements",
              value: Object.values(agreementMap).filter((a) => a?.signed).length,
              sub: "in good standing",
              accent: "success",
            },
            {
              label: "Disbursements",
              value: Object.values(disbursementMap).filter((d) => d.history && d.history.length > 0)
                .length,
              sub: "with payouts on-chain",
            },
            {
              label: "Awaiting action",
              value: Object.values(disbursementMap).filter((d) => d.status === "pending").length,
              sub: "pending review",
              accent: "warning",
            },
          ]}
        />
      </div>

      {/* Toolbar — renders immediately */}
      <FilterToolbar
        localSearch={localSearch}
        onLocalSearchChange={setLocalSearch}
        onSearch={handleSearch}
        onProgramChange={handleProgramChange}
        agreementFilter={agreementFilter}
        invoiceFilter={invoiceFilter}
        disbursementFilter={disbursementFilter}
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

      {/* Table — skeleton only while payouts load; community details don't block */}
      {isLoadingPayouts ? (
        <TableSkeleton />
      ) : payoutsError && !payoutsData ? (
        <div className="flex flex-col items-center justify-center h-64 gap-3">
          <p className="text-sm text-red-600 dark:text-red-400">
            Failed to load payouts data. Please try again.
          </p>
          <Button variant="outline" size="sm" onClick={() => refreshPayouts()}>
            Retry
          </Button>
        </div>
      ) : (
        <ControlCenterTable
          readOnly
          paginatedData={tableData}
          onOpenDetails={handleOpenDetails}
          onSort={handleSort}
          sortBy={sortBy}
          sortOrder={sortOrder}
          isKycEnabled={isKycEnabled}
          isLoadingKycStatuses={isLoadingKycStatuses}
          kycStatuses={isKycEnabled ? kycStatuses : EMPTY_KYC_STATUS_MAP}
          disbursementMap={disbursementMap}
          agreementMap={agreementMap}
          invoiceMap={invoiceMap}
          paidMilestoneCountMap={paidMilestoneCountMap}
          invoiceRequiredMap={invoiceRequiredMap}
          hasActiveFilters={hasActiveFilters}
          onClearFilters={handleClearFilters}
          currentPage={currentPage}
          onPageChange={handlePageChange}
          itemsPerPage={itemsPerPage}
          totalItems={totalItems}
        />
      )}

      {/* Read-only Project Details Modal */}
      <PublicProjectDetailsModal
        grant={detailsModalGrant}
        open={detailsModalOpen}
        onOpenChange={setDetailsModalOpen}
        communityUID={community?.uid || communityId}
        invoiceRequired={
          detailsModalGrant ? (invoiceRequiredMap[detailsModalGrant.grantUid] ?? false) : false
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
      />
    </div>
  );
}
