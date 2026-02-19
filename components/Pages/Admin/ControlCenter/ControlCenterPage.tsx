"use client";

import { ChevronDownIcon, ChevronLeftIcon, ChevronUpIcon } from "@heroicons/react/20/solid";
import { BanknotesIcon, Cog6ToothIcon, MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { formatUnits, isAddress } from "viem";
import { KycStatusBadge } from "@/components/KycStatusIcon";
import { ProgramFilter } from "@/components/Pages/Communities/Impact/ProgramFilter";
import { Spinner } from "@/components/Utilities/Spinner";
import TablePagination from "@/components/Utilities/TablePagination";
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
import {
  AggregatedDisbursementStatus,
  type CommunityPayoutAgreementInfo,
  type CommunityPayoutInvoiceInfo,
  type CommunityPayoutsOptions,
  type CommunityPayoutsSorting,
  CreateDisbursementModal,
  type GrantDisbursementInfo,
  getPaidAllocationIds,
  type InvoiceStatus,
  PayoutConfigurationModal,
  PayoutDisbursementStatus,
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

// ─── Internal table row type ─────────────────────────────────────────────────

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
                ? "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                : "bg-gray-100 text-gray-600 dark:bg-zinc-800 dark:text-zinc-400"
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

function InvoiceSummaryBadge({ invoices }: { invoices: CommunityPayoutInvoiceInfo[] }) {
  const total = invoices.length;
  const received = invoices.filter(
    (inv) => inv.invoiceStatus === "received" || inv.invoiceStatus === "paid"
  ).length;
  const allReceived = received === total && total > 0;
  const noneReceived = received === 0;

  const countsByStatus = invoices.reduce(
    (acc, inv) => {
      acc[inv.invoiceStatus] = (acc[inv.invoiceStatus] || 0) + 1;
      return acc;
    },
    {} as Record<InvoiceStatus, number>
  );

  if (total === 0) {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium cursor-default bg-gray-100 text-gray-600 dark:bg-zinc-800 dark:text-zinc-400">
        No invoices
      </span>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={cn(
              "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium cursor-default tabular-nums",
              allReceived
                ? "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                : noneReceived
                  ? "bg-gray-100 text-gray-600 dark:bg-zinc-800 dark:text-zinc-400"
                  : "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
            )}
          >
            {noneReceived ? "Needs invoices" : `${received}/${total} received`}
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <div className="space-y-0.5 text-xs">
            {countsByStatus.paid ? <p>Paid: {countsByStatus.paid}</p> : null}
            {countsByStatus.received ? <p>Received: {countsByStatus.received}</p> : null}
            {countsByStatus.submitted ? <p>Submitted: {countsByStatus.submitted}</p> : null}
            {countsByStatus.not_submitted ? (
              <p>Not submitted: {countsByStatus.not_submitted}</p>
            ) : null}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function MilestoneSummaryBadge({ invoices }: { invoices: CommunityPayoutInvoiceInfo[] }) {
  const total = invoices.length;
  const paid = invoices.filter((inv) => inv.invoiceStatus === "paid").length;
  const allPaid = paid === total && total > 0;

  if (total === 0) {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium cursor-default bg-gray-100 text-gray-600 dark:bg-zinc-800 dark:text-zinc-400">
        No milestones
      </span>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={cn(
              "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium cursor-default tabular-nums",
              allPaid
                ? "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                : paid > 0
                  ? "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                  : "bg-gray-100 text-gray-600 dark:bg-zinc-800 dark:text-zinc-400"
            )}
          >
            {allPaid ? `${total}/${total} paid` : `${paid}/${total} paid`}
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <p className="text-xs">
            {total} {total === 1 ? "milestone" : "milestones"}, {paid} paid
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
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
  const itemsPerPage = Number(searchParams.get("limit")) || 200;
  const currentPage = Number(searchParams.get("page")) || 1;
  const searchQuery = searchParams.get("q") || "";
  const sortBy = (searchParams.get("sortBy") as CommunityPayoutsSorting["sortBy"]) || undefined;
  const sortOrder = (searchParams.get("sortOrder") as "asc" | "desc") || undefined;

  // Local state
  const [localSearch, setLocalSearch] = useState(searchQuery);
  const [selectedGrants, setSelectedGrants] = useState<Set<string>>(new Set());

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

  const payoutsOptions: CommunityPayoutsOptions = {
    page: currentPage,
    limit: itemsPerPage,
    filters: actualProgramId ? { programId: actualProgramId } : undefined,
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
      currentAmount: payout.grant.adminPayoutAmount || "",
    }));
  }, [payouts]);

  // Disbursement map from payouts response
  const disbursementMap = useMemo(() => {
    const map: Record<string, { totalsByToken: TokenTotal[]; status: string; history: any[] }> = {};
    payouts.forEach((payout) => {
      map[payout.grant.uid] = {
        totalsByToken: payout.disbursements.totalsByToken || [],
        status: payout.disbursements.status,
        history: payout.disbursements.history,
      };
    });
    return map;
  }, [payouts]);

  // Agreement map from payouts response
  const agreementMap = useMemo(() => {
    const map: Record<string, CommunityPayoutAgreementInfo | null> = {};
    for (const payout of payouts) {
      map[payout.grant.uid] = payout.agreement;
    }
    return map;
  }, [payouts]);

  // Invoice map from payouts response
  const invoiceMap = useMemo(() => {
    const map: Record<string, CommunityPayoutInvoiceInfo[]> = {};
    for (const payout of payouts) {
      map[payout.grant.uid] = payout.milestoneInvoices || [];
    }
    return map;
  }, [payouts]);

  // ─── KYC ───────────────────────────────────────────────────────────────

  const projectUIDsKey = useMemo(
    () =>
      Array.from(new Set(tableData.map((t) => t.projectUid)))
        .sort()
        .join(","),
    [tableData]
  );
  const projectUIDs = useMemo(
    () => (projectUIDsKey ? projectUIDsKey.split(",") : []),
    [projectUIDsKey]
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

  const computeDisplayStatus = useCallback(
    (
      _item: TableRow,
      disbursementInfo?: { totalsByToken: TokenTotal[]; status: string; history: any[] }
    ): { label: string; color: string } => {
      const aggregatedStatus = disbursementInfo?.status;
      const history = disbursementInfo?.history || [];
      const latestDisbursement = history[0];

      if (history.length === 0) {
        return { label: "Pending", color: "text-gray-500 bg-gray-100 dark:bg-gray-700" };
      }

      const hasDisbursedTransaction = history.some(
        (d) => d.status === PayoutDisbursementStatus.DISBURSED
      );
      const allCancelled = history.every((d) => d.status === PayoutDisbursementStatus.CANCELLED);

      if (latestDisbursement?.status === PayoutDisbursementStatus.AWAITING_SIGNATURES) {
        return {
          label: "Awaiting Signatures",
          color: "text-yellow-700 bg-yellow-100 dark:bg-yellow-900/30",
        };
      }
      if (aggregatedStatus === AggregatedDisbursementStatus.COMPLETED) {
        return { label: "Disbursed", color: "text-green-700 bg-green-100 dark:bg-green-900/30" };
      }
      if (hasDisbursedTransaction) {
        return {
          label: "Partially Disbursed",
          color: "text-blue-700 bg-blue-100 dark:bg-blue-900/30",
        };
      }
      if (allCancelled) {
        return { label: "Cancelled", color: "text-gray-700 bg-gray-200 dark:bg-gray-600" };
      }
      if (latestDisbursement?.status === PayoutDisbursementStatus.FAILED) {
        return { label: "Failed", color: "text-red-700 bg-red-100 dark:bg-red-900/30" };
      }

      return { label: "Pending", color: "text-gray-500 bg-gray-100 dark:bg-gray-700" };
    },
    []
  );

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
        const totalDisbursed = getTotalDisbursed(disbursementInfo.totalsByToken);
        const remainingAmount = parsedAmount - totalDisbursed;
        if (remainingAmount <= 0) {
          return { disabled: true, reason: "Fully disbursed" };
        }
      }

      return { disabled: false, reason: null };
    },
    [disbursementMap, getTotalDisbursed]
  );

  // Backend pagination — use tableData directly
  const paginatedData = tableData;

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
    const query = createQueryString({ q: localSearch || null, page: "1" });
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

  // ─── Sort icon helper ────────────────────────────────────────────────────

  const SortIcon = ({ column }: { column: CommunityPayoutsSorting["sortBy"] }) => {
    if (sortBy === column) {
      return sortOrder === "asc" ? (
        <ChevronUpIcon className="h-4 w-4" />
      ) : (
        <ChevronDownIcon className="h-4 w-4" />
      );
    }
    return <ChevronUpIcon className="h-4 w-4 opacity-30" />;
  };

  // ─── Error / redirect handling ───────────────────────────────────────────

  useEffect(() => {
    if (
      communityError?.message === "Community not found" ||
      communityError?.message?.includes("422")
    ) {
      router.push(PAGES.NOT_FOUND);
    }
  }, [communityError, router]);

  // ─── Loading state ───────────────────────────────────────────────────────

  if (!authReady || loadingAdmin || isLoadingPayouts || isLoadingCommunity) {
    return (
      <div className="flex w-full items-center justify-center h-96">
        <Spinner />
      </div>
    );
  }

  // ─── Not authorized ──────────────────────────────────────────────────────

  if (!hasAccess) {
    return (
      <div className="flex w-full items-center justify-center h-96">
        <p className="text-lg">{MESSAGES.ADMIN.NOT_AUTHORIZED(community?.uid || "")}</p>
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

      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4">
        <div className="flex items-center gap-3 flex-wrap">
          <ProgramFilter onChange={handleProgramChange} />

          {/* Search */}
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="Search projects..."
              className="pl-8 h-9 w-[200px] text-sm bg-white dark:bg-zinc-900"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500 dark:text-zinc-400">Show</span>
          <Select value={itemsPerPage.toString()} onValueChange={handleItemsPerPageChange}>
            <SelectTrigger className="w-[70px] bg-white dark:bg-zinc-900 h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="20">20</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
              <SelectItem value="200">200</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-sm text-gray-500 dark:text-zinc-400">entries</span>
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
                    <SortIcon column="project_title" />
                  </div>
                </th>
                {/* KYB */}
                {isKycEnabled && (
                  <th className="h-11 px-4 text-center text-xs font-semibold text-gray-600 dark:text-zinc-400 uppercase tracking-wider w-24">
                    KYB
                  </th>
                )}
                {/* Agreement */}
                <th className="h-11 px-4 text-center text-xs font-semibold text-gray-600 dark:text-zinc-400 uppercase tracking-wider w-28">
                  Agreement
                </th>
                {/* Payout Address */}
                <th className="h-11 px-4 text-left text-xs font-semibold text-gray-600 dark:text-zinc-400 uppercase tracking-wider">
                  Payout Address
                </th>
                {/* Invoices */}
                <th className="h-11 px-4 text-center text-xs font-semibold text-gray-600 dark:text-zinc-400 uppercase tracking-wider w-36">
                  Invoices
                </th>
                {/* Milestones */}
                <th className="h-11 px-4 text-center text-xs font-semibold text-gray-600 dark:text-zinc-400 uppercase tracking-wider w-36">
                  Milestones
                </th>
                {/* Total Grant - sortable */}
                <th
                  className="h-11 px-4 text-right text-xs font-semibold text-gray-600 dark:text-zinc-400 uppercase tracking-wider w-28 cursor-pointer hover:bg-gray-100 dark:hover:bg-zinc-800 select-none"
                  onClick={() => handleSort("payout_amount")}
                >
                  <div className="flex items-center justify-end gap-1">
                    Total Grant
                    <SortIcon column="payout_amount" />
                  </div>
                </th>
                {/* Disbursed - sortable */}
                <th
                  className="h-11 px-4 text-right text-xs font-semibold text-gray-600 dark:text-zinc-400 uppercase tracking-wider w-32 cursor-pointer hover:bg-gray-100 dark:hover:bg-zinc-800 select-none"
                  onClick={() => handleSort("disbursed_amount")}
                >
                  <div className="flex items-center justify-end gap-1">
                    Disbursed
                    <SortIcon column="disbursed_amount" />
                  </div>
                </th>
                {/* Status - sortable */}
                <th
                  className="h-11 px-4 text-center text-xs font-semibold text-gray-600 dark:text-zinc-400 uppercase tracking-wider w-36 cursor-pointer hover:bg-gray-100 dark:hover:bg-zinc-800 select-none"
                  onClick={() => handleSort("status")}
                >
                  <div className="flex items-center justify-center gap-1">
                    Status
                    <SortIcon column="status" />
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
                const displayStatus = computeDisplayStatus(item, disbursementInfo);
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
                      checkboxState.disabled && !isFullyDisbursed && "opacity-60"
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
                        <span className="font-medium text-gray-900 dark:text-zinc-100 text-sm group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          {item.projectName}
                        </span>
                        <p className="text-xs text-gray-500 dark:text-zinc-500 mt-0.5">
                          {item.grantName}
                        </p>
                      </div>
                    </td>

                    {/* KYB */}
                    {isKycEnabled && (
                      <td className="px-4 py-3 text-center">
                        {isLoadingKycStatuses ? (
                          <Spinner className="w-4 h-4" />
                        ) : (
                          <KycStatusBadge
                            status={kycStatuses.get(item.projectUid) ?? null}
                            showValidityInLabel={false}
                          />
                        )}
                      </td>
                    )}

                    {/* Agreement */}
                    <td className="px-4 py-3 text-center">
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

                    {/* Invoices */}
                    <td className="px-4 py-3 text-center">
                      <InvoiceSummaryBadge invoices={invoices} />
                    </td>

                    {/* Milestones */}
                    <td className="px-4 py-3 text-center">
                      <MilestoneSummaryBadge invoices={invoices} />
                    </td>

                    {/* Total Grant */}
                    <td className="px-4 py-3 text-right tabular-nums text-sm font-medium text-gray-900 dark:text-zinc-100">
                      {item.currentAmount && parseFloat(item.currentAmount) > 0 ? (
                        parseFloat(item.currentAmount).toLocaleString()
                      ) : (
                        <span className="text-gray-400 dark:text-zinc-600">&mdash;</span>
                      )}
                    </td>

                    {/* Disbursed */}
                    <td className="px-4 py-3 text-right">
                      <TokenBreakdown totalsByToken={totalsByToken} size="sm" />
                    </td>

                    {/* Status (non-clickable) */}
                    <td className="px-4 py-3 text-center">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium",
                          displayStatus.color
                        )}
                      >
                        {displayStatus.label}
                      </span>
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
                  <td colSpan={11} className="px-4 py-12 text-center">
                    <p className="text-sm text-gray-500 dark:text-zinc-400">
                      No projects found matching your filters.
                    </p>
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
                totalPosts={totalItems}
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
        payoutConfig={
          detailsModalGrant ? (payoutConfigMap[detailsModalGrant.grantUid] ?? null) : null
        }
        disbursementInfo={
          detailsModalGrant ? (disbursementMap[detailsModalGrant.grantUid] ?? null) : null
        }
        agreement={detailsModalGrant ? (agreementMap[detailsModalGrant.grantUid] ?? null) : null}
        milestoneInvoices={detailsModalGrant ? (invoiceMap[detailsModalGrant.grantUid] ?? []) : []}
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
