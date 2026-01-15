"use client";

import { ArrowTopRightOnSquareIcon, ChevronRightIcon } from "@heroicons/react/24/outline";
import { Card, Metric, Text, Title } from "@tremor/react";
import Link from "next/link";
import { useState } from "react";
import { ExternalLink } from "@/components/Utilities/ExternalLink";
import { Spinner } from "@/components/Utilities/Spinner";
import { Badge } from "@/components/ui/badge";
import { NETWORKS, type SupportedChainId } from "@/config/tokens";
import { PAGES } from "@/utilities/pages";
import { cn } from "@/utilities/tailwind";
import {
  useAwaitingSignaturesDisbursements,
  usePendingDisbursements,
  useRecentCommunityDisbursements,
} from "../hooks/use-payout-disbursement";
import { type PayoutDisbursement, PayoutDisbursementStatus } from "../types/payout-disbursement";
import { formatTokenAmount } from "../utils/format-token-amount";

// Status configuration for badges
const STATUS_CONFIG: Record<PayoutDisbursementStatus, { bg: string; text: string; label: string }> =
  {
    [PayoutDisbursementStatus.CONFIGURED]: {
      bg: "bg-purple-100 dark:bg-purple-900/30",
      text: "text-purple-800 dark:text-purple-300",
      label: "Configured",
    },
    [PayoutDisbursementStatus.PENDING]: {
      bg: "bg-yellow-100 dark:bg-yellow-900/30",
      text: "text-yellow-800 dark:text-yellow-300",
      label: "Pending",
    },
    [PayoutDisbursementStatus.AWAITING_SIGNATURES]: {
      bg: "bg-blue-100 dark:bg-blue-900/30",
      text: "text-blue-800 dark:text-blue-300",
      label: "Awaiting Signatures",
    },
    [PayoutDisbursementStatus.DISBURSED]: {
      bg: "bg-green-100 dark:bg-green-900/30",
      text: "text-green-800 dark:text-green-300",
      label: "Disbursed",
    },
    [PayoutDisbursementStatus.CANCELLED]: {
      bg: "bg-gray-100 dark:bg-gray-700/50",
      text: "text-gray-800 dark:text-gray-300",
      label: "Cancelled",
    },
    [PayoutDisbursementStatus.FAILED]: {
      bg: "bg-red-100 dark:bg-red-900/30",
      text: "text-red-800 dark:text-red-300",
      label: "Failed",
    },
  };

// Helper functions
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function truncateAddress(address: string): string {
  if (!address) return "";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function getSafeUrl(safeAddress: string, txHash: string, chainId: number): string {
  const networkName = NETWORKS[chainId as SupportedChainId]?.name?.toLowerCase() || "mainnet";
  return `https://app.safe.global/transactions/tx?safe=${networkName}:${safeAddress}&id=multisig_${safeAddress}_${txHash}`;
}

// Props interfaces
interface PayoutDashboardWidgetsProps {
  communityUID: string;
  communitySlug?: string;
  safeAddress?: string;
}

interface PendingActionsWidgetProps {
  communityUID: string;
  communitySlug?: string;
}

interface AwaitingSignaturesWidgetProps {
  safeAddress: string;
}

interface RecentActivityWidgetProps {
  communityUID: string;
}

/**
 * Status badge component for disbursement status
 */
function StatusBadge({ status }: { status: PayoutDisbursementStatus }) {
  const config = STATUS_CONFIG[status];
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
        config.bg,
        config.text
      )}
    >
      {config.label}
    </span>
  );
}

/**
 * Pending Actions Widget
 * Shows count of PENDING disbursements for the community with a link to PayoutsAdminPage
 */
export function PendingActionsWidget({ communityUID, communitySlug }: PendingActionsWidgetProps) {
  const { data, isLoading, error } = usePendingDisbursements(communityUID, 1, 1, {
    enabled: !!communityUID,
  });

  const pendingCount = data?.pagination?.totalCount ?? 0;
  const payoutsPageUrl = PAGES.ADMIN.PAYOUTS(communitySlug || communityUID);

  return (
    <Card className="p-6">
      <div className="flex items-start justify-between">
        <div>
          <Text>Pending Disbursements</Text>
          {isLoading ? (
            <div className="mt-2">
              <Spinner className="w-6 h-6" />
            </div>
          ) : error ? (
            <Text className="text-red-500 mt-2">Failed to load</Text>
          ) : (
            <Metric className="mt-2">{pendingCount}</Metric>
          )}
        </div>
        <Link
          href={payoutsPageUrl}
          className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
        >
          View all
          <ChevronRightIcon className="w-4 h-4" />
        </Link>
      </div>
      {pendingCount > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-zinc-700">
          <Link
            href={payoutsPageUrl}
            className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
          >
            Process pending payouts
            <ArrowTopRightOnSquareIcon className="w-4 h-4" />
          </Link>
        </div>
      )}
    </Card>
  );
}

/**
 * Awaiting Signatures Widget
 * Lists disbursements in AWAITING_SIGNATURES status with Safe tx links
 */
