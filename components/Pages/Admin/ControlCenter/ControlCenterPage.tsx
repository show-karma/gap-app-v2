"use client";

import {
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronUpIcon,
  XMarkIcon,
} from "@heroicons/react/20/solid";
import { BanknotesIcon, Cog6ToothIcon, MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { formatUnits, isAddress } from "viem";
import { KycStatusBadge } from "@/components/KycStatusIcon";
import { ProgramFilter } from "@/components/Pages/Communities/Impact/ProgramFilter";
import { Skeleton } from "@/components/Utilities/Skeleton";
import { Spinner } from "@/components/Utilities/Spinner";
import TablePagination from "@/components/Utilities/TablePagination";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useCommunityAdminAccess } from "@/hooks/communities/useCommunityAdminAccess";
import { useCommunityDetails } from "@/hooks/communities/useCommunityDetails";
import { useAuth } from "@/hooks/useAuth";
import { useKycBatchStatuses, useKycConfig } from "@/hooks/useKycStatus";
import type { PayoutDisbursement } from "@/src/features/payout-disbursement";
import {
  type AggregatedDisbursementStatus,
  type CommunityPayoutAgreementInfo,
  type CommunityPayoutInvoiceInfo,
  type CommunityPayoutsOptions,
  type CommunityPayoutsSorting,
  CreateDisbursementModal,
  type GrantDisbursementInfo,
  getPaidAllocationIds,
  type InvoiceStatus,
  PayoutConfigurationModal,
  type PayoutGrantConfig,
  PayoutHistoryDrawer,
  TokenBreakdown,
  type TokenTotal,
  useCommunityPayouts,
  usePayoutConfigsByCommunity,
} from "@/src/features/payout-disbursement";
import { MESSAGES } from "@/utilities/messages";
import { PAGES } from "@/utilities/pages";
import { cn } from "@/utilities/tailwind";
import { ProjectDetailsModal } from "./ProjectDetailsModal";

// ─── Internal types ──────────────────────────────────────────────────────────

interface DisbursementMapEntry {
  totalsByToken: TokenTotal[];
  status: string;
  history: PayoutDisbursement[];
}

interface TableRow {
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
}

// ─── Status badge helpers ────────────────────────────────────────────────────

function AgreementBadge({ agreement }: { agreement: CommunityPayoutAgreementInfo | null }) {
  const isSigned = agreement?.signed === true;
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={cn(
              "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium cursor-default",
              isSigned
                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                : "bg-gray-100 text-gray-700 dark:bg-zinc-800 dark:text-zinc-400"
            )}
          >
            {isSigned ? "Signed" : "Not signed"}
          </span>
        </TooltipTrigger>
        {isSigned && agreement?.signedAt && (
          <TooltipContent side="top">
            <p className="text-xs">
              Signed on{" "}
              {new Date(agreement.signedAt).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </p>
          </TooltipContent>
        )}
      </Tooltip>
    </TooltipProvider>
  );
}

function ProgressCell({
  invoices,
  paidMilestoneCount,
}: {
  invoices: CommunityPayoutInvoiceInfo[];
  paidMilestoneCount: number;
}) {
  const total = invoices.length;
  const paid = paidMilestoneCount;
  const received = invoices.filter(
    (inv) => inv.invoiceStatus === "received" || inv.invoiceStatus === "paid"
  ).length;

  if (total === 0) {
    return <span className="text-xs text-gray-500 dark:text-zinc-500">No milestones</span>;
  }

  const allDone = paid === total && received === total;
  const hasProgress = paid > 0 || received > 0;

  const countsByStatus = invoices.reduce(
    (acc, inv) => {
      acc[inv.invoiceStatus] = (acc[inv.invoiceStatus] || 0) + 1;
      return acc;
    },
    {} as Record<InvoiceStatus, number>
  );

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              "text-xs tabular-nums cursor-default",
              allDone
                ? "text-green-700 dark:text-green-400"
                : hasProgress
                  ? "text-blue-700 dark:text-blue-400"
                  : "text-gray-600 dark:text-zinc-400"
            )}
          >
            <div>
              {paid}/{total} milestones paid
            </div>
            <div>
              {received}/{total} invoices received
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <div className="space-y-0.5 text-xs">
            <p>
              {total} {total === 1 ? "milestone" : "milestones"}, {paid} paid
            </p>
            {countsByStatus.paid ? <p>Invoices paid: {countsByStatus.paid}</p> : null}
            {countsByStatus.received ? <p>Invoices received: {countsByStatus.received}</p> : null}
            {countsByStatus.not_submitted ? (
              <p>Invoices not submitted: {countsByStatus.not_submitted}</p>
            ) : null}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// ─── Active filter chips ─────────────────────────────────────────────────────

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

