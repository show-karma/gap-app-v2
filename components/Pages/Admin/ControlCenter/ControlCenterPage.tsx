"use client";

import { redirect, useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useAuth } from "@/hooks/useAuth";
import { CreateDisbursementModal } from "@/src/features/payout-disbursement/components/CreateDisbursementModal";
import { useSavePayoutConfig } from "@/src/features/payout-disbursement/hooks/use-payout-disbursement";
import type {
  CommunityPayoutsSorting,
  PayoutConfigItem,
} from "@/src/features/payout-disbursement/types/payout-disbursement";
import { PAGES } from "@/utilities/pages";
import { BulkPayoutImportPanel } from "./BulkPayoutImportPanel";
import { ControlCenterDetailsSidebar } from "./ControlCenterDetailsSidebar";
import { ControlCenterSkeleton } from "./ControlCenterSkeleton";
import {
  ControlCenterCommunityError,
  ControlCenterHeader,
  ControlCenterNotAuthorized,
  ControlCenterPayoutsError,
} from "./ControlCenterStates";
import { ControlCenterTable, type TableRow } from "./ControlCenterTable";
import { CreateDisbursementFab } from "./CreateDisbursementFab";
import { FilterToolbar } from "./FilterToolbar";
import { useControlCenterData } from "./useControlCenterData";
import { useControlCenterUrlState } from "./useControlCenterUrlState";
import { useDisbursementModal } from "./useDisbursementModal";
import { useGrantDetailsModal, useLastKnownGrant } from "./useGrantDetailsModal";

function isCommunityNotFound(error: { message?: string } | null | undefined): boolean {
  return error?.message === "Community not found" || !!error?.message?.includes("422");
}