export function AwaitingSignaturesWidget({ safeAddress }: AwaitingSignaturesWidgetProps) {
  const { data, isLoading, error } = useAwaitingSignaturesDisbursements(safeAddress, 1, 5, {
    enabled: !!safeAddress,
  });

  const disbursements = data?.payload ?? [];
  const totalCount = data?.pagination?.totalCount ?? 0;

  if (!safeAddress) {
    return (
      <Card className="p-6">
        <Title>Awaiting Signatures</Title>
        <Text className="mt-2 text-gray-500">No Safe address configured</Text>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <Title>Awaiting Signatures</Title>
          <Text className="text-gray-500 dark:text-gray-400">
            {totalCount} transaction{totalCount !== 1 ? "s" : ""} pending signatures
          </Text>
        </div>
        <Badge
          variant="secondary"
          className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
        >
          {totalCount}
        </Badge>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Spinner className="w-6 h-6" />
        </div>
      ) : error ? (
        <Text className="text-red-500">Failed to load awaiting signatures</Text>
      ) : disbursements.length === 0 ? (
        <Text className="text-gray-500 py-4">No transactions awaiting signatures</Text>
      ) : (
        <div className="space-y-3">
          {disbursements.map((disbursement) => (
            <AwaitingSignatureItem key={disbursement.id} disbursement={disbursement} />
          ))}
        </div>
      )}
    </Card>
  );
}

/**
 * Individual item in the Awaiting Signatures widget
 */
function AwaitingSignatureItem({ disbursement }: { disbursement: PayoutDisbursement }) {
  const safeUrl = disbursement.safeTransactionHash
    ? getSafeUrl(disbursement.safeAddress, disbursement.safeTransactionHash, disbursement.chainID)
    : null;

  return (
    <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-zinc-800 rounded-lg">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
          Grant: {truncateAddress(disbursement.grantUID)}
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {formatTokenAmount(disbursement.disbursedAmount, disbursement.tokenDecimals)}{" "}
          {disbursement.token}
        </p>
      </div>
      <div className="flex items-center gap-2 ml-4">
        {safeUrl && (
          <ExternalLink
            href={safeUrl}
            className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
          >
            Sign
            <ArrowTopRightOnSquareIcon className="w-4 h-4" />
          </ExternalLink>
        )}
      </div>
    </div>
  );
}

/**
 * Recent Activity Widget
 * Shows the last 5 disbursements across all statuses with optional status filter
 */
export function RecentActivityWidget({ communityUID }: RecentActivityWidgetProps) {
  const [statusFilter, setStatusFilter] = useState<string>("");

  const { data, isLoading, error } = useRecentCommunityDisbursements(
    communityUID,
    1,
    5,
    statusFilter || undefined,
    { enabled: !!communityUID }
  );

  const disbursements = data?.payload ?? [];

  const statusOptions = [
    { value: "", label: "All Statuses" },
    { value: PayoutDisbursementStatus.PENDING, label: "Pending" },
    { value: PayoutDisbursementStatus.AWAITING_SIGNATURES, label: "Awaiting Signatures" },
    { value: PayoutDisbursementStatus.DISBURSED, label: "Disbursed" },
    { value: PayoutDisbursementStatus.CANCELLED, label: "Cancelled" },
    { value: PayoutDisbursementStatus.FAILED, label: "Failed" },
  ];

  return (
    <Card className="p-6">
      <div className="flex items-start justify-between mb-4">
        <Title>Recent Activity</Title>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="text-sm border border-gray-300 dark:border-zinc-600 rounded-md px-2 py-1 bg-white dark:bg-zinc-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label="Filter by status"
        >
          {statusOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Spinner className="w-6 h-6" />
        </div>
      ) : error ? (
        <Text className="text-red-500">Failed to load recent activity</Text>
      ) : disbursements.length === 0 ? (
        <Text className="text-gray-500 py-4">No recent disbursements</Text>
      ) : (
        <div className="space-y-3">
          {disbursements.map((disbursement) => (
            <RecentActivityItem key={disbursement.id} disbursement={disbursement} />
          ))}
        </div>
      )}
    </Card>
  );
}

/**
 * Individual item in the Recent Activity widget
 */
function RecentActivityItem({ disbursement }: { disbursement: PayoutDisbursement }) {
  return (
    <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-zinc-800 rounded-lg">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <StatusBadge status={disbursement.status} />
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {formatDate(disbursement.createdAt)}
          </span>
        </div>
        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
          Grant: {truncateAddress(disbursement.grantUID)}
        </p>
      </div>
      <div className="text-right ml-4">
        <p className="text-sm font-semibold text-gray-900 dark:text-white">
          {formatTokenAmount(disbursement.disbursedAmount, disbursement.tokenDecimals)}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400">{disbursement.token}</p>
      </div>
    </div>
  );
}

/**
 * Combined Payout Dashboard Widgets
 * Renders all three widgets in a responsive grid layout
 */
export function PayoutDashboardWidgets({
  communityUID,
  communitySlug,
  safeAddress,
}: PayoutDashboardWidgetsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <PendingActionsWidget communityUID={communityUID} communitySlug={communitySlug} />
      {safeAddress && <AwaitingSignaturesWidget safeAddress={safeAddress} />}
      <RecentActivityWidget communityUID={communityUID} />
    </div>
  );
}

export default PayoutDashboardWidgets;