// ─── Sort icon ───────────────────────────────────────────────────────────────

function SortIcon({
  column,
  sortBy,
  sortOrder,
}: {
  column: CommunityPayoutsSorting["sortBy"];
  sortBy?: CommunityPayoutsSorting["sortBy"];
  sortOrder?: "asc" | "desc";
}) {
  if (sortBy === column) {
    return sortOrder === "asc" ? (
      <ChevronUpIcon className="h-4 w-4" />
    ) : (
      <ChevronDownIcon className="h-4 w-4" />
    );
  }
  return <ChevronUpIcon className="h-4 w-4 opacity-50" />;
}

// ─── Main component ──────────────────────────────────────────────────────────

export default function ControlCenterPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { ready: authReady } = useAuth();
  const params = useParams();
  const communityId = params.communityId as string;

  // URL-driven state
  const selectedProgramId = searchParams.get("programId");
  const itemsPerPage = Number(searchParams.get("limit")) || 50;
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

  // ─── Real data fetching ──────────────────────────────────────────────────

  const {
    data: community,
    isLoading: isLoadingCommunity,
    error: communityError,
  } = useCommunityDetails(communityId);

  const { hasAccess, isLoading: loadingAdmin } = useCommunityAdminAccess(community?.uid);

  // Extract actual programId from composite value (programId_chainId)
  const actualProgramId = selectedProgramId?.split("_")[0] || null;

  const filters = useMemo(() => {
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
    filters,
    sorting: sortBy ? { sortBy, sortOrder: sortOrder || "asc" } : undefined,
  };

  const {
    data: payoutsData,
    isLoading: isLoadingPayouts,
    invalidate: refreshPayouts,
  } = useCommunityPayouts(community?.uid || "", payoutsOptions, {
    enabled: !!community?.uid && authReady,
  });

  const payouts = payoutsData?.payload || [];
  const totalItems = payoutsData?.pagination?.totalCount || 0;

  // Payout configs for milestone allocations
  const { data: payoutConfigs } = usePayoutConfigsByCommunity(community?.uid || "", {
    enabled: !!community?.uid && authReady,
  });

  const payoutConfigMap = useMemo(() => {
    const map: Record<string, PayoutGrantConfig> = {};
    if (payoutConfigs) {
      for (const config of payoutConfigs) {
        map[config.grantUID] = config;
      }
    }
    return map;
  }, [payoutConfigs]);

  // Process payouts into table data
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
    }));
  }, [payouts]);

  // Consolidated maps from payouts response (single pass)
  const { disbursementMap, agreementMap, invoiceMap, paidMilestoneCountMap } = useMemo(() => {
    const dMap: Record<string, DisbursementMapEntry> = {};
    const aMap: Record<string, CommunityPayoutAgreementInfo | null> = {};
    const iMap: Record<string, CommunityPayoutInvoiceInfo[]> = {};
    const pMap: Record<string, number> = {};
    for (const payout of payouts) {
      dMap[payout.grant.uid] = {
        totalsByToken: payout.disbursements.totalsByToken || [],
        status: payout.disbursements.status,
        history: payout.disbursements.history,
      };
      aMap[payout.grant.uid] = payout.agreement;
      iMap[payout.grant.uid] = payout.milestoneInvoices || [];
      pMap[payout.grant.uid] = payout.paidMilestoneCount ?? 0;
    }
    return {
      disbursementMap: dMap,
      agreementMap: aMap,
      invoiceMap: iMap,
      paidMilestoneCountMap: pMap,
    };
  }, [payouts]);

  // ─── KYC ───────────────────────────────────────────────────────────────

  const projectUIDs = useMemo(
    () => Array.from(new Set(tableData.map((t) => t.projectUid))).sort(),
    [tableData]
  );

  const { config: kycConfig, isEnabled: isKycEnabled } = useKycConfig(community?.uid, {
    enabled: !!community?.uid,
  });

  const { statuses: kycStatuses, isLoading: isLoadingKycStatuses } = useKycBatchStatuses(
    community?.uid,
    projectUIDs,
    {
      enabled: !!community?.uid && projectUIDs.length > 0 && isKycEnabled,
    }
  );

  // ─── Helpers ─────────────────────────────────────────────────────────────

  const getTotalDisbursed = useCallback((totalsByToken: TokenTotal[]): number => {
    if (!totalsByToken || totalsByToken.length === 0) return 0;
    return totalsByToken.reduce((sum, tokenTotal) => {
      const rawAmount = BigInt(tokenTotal.totalAmount || "0");
      const decimals = tokenTotal.tokenDecimals || 6;
      const humanReadable = parseFloat(formatUnits(rawAmount, decimals));
      return sum + humanReadable;
    }, 0);
  }, []);

  const getCheckboxDisabledState = useCallback(
    (item: TableRow): { disabled: boolean; reason: string | null } => {
      const payoutAddress = item.currentPayoutAddress;
      const amount = item.currentAmount;
      const parsedAmount = amount ? parseFloat(amount) : 0;

      if (!payoutAddress || payoutAddress.trim() === "") {
        return { disabled: true, reason: "Missing payout address" };
      }
      if (!isAddress(payoutAddress)) {
        return { disabled: true, reason: "Invalid payout address" };
      }
      if (parsedAmount === 0 || Number.isNaN(parsedAmount)) {
        return { disabled: true, reason: "Payout amount is 0 or missing" };
      }

      const disbursementInfo = disbursementMap[item.grantUid];
      if (disbursementInfo) {
        const FULLY_DISBURSED_EPSILON = 1e-6;
        const totalDisbursed = getTotalDisbursed(disbursementInfo.totalsByToken);
        const remainingAmount = parsedAmount - totalDisbursed;
        if (remainingAmount <= FULLY_DISBURSED_EPSILON) {
          return { disabled: true, reason: "Fully disbursed" };
        }
      }

      return { disabled: false, reason: null };
    },
    [disbursementMap, getTotalDisbursed]
  );

  // Backend pagination — use tableData directly, with optional KYC frontend filter
  const paginatedData = useMemo(() => {
    if (!kycFilter) return tableData;
    return tableData.filter((item) => {
      const status = kycStatuses.get(item.projectUid);
      const kycStatus = status?.status || "NOT_STARTED";
      return kycStatus === kycFilter;
    });
  }, [tableData, kycFilter, kycStatuses]);

  const selectableGrants = useMemo(
    () => paginatedData.filter((item) => !getCheckboxDisabledState(item).disabled),
    [paginatedData, getCheckboxDisabledState]
  );

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

  const columnCount = 8 + (isKycEnabled ? 1 : 0);

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

  // ─── Loading state ───────────────────────────────────────────────────────

  if (!authReady || isLoadingCommunity || !community || loadingAdmin || isLoadingPayouts) {
    const skeletonCols = 9;
    return (
      <div className="my-4 flex flex-col gap-6 w-full">
        {/* Page Header (same as real) */}
        <div className="flex flex-col gap-1 px-4">
          <div className="flex items-center gap-2 mb-1">
            <Skeleton className="h-4 w-40" />
          </div>
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-80 mt-1" />
        </div>

        {/* Skeleton toolbar */}
        <div className="flex flex-wrap items-center gap-3 px-4">
          <Skeleton className="h-9 w-[150px] rounded-md" />
          <Skeleton className="h-9 w-[150px] rounded-md" />
          <Skeleton className="h-9 w-[150px] rounded-md" />
          <Skeleton className="h-9 w-[150px] rounded-md" />
          <Skeleton className="h-9 w-[200px] rounded-md" />
        </div>

        {/* Skeleton table */}
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

  // ─── Error state ────────────────────────────────────────────────────────

  if (
    communityError &&
    !communityError.message?.includes("422") &&
    communityError.message !== "Community not found"
  ) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <p className="text-lg text-red-600">Failed to load data</p>
        <Button onClick={() => window.location.reload()}>Retry</Button>
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
            <div className="flex items-center gap-2 mb-1">
              <Link
                href={PAGES.ADMIN.ROOT(community?.details?.slug || (community?.uid as string))}
                className="flex items-center gap-1 text-sm text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-zinc-100 transition-colors"
              >
                <ChevronLeftIcon className="h-4 w-4" />
                Return to admin page
              </Link>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-zinc-100 tracking-tight">
              Control Center
            </h1>
            <p className="text-sm text-gray-500 dark:text-zinc-400 mt-0.5">
              Overview of project KYB, agreements, milestones, invoices, and payments
            </p>
          </div>
        </div>
      </div>

      {/* Toolbar — Row 1: Primary controls */}
      <div className="flex items-center justify-between gap-4 px-4 pb-3 border-b border-gray-100 dark:border-zinc-800/50">
        <ProgramFilter onChange={handleProgramChange} />

        <div className="relative flex-shrink-0 w-[280px]">
          <MagnifyingGlassIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="Search projects..."
            className="pl-8 h-9 w-full text-sm bg-white dark:bg-zinc-900"
          />
        </div>
      </div>

      {/* Toolbar — Row 2: Secondary filters + entries */}
      <div className="flex items-center justify-between gap-3 px-4 -mt-3">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Agreement filter */}
          <Select
            value={agreementFilter || "all"}
            onValueChange={(v) => handleFilterChange("agreementStatus", v === "all" ? null : v)}
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
            onValueChange={(v) => handleFilterChange("invoiceStatus", v === "all" ? null : v)}
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
            onValueChange={(v) => handleFilterChange("status", v === "all" ? null : v)}
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

          {/* KYB filter (frontend-only, only if KYC enabled) */}
          {isKycEnabled && (
            <Select
              value={kycFilter || "all"}
              onValueChange={(v) => handleFilterChange("kycStatus", v === "all" ? null : v)}
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
            onRemoveFilter={handleFilterChange}
            onClearSearch={() => {
              setLocalSearch("");
              handleFilterChange("search", null);
            }}
            onClearAll={handleClearFilters}
          />
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-xs text-gray-500 dark:text-zinc-400">Show</span>
          <Select value={itemsPerPage.toString()} onValueChange={handleItemsPerPageChange}>
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

      {/* Table */}
      <div className="px-4">
        <div className="w-full overflow-x-auto rounded-lg border border-gray-200 dark:border-zinc-800">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-zinc-800">
            <thead>
              <tr className="bg-gray-50 dark:bg-zinc-900">
                {/* Checkbox */}
                <th className="h-11 px-2 text-center align-middle w-12">
                  <input
                    type="checkbox"
                    className={cn(
                      "h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500",
                      selectableGrants.length === 0 && "opacity-50 cursor-not-allowed"
                    )}
                    checked={
                      selectableGrants.length > 0 &&
                      selectableGrants.every((p) => selectedGrants.has(p.grantUid))
                    }
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    disabled={selectableGrants.length === 0}
                    title={
                      selectableGrants.length === 0
                        ? "No grants have valid payout address and amount"
                        : `Select all ${selectableGrants.length} eligible grants`
                    }
                  />
                </th>
                {/* Project - sortable */}
                <th
                  className="h-11 px-4 text-left text-xs font-semibold text-gray-600 dark:text-zinc-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-zinc-800 select-none"
                  onClick={() => handleSort("project_title")}
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
                {/* Progress (milestones + invoices) */}
                <th className="h-11 px-4 text-left text-xs font-semibold text-gray-600 dark:text-zinc-400 uppercase tracking-wider w-44">
                  Progress
                </th>
                {/* Total Grant - sortable */}
                <th
                  className="h-11 px-4 text-right text-xs font-semibold text-gray-600 dark:text-zinc-400 uppercase tracking-wider w-28 cursor-pointer hover:bg-gray-100 dark:hover:bg-zinc-800 select-none"
                  onClick={() => handleSort("payout_amount")}
                >
                  <div className="flex items-center justify-end gap-1">
                    Total Grant
                    <SortIcon column="payout_amount" sortBy={sortBy} sortOrder={sortOrder} />
                  </div>
                </th>
                {/* Disbursed - sortable */}
                <th
                  className="h-11 px-4 text-right text-xs font-semibold text-gray-600 dark:text-zinc-400 uppercase tracking-wider w-32 cursor-pointer hover:bg-gray-100 dark:hover:bg-zinc-800 select-none"
                  onClick={() => handleSort("disbursed_amount")}
                >
                  <div className="flex items-center justify-end gap-1">
                    Disbursed
                    <SortIcon column="disbursed_amount" sortBy={sortBy} sortOrder={sortOrder} />
                  </div>
                </th>
                {/* Actions */}
                <th className="h-11 px-4 text-center text-xs font-semibold text-gray-600 dark:text-zinc-400 uppercase tracking-wider w-20">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-zinc-800 bg-white dark:bg-zinc-950">
              {paginatedData.map((item) => {
                const disbursementInfo = disbursementMap[item.grantUid];
                const totalsByToken = disbursementInfo?.totalsByToken || [];
                const checkboxState = getCheckboxDisabledState(item);
                const isFullyDisbursed = checkboxState.reason === "Fully disbursed";

                const agreement = agreementMap[item.grantUid] ?? null;
                const invoices = invoiceMap[item.grantUid] ?? [];

                return (
                  <tr
                    key={`${item.grantUid}-${item.projectUid}`}
                    onClick={(e) => handleRowClick(item, e)}
                    className={cn(
                      "cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-zinc-900/70 group",
                      selectedGrants.has(item.grantUid) && "bg-blue-50 dark:bg-blue-900/20",
                      isFullyDisbursed && "bg-green-50/50 dark:bg-green-900/10",
                      checkboxState.disabled &&
                        !isFullyDisbursed &&
                        "bg-gray-50/50 dark:bg-zinc-900/50"
                    )}
                  >
                    {/* Checkbox */}
                    <td className="px-2 py-3 text-center">
                      <input
                        type="checkbox"
                        className={cn(
                          "h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500",
                          checkboxState.disabled && "opacity-50 cursor-not-allowed"
                        )}
                        checked={selectedGrants.has(item.grantUid)}
                        onChange={(e) => handleSelectGrant(item.grantUid, e.target.checked)}
                        disabled={checkboxState.disabled}
                        title={checkboxState.reason || "Select for disbursement"}
                      />
                    </td>

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
                          <KycStatusBadge
                            status={kycStatuses.get(item.projectUid) ?? null}
                            showValidityInLabel={false}
                            className="px-2.5"
                          />
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
                          `${item.currentPayoutAddress.slice(0, 6)}...${item.currentPayoutAddress.slice(-4)}`
                        ) : (
                          <span className="text-gray-400 dark:text-zinc-600">&mdash;</span>
                        )}
                      </span>
                    </td>

                    {/* Progress (milestones + invoices) */}
                    <td className="px-4 py-3 text-left">
                      <ProgressCell
                        invoices={invoices}
                        paidMilestoneCount={paidMilestoneCountMap[item.grantUid] ?? 0}
                      />
                    </td>

                    {/* Total Grant */}
                    <td className="px-4 py-3 text-right tabular-nums text-sm font-medium text-gray-900 dark:text-zinc-100">
                      {item.currentAmount && parseFloat(item.currentAmount) > 0 ? (
                        parseFloat(item.currentAmount).toLocaleString(undefined, {
                          maximumFractionDigits: 6,
                        })
                      ) : (
                        <span className="text-gray-400 dark:text-zinc-600">&mdash;</span>
                      )}
                    </td>

                    {/* Disbursed */}
                    <td className="px-4 py-3 text-right">
                      <TokenBreakdown totalsByToken={totalsByToken} size="sm" />
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleOpenConfigModal(item)}
                        className={cn(
                          "p-2 rounded-md transition-colors",
                          "text-gray-500 hover:text-gray-700 hover:bg-gray-100",
                          "dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-zinc-800"
                        )}
                        title="Configure payout settings"
                      >
                        <Cog6ToothIcon className="h-5 w-5" />
                      </button>
                    </td>
                  </tr>
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
                        onClick={handleClearFilters}
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
                setCurrentPage={handlePageChange}
                postsPerPage={itemsPerPage}
                totalPosts={kycFilter ? paginatedData.length : totalItems}
              />
            </div>
          )}
        </div>
      </div>

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