export function ControlCenterPage() {
  const { ready: authReady } = useAuth();
  const params = useParams();
  const communityId = params.communityId as string;

  const url = useControlCenterUrlState();
  const {
    selectedProgramId,
    itemsPerPage,
    currentPage,
    searchQuery,
    sortBy,
    sortOrder,
    agreementFilter,
    invoiceFilter,
    disbursementFilter,
    kycFilter,
    projectParam,
    grantParam,
    hasActiveFilters,
    navigate,
    replaceQuery,
    clearAll,
  } = url;

  const [localSearch, setLocalSearch] = useState(searchQuery);
  const [selectedGrants, setSelectedGrants] = useState<Set<string>>(new Set());
  const [dataVersion, setDataVersion] = useState(0);

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
    tableData,
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

  const { detailsGrantUid, detailsModalOpen, openDetails, closeDetails, setDetailsModalOpen } =
    useGrantDetailsModal({
      projectParam,
      grantParam,
      searchQuery,
      isLoading: isLoadingPayouts,
      rows: tableData,
      replaceQuery,
    });
  const detailsModalGrant = useLastKnownGrant(detailsGrantUid, paginatedData);

  const disbursementModal = useDisbursementModal({ payoutConfigMap, disbursementMap });

  const saveBulkImportMutation = useSavePayoutConfig();
  const handleApplyBulkConfigs = useCallback(
    async (configs: PayoutConfigItem[]) => {
      if (!community?.uid) {
        throw new Error("Community UID not available");
      }
      return saveBulkImportMutation.mutateAsync({ communityUID: community.uid, configs });
    },
    [community?.uid, saveBulkImportMutation]
  );

  const handleSort = (column: CommunityPayoutsSorting["sortBy"]) => {
    const newSortOrder = sortBy === column && sortOrder === "asc" ? "desc" : "asc";
    navigate({ sortBy: column || null, sortOrder: newSortOrder, page: "1" });
  };

  const handleFilterChange = (key: string, value: string | null) =>
    navigate({ [key]: value, page: "1" });

  const handleClearFilters = () => {
    setLocalSearch("");
    clearAll();
  };

  const handleSelectGrant = (uid: string, checked: boolean) => {
    setSelectedGrants((prev) => {
      const next = new Set(prev);
      if (checked) next.add(uid);
      else next.delete(uid);
      return next;
    });
  };

  const handleSelectAll = (checked: boolean) => {
    setSelectedGrants(checked ? new Set(selectableGrants.map((item) => item.grantUid)) : new Set());
  };

  const handleOpenDisbursementModal = () => {
    const selectedItems = paginatedData.filter(
      (item) => selectedGrants.has(item.grantUid) && !getCheckboxDisabledState(item).disabled
    );
    if (selectedItems.length === 0) {
      toast.error("Please select grants with valid payout addresses and amounts");
      return;
    }
    disbursementModal.openFor(selectedItems);
  };

  const handleCreateDisbursementFromDetails = (grant: TableRow) => {
    closeDetails();
    disbursementModal.openFor([grant]);
  };

  const handleDataChanged = () => {
    refreshPayouts();
    setDataVersion((v) => v + 1);
  };

  const handleDisbursementSuccess = () => {
    setSelectedGrants(new Set());
    handleDataChanged();
  };

  if (isCommunityNotFound(communityError)) {
    redirect(PAGES.NOT_FOUND);
  }

  if (communityError) {
    return <ControlCenterCommunityError />;
  }

  if (!authReady || isLoadingCommunity || !community || loadingAdmin || isLoadingPayouts) {
    return <ControlCenterSkeleton />;
  }

  if (payoutsError && !payoutsData) {
    return <ControlCenterPayoutsError onRetry={refreshPayouts} />;
  }

  if (!hasAccess) {
    return <ControlCenterNotAuthorized communityName={community?.details?.name} />;
  }

  return (
    <div className="my-4 flex flex-col gap-6 w-full">
      <ControlCenterHeader />

      <FilterToolbar
        localSearch={localSearch}
        onLocalSearchChange={setLocalSearch}
        onSearch={() => navigate({ search: localSearch || null, page: "1" })}
        onProgramChange={(programId) => navigate({ programId, page: "1" })}
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
        onItemsPerPageChange={(value) => navigate({ limit: value, page: "1" })}
      />

      <BulkPayoutImportPanel
        communityUID={community?.uid ?? ""}
        tableRows={paginatedData}
        onApplyConfigs={handleApplyBulkConfigs}
        isApplying={saveBulkImportMutation.isPending}
      />

      <ControlCenterTable
        paginatedData={paginatedData}
        selectedGrants={selectedGrants}
        selectableGrants={selectableGrants}
        onSelectGrant={handleSelectGrant}
        onSelectAll={handleSelectAll}
        onOpenDetails={(item) => openDetails(item.grantUid)}
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
        hasActiveFilters={hasActiveFilters}
        onClearFilters={handleClearFilters}
        currentPage={currentPage}
        onPageChange={(page) => navigate({ page: page.toString() })}
        itemsPerPage={itemsPerPage}
        totalItems={kycFilter ? paginatedData.length : totalItems}
      />

      <CreateDisbursementModal
        isOpen={disbursementModal.isOpen}
        onClose={disbursementModal.close}
        communityUID={community?.uid || ""}
        grants={disbursementModal.grants}
        onSuccess={handleDisbursementSuccess}
      />

      <ControlCenterDetailsSidebar
        grant={detailsModalGrant}
        open={detailsModalOpen}
        onOpenChange={(nextOpen) => {
          if (nextOpen) setDetailsModalOpen(true);
          else closeDetails();
        }}
        communityUID={community?.uid || ""}
        dataVersion={dataVersion}
        invoiceRequiredMap={invoiceRequiredMap}
        kycStatuses={kycStatuses}
        disbursementMap={disbursementMap}
        agreementMap={agreementMap}
        invoiceMap={invoiceMap}
        payoutConfigMap={payoutConfigMap}
        onConfigSuccess={handleDataChanged}
        onCreateDisbursement={handleCreateDisbursementFromDetails}
      />

      <CreateDisbursementFab count={selectedGrants.size} onClick={handleOpenDisbursementModal} />
    </div>
  );
}
