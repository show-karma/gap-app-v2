"use client";

import { ChevronLeftIcon } from "@heroicons/react/20/solid";
import { BanknotesIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { isAddress } from "viem";
import { useAccount } from "wagmi";
import { ProgramFilter } from "@/components/Pages/Communities/Impact/ProgramFilter";
import { Button } from "@/components/Utilities/Button";
import { ExternalLink } from "@/components/Utilities/ExternalLink";
import { Spinner } from "@/components/Utilities/Spinner";
import TablePagination from "@/components/Utilities/TablePagination";
import { useCommunityAdminAccess } from "@/hooks/communities/useCommunityAdminAccess";
import { useCommunityDetails } from "@/hooks/communities/useCommunityDetails";
import { useAuth } from "@/hooks/useAuth";
import {
  AggregatedDisbursementStatus,
  type CommunityPayoutsOptions,
  CreateDisbursementModal,
  type GrantDisbursementInfo,
  type PayoutConfigItem,
  PayoutDisbursementStatus,
  PayoutHistoryDrawer,
  type SavePayoutConfigRequest,
  TokenBreakdown,
  type TokenTotal,
  useCommunityPayouts,
  useSavePayoutConfig,
} from "@/src/features/payout-disbursement";
import { MESSAGES } from "@/utilities/messages";
import { appNetwork } from "@/utilities/network";
import { PAGES } from "@/utilities/pages";
import { cn } from "@/utilities/tailwind";
import { type CsvParseResult, PayoutsCsvUpload } from "./PayoutsCsvUpload";

// Component-specific types
interface EditableFields {
  payoutAddress?: string;
  amount?: string;
}

interface PayoutsTableData {
  uid: string;
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

export default function PayoutsAdminPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { address } = useAccount();
  const { ready: authReady } = useAuth();
  const params = useParams();
  const communityId = params.communityId as string;

  // State for tracking edits
  const [editedFields, setEditedFields] = useState<Record<string, EditableFields>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  // State for row selection (for disbursement)
  const [selectedGrants, setSelectedGrants] = useState<Set<string>>(new Set());

  // State for disbursement modal
  const [isDisbursementModalOpen, setIsDisbursementModalOpen] = useState(false);
  const [grantsForDisbursement, setGrantsForDisbursement] = useState<GrantDisbursementInfo[]>([]);

  // State for payout history drawer
  const [isHistoryDrawerOpen, setIsHistoryDrawerOpen] = useState(false);
  const [historyGrant, setHistoryGrant] = useState<{
    grantUID: string;
    grantName: string;
    projectName: string;
    approvedAmount?: string;
  } | null>(null);

  // Get values from URL params or use defaults
  const selectedProgramId = searchParams.get("programId");
  const itemsPerPage = Number(searchParams.get("limit")) || 200;
  const currentPage = Number(searchParams.get("page")) || 1;

  // Create URLSearchParams utility function
  const createQueryString = useCallback(
    (params: Record<string, string | null>) => {
      const newSearchParams = new URLSearchParams(searchParams.toString());

      Object.entries(params).forEach(([key, value]) => {
        if (value === null || value === "") {
          newSearchParams.delete(key);
        } else {
          newSearchParams.set(key, value);
        }
      });

      return newSearchParams.toString();
    },
    [searchParams]
  );

  // Fetch community details
  const {
    data: community,
    isLoading: isLoadingCommunity,
    error: communityError,
  } = useCommunityDetails(communityId);

  const { hasAccess, isLoading: loadingAdmin } = useCommunityAdminAccess(community?.uid);

  // Extract the actual programId from the composite value (programId_chainId)
  const actualProgramId = selectedProgramId?.split("_")[0] || null;

  // Build options for the community payouts query
  const payoutsOptions: CommunityPayoutsOptions = {
    page: currentPage,
    limit: itemsPerPage,
    filters: actualProgramId ? { programId: actualProgramId } : undefined,
  };

  // Fetch payouts data with filter and pagination using the new endpoint
  // Wait for auth to be ready to ensure JWT is available
  const {
    data: payoutsData,
    isLoading: isLoadingPayouts,
    invalidate: refreshPayouts,
  } = useCommunityPayouts(community?.uid || "", payoutsOptions, {
    enabled: !!community?.uid && authReady,
  });

  const payouts = payoutsData?.payload || [];
  const totalItems = payoutsData?.pagination?.totalCount || 0;

  // Save payout config mutation (saves to payout_grant_config collection)
  const { mutate: saveConfigs, isPending: isSaving } = useSavePayoutConfig();

  // Process payouts into table data format
  const tableData: PayoutsTableData[] = useMemo(() => {
    return payouts.map((payout) => {
      return {
        uid: payout.grant.uid,
        projectUid: payout.project.uid,
        projectName: payout.project.title,
        projectSlug: payout.project.slug,
        grantName: payout.grant.title,
        grantProgramId: payout.grant.programId || "",
        grantChainId: payout.grant.chainID,
        projectChainId: payout.project.chainID,
        // Use admin-set values from attestation table (separate from project/grant native data)
        currentPayoutAddress: payout.project.adminPayoutAddress || "",
        currentAmount: payout.grant.adminPayoutAmount || "",
      };
    });
  }, [payouts]);

  // Create a map of grant UID to disbursement info from the payouts response
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

  // Since we're now using backend pagination, we don't need to filter or paginate client-side
  const paginatedData = tableData;

  // Helper to compute display status based on aggregated status from API
  // Priority:
  // 1. "Awaiting Signatures" - if latest transaction is awaiting signatures
  // 2. "Disbursed" - if total grant is fulfilled (COMPLETED)
  // 3. "Partially Disbursed" - if has at least one disbursed transaction but not completed
  // 4. "Cancelled" - only if ALL transactions are cancelled
  // 5. "Failed" - if latest transaction failed
  // 6. "Pending" - default
  const computeDisplayStatus = useCallback(
    (
      item: PayoutsTableData,
      disbursementInfo?: { totalsByToken: TokenTotal[]; status: string; history: any[] }
    ): { label: string; color: string } => {
      const aggregatedStatus = disbursementInfo?.status;
      const history = disbursementInfo?.history || [];
      const latestDisbursement = history[0];

      // If no history, default to Pending
      if (history.length === 0) {
        return { label: "Pending", color: "text-gray-500 bg-gray-100 dark:bg-gray-700" };
      }

      // Check if any transaction has been disbursed
      const hasDisbursedTransaction = history.some(
        (d) => d.status === PayoutDisbursementStatus.DISBURSED
      );

      // Check if ALL transactions are cancelled
      const allCancelled = history.every((d) => d.status === PayoutDisbursementStatus.CANCELLED);

      // Priority 1: If the latest transaction is awaiting signatures, show that
      if (latestDisbursement?.status === PayoutDisbursementStatus.AWAITING_SIGNATURES) {
        return {
          label: "Awaiting Signatures",
          color: "text-yellow-700 bg-yellow-100 dark:bg-yellow-900/30",
        };
      }

      // Priority 2: If total grant is fulfilled (COMPLETED), show Disbursed
      if (aggregatedStatus === AggregatedDisbursementStatus.COMPLETED) {
        return { label: "Disbursed", color: "text-green-700 bg-green-100 dark:bg-green-900/30" };
      }

      // Priority 3: If there's at least one disbursed transaction (but not completed), show Partially Disbursed
      if (hasDisbursedTransaction) {
        return {
          label: "Partially Disbursed",
          color: "text-blue-700 bg-blue-100 dark:bg-blue-900/30",
        };
      }

      // Priority 4: Only show Cancelled if ALL transactions are cancelled
      if (allCancelled) {
        return { label: "Cancelled", color: "text-gray-700 bg-gray-200 dark:bg-gray-600" };
      }

      // Priority 5: If latest is failed, show Failed
      if (latestDisbursement?.status === PayoutDisbursementStatus.FAILED) {
        return { label: "Failed", color: "text-red-700 bg-red-100 dark:bg-red-900/30" };
      }

      // Default to Pending
      return { label: "Pending", color: "text-gray-500 bg-gray-100 dark:bg-gray-700" };
    },
    []
  );

  // URL param update handlers
  const handleProgramChange = (programId: string | null) => {
    const query = createQueryString({
      programId: programId,
      page: "1", // Reset to first page when changing program
    });
    router.push(`${pathname}?${query}`);
  };

  const handleItemsPerPageChange = (limit: number) => {
    const query = createQueryString({
      limit: limit.toString(),
      page: "1", // Reset to first page when changing items per page
    });
    router.push(`${pathname}?${query}`);
  };

  const handlePageChange = (page: number) => {
    const query = createQueryString({
      page: page.toString(),
    });
    router.push(`${pathname}?${query}`);
  };

  // Handle field changes
  const handleFieldChange = (uid: string, field: keyof EditableFields, value: string) => {
    setEditedFields((prev) => ({
      ...prev,
      [uid]: {
        ...prev[uid],
        [field]: value,
      },
    }));

    // Clear error when user starts typing
    setErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[`${uid}-${field}`];
      return newErrors;
    });
  };

  // Validate a single field
  const validateField = (uid: string, field: keyof EditableFields, value: string): boolean => {
    if (field === "payoutAddress" && value) {
      if (!isAddress(value)) {
        setErrors((prev) => ({
          ...prev,
          [`${uid}-${field}`]: "Invalid Ethereum address",
        }));
        return false;
      }
    }

    if (field === "amount" && value) {
      if (!/^\d+(\.\d{1,18})?$/.test(value)) {
        setErrors((prev) => ({
          ...prev,
          [`${uid}-${field}`]: "Must be a valid number with up to 18 decimal places",
        }));
        return false;
      }
    }

    return true;
  };

  // State to store last CSV result for display
  const [lastCsvResult, setLastCsvResult] = useState<{
    unmatchedProjects: string[];
  } | null>(null);

  // Handle CSV data
  const handleCsvData = useCallback(
    (parseResult: CsvParseResult) => {
      const unmatchedProjects: string[] = [];
      let matchedCount = 0;

      // Clear previous results when new CSV is uploaded
      setLastCsvResult(null);

      // Use functional state update to avoid stale closure issues
      setEditedFields((prevEditedFields) => {
        const newEditedFields = { ...prevEditedFields };

        parseResult.data.forEach((csvRow) => {
          // Find matching project in table data
          const matchingProject = tableData.find((item) => item.projectSlug === csvRow.projectSlug);

          if (matchingProject) {
            matchedCount++;
            newEditedFields[matchingProject.uid] = {
              ...newEditedFields[matchingProject.uid],
              payoutAddress: csvRow.payoutAddress,
              amount: csvRow.amount,
            };
          } else {
            unmatchedProjects.push(csvRow.projectSlug);
          }
        });

        return newEditedFields;
      });

      // Store unmatched projects for display
      setLastCsvResult({ unmatchedProjects });

      // Show feedback about matches
      if (matchedCount > 0) {
        toast.success(`Matched ${matchedCount} projects`);
      }

      if (unmatchedProjects.length > 0) {
        console.warn("Unmatched projects:", unmatchedProjects);
      }
    },
    [tableData]
  );

  // Handle example CSV download
  const handleDownloadExampleCsv = useCallback(() => {
    // Create example CSV data with actual project slugs from current data
    const exampleData = tableData.slice(0, 3).map((item, index) => ({
      projectSlug: item.projectSlug,
      payoutAddress: `0x${"1".repeat(40)}`, // Example address
      amount: `${(index + 1) * 100}.00`, // Example amounts: 100.00, 200.00, 300.00
    }));

    // If no data available, create generic examples
    if (exampleData.length === 0) {
      exampleData.push(
        {
          projectSlug: "https://karmahq.xyz/project/example-project-1",
          payoutAddress: "0x1111111111111111111111111111111111111111",
          amount: "100.00",
        },
        {
          projectSlug: "https://karmahq.xyz/project/example-project-2",
          payoutAddress: "0x2222222222222222222222222222222222222222",
          amount: "200.00",
        },
        {
          projectSlug: "https://karmahq.xyz/project/example-project-3",
          payoutAddress: "0x3333333333333333333333333333333333333333",
          amount: "300.00",
        }
      );
    }

    // Convert to CSV format
    const csvHeader = "Project URL,Wallet Address,Amount\n";
    const csvRows = exampleData
      .map((row) => `${row.projectSlug},${row.payoutAddress},${row.amount}`)
      .join("\n");
    const csvContent = csvHeader + csvRows;

    // Create and trigger download
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "payouts-example.csv");
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [tableData]);

  // Check if a grant is ready for disbursement (has payout address and amount)
  const isGrantReadyForDisbursement = useCallback(
    (item: PayoutsTableData): boolean => {
      const payoutAddress = editedFields[item.uid]?.payoutAddress ?? item.currentPayoutAddress;
      const amount = editedFields[item.uid]?.amount ?? item.currentAmount;
      return !!(payoutAddress && isAddress(payoutAddress) && amount && parseFloat(amount) > 0);
    },
    [editedFields]
  );

  // Check if a grant's checkbox should be disabled (missing payout address or amount = 0)
  // Returns { disabled: boolean, reason: string | null }
  const getCheckboxDisabledState = useCallback(
    (item: PayoutsTableData): { disabled: boolean; reason: string | null } => {
      const payoutAddress = editedFields[item.uid]?.payoutAddress ?? item.currentPayoutAddress;
      const amount = editedFields[item.uid]?.amount ?? item.currentAmount;
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

      return { disabled: false, reason: null };
    },
    [editedFields]
  );

  // Get all selectable grants (those with valid payout address and amount > 0)
  const selectableGrants = useMemo(() => {
    return paginatedData.filter((item) => !getCheckboxDisabledState(item).disabled);
  }, [paginatedData, getCheckboxDisabledState]);

  // Selection handlers
  const handleSelectGrant = (uid: string, checked: boolean) => {
    setSelectedGrants((prev) => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(uid);
      } else {
        newSet.delete(uid);
      }
      return newSet;
    });
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      // Only select grants that have valid payout address AND amount > 0
      setSelectedGrants(new Set(selectableGrants.map((item) => item.uid)));
    } else {
      setSelectedGrants(new Set());
    }
  };

  // Open disbursement modal for selected grants
  const handleOpenDisbursementModal = () => {
    const selectedItems = paginatedData.filter(
      (item) => selectedGrants.has(item.uid) && isGrantReadyForDisbursement(item)
    );

    if (selectedItems.length === 0) {
      toast.error("Please select grants with valid payout addresses and amounts");
      return;
    }

    const grantsInfo: GrantDisbursementInfo[] = selectedItems.map((item) => {
      // Use the same logic as the input display: prefer editedFields if the key exists
      const hasEditedPayoutAddress = editedFields[item.uid]?.hasOwnProperty("payoutAddress");
      const hasEditedAmount = editedFields[item.uid]?.hasOwnProperty("amount");

      const payoutAddress = hasEditedPayoutAddress
        ? editedFields[item.uid].payoutAddress || ""
        : item.currentPayoutAddress || "";

      const approvedAmount = hasEditedAmount
        ? editedFields[item.uid].amount || "0"
        : item.currentAmount || "0";

      return {
        grantUID: item.uid,
        projectUID: item.projectUid,
        grantName: item.grantName,
        projectName: item.projectName,
        payoutAddress,
        approvedAmount,
        // Pass totalsByToken so the modal can correctly calculate remaining amount
        // (converts from raw BigInt to human-readable using token decimals)
        totalsByToken: disbursementMap[item.uid]?.totalsByToken || [],
      };
    });

    setGrantsForDisbursement(grantsInfo);
    setIsDisbursementModalOpen(true);
  };

  // Open history drawer for a specific grant
  const handleOpenHistoryDrawer = (item: PayoutsTableData) => {
    // Use the same logic as the input display: prefer editedFields if the key exists
    const hasEditedAmount = editedFields[item.uid]?.hasOwnProperty("amount");
    const approvedAmount = hasEditedAmount
      ? editedFields[item.uid].amount || "0"
      : item.currentAmount || "0";

    setHistoryGrant({
      grantUID: item.uid,
      grantName: item.grantName,
      projectName: item.projectName,
      approvedAmount,
    });
    setIsHistoryDrawerOpen(true);
  };

  // Handle disbursement modal close
  const handleDisbursementModalClose = () => {
    setIsDisbursementModalOpen(false);
    setGrantsForDisbursement([]);
  };

  // Handle disbursement success
  const handleDisbursementSuccess = () => {
    // Clear selection after successful disbursement
    setSelectedGrants(new Set());
    // Refresh grants data
    refreshPayouts();
  };

  // Handle save - saves payout config to payout_grant_config collection
  const handleSave = async () => {
    // Clear all errors
    setErrors({});

    // Prepare payout configs
    const configs: PayoutConfigItem[] = [];
    let hasValidationError = false;

    Object.entries(editedFields).forEach(([grantUID, fields]) => {
      const item = tableData.find((d) => d.uid === grantUID);
      if (!item) return;

      // Validate fields
      if (Object.hasOwn(fields, "payoutAddress")) {
        // Allow empty string to clear the field
        if (
          fields.payoutAddress &&
          !validateField(grantUID, "payoutAddress", fields.payoutAddress)
        ) {
          hasValidationError = true;
          return;
        }
      }

      if (Object.hasOwn(fields, "amount")) {
        // Allow empty string to clear the field
        if (fields.amount && !validateField(grantUID, "amount", fields.amount)) {
          hasValidationError = true;
          return;
        }
      }

      // Build the config item with both payoutAddress and totalGrantAmount
      const configItem: PayoutConfigItem = {
        grantUID,
        projectUID: item.projectUid,
      };

      // Include payoutAddress if edited or use current value
      if (Object.hasOwn(fields, "payoutAddress")) {
        configItem.payoutAddress = fields.payoutAddress || undefined;
      } else if (item.currentPayoutAddress) {
        configItem.payoutAddress = item.currentPayoutAddress;
      }

      // Include totalGrantAmount if edited or use current value
      if (Object.hasOwn(fields, "amount")) {
        configItem.totalGrantAmount = fields.amount || undefined;
      } else if (item.currentAmount) {
        configItem.totalGrantAmount = item.currentAmount;
      }

      configs.push(configItem);
    });

    if (hasValidationError) {
      toast.error("Please fix validation errors before saving");
      return;
    }

    if (configs.length === 0) {
      toast.error("No changes to save");
      return;
    }

    // Execute save payout config
    const request: SavePayoutConfigRequest = {
      configs,
      communityUID: community?.uid || "",
    };

    saveConfigs(request, {
      onSuccess: (data) => {
        const { success, failed } = data;

        if (success.length > 0) {
          toast.success(`Successfully saved ${success.length} payout config(s)`);
        }

        if (failed.length > 0) {
          toast.error(`Failed to save ${failed.length} config(s)`);
        }

        // Clear edited fields for successful saves only
        setEditedFields((prev) => {
          const newEdited = { ...prev };
          success.forEach((config) => {
            delete newEdited[config.grantUID];
          });
          return newEdited;
        });

        // Note: No need to call refreshPayouts() here - the useSavePayoutConfig hook
        // already invalidates the communityPayouts query on success
      },
      onError: (error) => {
        toast.error(error.message || "Failed to save payout configs");
      },
    });
  };

  // Handle errors
  useEffect(() => {
    if (
      communityError?.message === "Community not found" ||
      communityError?.message?.includes("422")
    ) {
      router.push(PAGES.NOT_FOUND);
    }
  }, [communityError, router]);

  // Loading state
  if (!authReady || loadingAdmin || isLoadingPayouts || isLoadingCommunity) {
    return (
      <div className="flex w-full items-center justify-center h-96">
        <Spinner />
      </div>
    );
  }

  // Not authorized state
  if (!hasAccess) {
    return (
      <div className="flex w-full items-center justify-center h-96">
        <p className="text-lg">{MESSAGES.ADMIN.NOT_AUTHORIZED(community?.uid || "")}</p>
      </div>
    );
  }

  const hasChanges = Object.keys(editedFields).length > 0;

  return (
    <div className="my-4 flex gap-8 flex-row max-lg:flex-col-reverse w-full">
      <div className="w-full flex flex-col gap-8">
        <div className="w-full flex flex-wrap flex-row items-center justify-between px-4">
          <Link href={PAGES.ADMIN.ROOT(community?.details?.slug || (community?.uid as string))}>
            <Button className="flex flex-row items-center gap-2 px-0 py-2 bg-transparent text-black dark:text-white dark:bg-transparent hover:bg-transparent rounded-md transition-all ease-in-out duration-200">
              <ChevronLeftIcon className="h-5 w-5" />
              Return to admin page
            </Button>
          </Link>
          <div className="flex flex-row flex-wrap justify-between items-center gap-4">
            <div className="flex items-center gap-4">
              <ProgramFilter onChange={handleProgramChange} />
            </div>
            <div className="flex items-center gap-2">
              <p className="text-sm text-gray-600 dark:text-gray-400">Show</p>
              <select
                className="border border-gray-300 dark:border-zinc-700 rounded-md px-3 py-1.5 pr-8 bg-white dark:bg-zinc-800 text-gray-900 dark:text-white"
                value={itemsPerPage}
                onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
              >
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={200}>200</option>
              </select>
              <p className="text-sm text-gray-600 dark:text-gray-400">entries</p>
            </div>
          </div>
        </div>

        {selectedProgramId && (
          <div className="px-4">
            <PayoutsCsvUpload
              onDataParsed={handleCsvData}
              disabled={isSaving}
              unmatchedProjects={lastCsvResult?.unmatchedProjects}
              onDownloadExample={handleDownloadExampleCsv}
            />
          </div>
        )}

        <div className="px-4">
          <div className="flex flex-col justify-center w-full max-w-full overflow-x-auto rounded-md border">
            <table className="pt-3 min-w-full divide-y dark:bg-zinc-900 divide-gray-300 dark:divide-zinc-800 dark:text-white">
              <thead>
                <tr className="border-b transition-colors text-gray-500 dark:text-gray-200 hover:bg-muted/50">
                  <th scope="col" className="h-12 px-2 text-center align-middle font-medium w-12">
                    <input
                      type="checkbox"
                      className={cn(
                        "h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500",
                        selectableGrants.length === 0 && "opacity-50 cursor-not-allowed"
                      )}
                      checked={
                        selectableGrants.length > 0 &&
                        selectableGrants.every((item) => selectedGrants.has(item.uid))
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
                  <th scope="col" className="h-12 px-4 text-left align-middle font-medium">
                    Project
                  </th>
                  <th scope="col" className="h-12 px-4 text-left align-middle font-medium">
                    Grant
                  </th>
                  <th scope="col" className="h-12 px-4 text-left align-middle font-medium">
                    Payout Address
                  </th>
                  <th scope="col" className="h-12 px-4 text-left align-middle font-medium">
                    Total Grant
                  </th>
                  <th scope="col" className="h-12 px-4 text-left align-middle font-medium">
                    Total Disbursed to Date
                  </th>
                  <th scope="col" className="h-12 px-4 text-center align-middle font-medium w-32">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="px-4 divide-y divide-gray-200 dark:divide-zinc-800">
                {paginatedData.map((item) => {
                  const fieldId = item.uid;
                  const payoutError = errors[`${fieldId}-payoutAddress`];
                  const amountError = errors[`${fieldId}-amount`];
                  const disbursementInfo = disbursementMap[item.uid];
                  const totalsByToken = disbursementInfo?.totalsByToken || [];
                  const displayStatus = computeDisplayStatus(item, disbursementInfo);

                  // Check if checkbox should be disabled
                  const checkboxState = getCheckboxDisabledState(item);

                  return (
                    <tr
                      key={`${item.uid}-${item.projectUid}`}
                      className={cn(
                        "dark:text-zinc-300 text-gray-900 px-4 py-4",
                        selectedGrants.has(item.uid) && "bg-blue-50 dark:bg-blue-900/20",
                        checkboxState.disabled && "opacity-60"
                      )}
                    >
                      <td className="px-2 py-2 text-center">
                        <input
                          type="checkbox"
                          className={cn(
                            "h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500",
                            checkboxState.disabled && "opacity-50 cursor-not-allowed"
                          )}
                          checked={selectedGrants.has(item.uid)}
                          onChange={(e) => handleSelectGrant(item.uid, e.target.checked)}
                          disabled={checkboxState.disabled}
                          title={checkboxState.reason || "Select for disbursement"}
                        />
                      </td>
                      <td className="px-4 py-2 font-medium h-16">
                        <ExternalLink
                          href={PAGES.PROJECT.OVERVIEW(item.projectSlug || item.projectUid)}
                          className="max-w-full line-clamp-2 underline"
                        >
                          {item.projectName}
                        </ExternalLink>
                      </td>
                      <td className="px-4 py-2">
                        <ExternalLink
                          href={PAGES.PROJECT.GRANT(item.projectSlug || item.projectUid, item.uid)}
                          className="max-w-full line-clamp-2 underline"
                        >
                          {item.grantName}
                        </ExternalLink>
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex flex-col gap-1">
                          <input
                            type="text"
                            className={cn(
                              "w-full px-3 py-2 border rounded-md bg-transparent placeholder:text-gray-400",
                              "focus:outline-none focus:ring-2 focus:ring-blue-500",
                              "dark:border-zinc-700 dark:text-white",
                              payoutError ? "border-red-500" : "border-gray-300"
                            )}
                            placeholder="Enter payout address"
                            value={
                              editedFields[fieldId]?.hasOwnProperty("payoutAddress")
                                ? editedFields[fieldId].payoutAddress
                                : item.currentPayoutAddress || ""
                            }
                            onChange={(e) =>
                              handleFieldChange(fieldId, "payoutAddress", e.target.value)
                            }
                            disabled={isSaving}
                          />
                          {payoutError && (
                            <span className="text-red-500 text-sm">{payoutError}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex flex-col gap-1">
                          <input
                            type="text"
                            className={cn(
                              "w-full px-3 py-2 border rounded-md bg-transparent placeholder:text-gray-400",
                              "focus:outline-none focus:ring-2 focus:ring-blue-500",
                              "dark:border-zinc-700 dark:text-white",
                              amountError ? "border-red-500" : "border-gray-300"
                            )}
                            placeholder="0"
                            value={
                              editedFields[fieldId]?.hasOwnProperty("amount")
                                ? editedFields[fieldId].amount
                                : item.currentAmount || ""
                            }
                            onChange={(e) => handleFieldChange(fieldId, "amount", e.target.value)}
                            disabled={isSaving}
                          />
                          {amountError && (
                            <span className="text-red-500 text-sm">{amountError}</span>
                          )}
                        </div>
                      </td>
                      {/* Disbursed Amount column */}
                      <td className="px-4 py-2 text-left">
                        <TokenBreakdown totalsByToken={totalsByToken} size="sm" />
                      </td>
                      {/* Status column - clickable to open history */}
                      <td className="px-4 py-2 text-center">
                        <button
                          onClick={() => handleOpenHistoryDrawer(item)}
                          className={cn(
                            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium cursor-pointer hover:opacity-80 transition-opacity",
                            displayStatus.color
                          )}
                          title="Click to view payout history"
                        >
                          {displayStatus.label}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Footer with pagination and save button */}
            <div className="dark:bg-zinc-900 flex flex-col pb-4 items-end">
              <div className="w-full">
                <TablePagination
                  currentPage={currentPage}
                  setCurrentPage={handlePageChange}
                  postsPerPage={itemsPerPage}
                  totalPosts={totalItems}
                />
              </div>
            </div>
          </div>
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

      {/* Floating Action Buttons - Save and Create Disbursement */}
      {(hasChanges || selectedGrants.size > 0) && (
        <div className="fixed bottom-6 right-6 z-40 animate-in slide-in-from-bottom-4 fade-in duration-300 flex items-center gap-3">
          {/* Save Button - only show if there are unsaved changes */}
          {hasChanges && (
            <Button
              disabled={isSaving || Object.keys(errors).length > 0}
              onClick={handleSave}
              className="flex items-center gap-2 px-6 py-4 bg-gray-600 hover:bg-gray-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 text-base font-semibold disabled:opacity-50"
            >
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          )}
          {/* Create Disbursement Button - only show if grants are selected */}
          {selectedGrants.size > 0 && (
            <Button
              onClick={handleOpenDisbursementModal}
              className="flex items-center gap-3 px-6 py-4 bg-brand-blue hover:bg-brand-blue/80 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 text-base font-semibold"
            >
              <BanknotesIcon className="h-6 w-6" />
              Create Disbursement ({selectedGrants.size})
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
