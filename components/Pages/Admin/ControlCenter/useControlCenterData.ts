"use client";

import { useCallback, useMemo } from "react";
import { formatUnits, isAddress } from "viem";
import { useCommunityAdminAccess } from "@/hooks/communities/useCommunityAdminAccess";
import { useCommunityDetails } from "@/hooks/communities/useCommunityDetails";
import { useKycBatchStatuses, useKycConfig } from "@/hooks/useKycStatus";
import type { PayoutDisbursement } from "@/src/features/payout-disbursement";
import {
  type AggregatedDisbursementStatus,
  type CommunityPayoutAgreementInfo,
  type CommunityPayoutInvoiceInfo,
  type CommunityPayoutsOptions,
  type CommunityPayoutsSorting,
  getPaidAllocationIds,
  type PayoutGrantConfig,
  type TokenTotal,
  useCommunityPayouts,
  usePayoutConfigsByCommunity,
} from "@/src/features/payout-disbursement";
import type { TableRow } from "./ControlCenterTable";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface DisbursementMapEntry {
  totalsByToken: TokenTotal[];
  status: string;
  history: PayoutDisbursement[];
}

export interface ControlCenterFilters {
  programId: string | null;
  agreementFilter: "signed" | "not_signed" | undefined;
  invoiceFilter: "all_received" | "needs_invoices" | "has_invoices" | undefined;
  disbursementFilter: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED" | undefined;
  kycFilter: string | undefined;
  searchQuery: string;
  sortBy: CommunityPayoutsSorting["sortBy"] | undefined;
  sortOrder: "asc" | "desc" | undefined;
  currentPage: number;
  itemsPerPage: number;
}

/**
 * Maximum records to fetch when KYC filter is active.
 * KYC data is not available in the backend API, so client-side filtering
 * requires fetching more records. Capped to prevent excessive data transfer.
 */
const KYC_FILTER_LIMIT = 500;

// ─── Hook ───────────────────────────────────────────────────────────────────

export function useControlCenterData(
  communityId: string,
  authReady: boolean,
  filters: ControlCenterFilters
) {
  const {
    programId,
    agreementFilter,
    invoiceFilter,
    disbursementFilter,
    kycFilter,
    searchQuery,
    sortBy,
    sortOrder,
    currentPage,
    itemsPerPage,
  } = filters;

  // ─── Community ──────────────────────────────────────────────────────────

  const {
    data: community,
    isLoading: isLoadingCommunity,
    error: communityError,
  } = useCommunityDetails(communityId);

  const { hasAccess, isLoading: loadingAdmin } = useCommunityAdminAccess(community?.uid);

  // ─── Payouts ────────────────────────────────────────────────────────────

  const actualProgramId = programId?.split("_")[0] || null;

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
    page: kycFilter ? 1 : currentPage,
    limit: kycFilter ? KYC_FILTER_LIMIT : itemsPerPage,
    filters: apiFilters,
    sorting: sortBy ? { sortBy, sortOrder: sortOrder || "asc" } : undefined,
  };

  const {
    data: payoutsData,
    isLoading: isLoadingPayouts,
    error: payoutsError,
    invalidate: refreshPayouts,
  } = useCommunityPayouts(community?.uid || "", payoutsOptions, {
    enabled: !!community?.uid && authReady,
  });

  const payouts = payoutsData?.payload || [];
  const totalItems = payoutsData?.pagination?.totalCount || 0;

  // ─── Payout configs ─────────────────────────────────────────────────────

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

  // ─── Derived table data ─────────────────────────────────────────────────

  // Deduplicate by grant.uid (keep first occurrence) so tableData and all
  // derived maps reference the exact same payout record set.
  const dedupedPayouts = useMemo(() => {
    const seen = new Set<string>();
    return payouts.filter((payout) => {
      if (seen.has(payout.grant.uid)) return false;
      seen.add(payout.grant.uid);
      return true;
    });
  }, [payouts]);

  const tableData: TableRow[] = useMemo(() => {
    return dedupedPayouts.map((payout) => ({
      grantUid: payout.grant.uid,
      projectUid: payout.project.uid,
      // Prefer the team name resolved from the approved application data
      // (Team Name / Project Name / Organization Name in the form) and fall
      // back to the on-chain Karma project title when no application is found.
      projectName: payout.project.resolvedProjectName || payout.project.title,
      projectSlug: payout.project.slug,
      grantName: payout.grant.title,
      grantProgramId: payout.grant.programId || "",
      grantChainId: payout.grant.chainID,
      projectChainId: payout.project.chainID,
      currentPayoutAddress: payout.project.adminPayoutAddress || "",
      currentAmount: payout.grant.adminPayoutAmount || payout.grant.payoutAmount || "",
    }));
  }, [dedupedPayouts]);

  // Consolidated maps from payouts response (single pass)
  const { disbursementMap, agreementMap, invoiceMap, paidMilestoneCountMap, invoiceRequiredMap } =
    useMemo(() => {
      const dMap: Record<string, DisbursementMapEntry> = {};
      const aMap: Record<string, CommunityPayoutAgreementInfo | null> = {};
      const iMap: Record<string, CommunityPayoutInvoiceInfo[]> = {};
      const pMap: Record<string, number> = {};
      const irMap: Record<string, boolean> = {};
      for (const payout of dedupedPayouts) {
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
    }, [dedupedPayouts]);

  const hasInvoicePrograms = useMemo(
    () => Object.values(invoiceRequiredMap).some(Boolean),
    [invoiceRequiredMap]
  );

  // ─── KYC ────────────────────────────────────────────────────────────────

  const projectUIDs = useMemo(
    () => Array.from(new Set(tableData.map((t) => t.projectUid))).sort(),
    [tableData]
  );

  const { isEnabled: isKycEnabled } = useKycConfig(community?.uid, {
    enabled: !!community?.uid,
  });

  const { statuses: kycStatuses, isLoading: isLoadingKycStatuses } = useKycBatchStatuses(
    community?.uid,
    projectUIDs,
    {
      enabled: !!community?.uid && projectUIDs.length > 0 && isKycEnabled,
    }
  );

  // ─── Helpers ────────────────────────────────────────────────────────────

  const getTotalDisbursed = useCallback((totalsByToken: TokenTotal[]): number => {
    if (!totalsByToken || totalsByToken.length === 0) return 0;
    return totalsByToken.reduce((sum, tokenTotal) => {
      const rawAmount = BigInt(tokenTotal.totalAmount || "0");
      const decimals = tokenTotal.tokenDecimals ?? 6;
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

  // Client-side KYC filtering (KYC data not available in backend)
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

  return {
    // Community
    community,
    isLoadingCommunity,
    communityError,
    hasAccess,
    loadingAdmin,
    // Payouts
    isLoadingPayouts,
    payoutsError,
    payoutsData,
    refreshPayouts,
    totalItems,
    // Table data
    tableData,
    paginatedData,
    selectableGrants,
    // Maps
    disbursementMap,
    agreementMap,
    invoiceMap,
    paidMilestoneCountMap,
    invoiceRequiredMap,
    payoutConfigMap,
    hasInvoicePrograms,
    // KYC
    isKycEnabled,
    isLoadingKycStatuses,
    kycStatuses,
    // Helpers
    getCheckboxDisabledState,
    getTotalDisbursed,
  };
}
