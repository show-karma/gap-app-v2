"use client";

import { ArrowUturnLeftIcon, ChevronDownIcon, NoSymbolIcon } from "@heroicons/react/24/solid";
import React, { useState } from "react";
import {
  getEffectiveKycStatus,
  getKycBadgeLabel,
  KYC_BADGE_BASE,
  KycStatusBadge,
  KycStatusIcon,
  KycTooltipContent,
  kycBadgeColors,
} from "@/components/KycStatusIcon";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useSetKycApplicability } from "@/hooks/useKycStatus";
import { useHasRoleOrHigher } from "@/src/core/rbac/context/permission-context";
import { Role } from "@/src/core/rbac/types/role";
import { type KycStatusResponse, KycVerificationStatus, KycVerificationType } from "@/types/kyc";
import { cn } from "@/utilities/tailwind";

/**
 * The applicability toggle is available only while no verification signal
 * exists — any real Treova status (PENDING/OUTREACH/VERIFIED/REJECTED/EXPIRED)
 * renders the plain read-only badge, so the UI never offers an action the
 * server would reject.
 */
const TOGGLEABLE_STATUSES = new Set<KycVerificationStatus>([
  KycVerificationStatus.NOT_STARTED,
  KycVerificationStatus.NOT_APPLICABLE,
]);

const INTERACTIVE_BADGE_CLASSES = [
  "group cursor-pointer transition-shadow duration-150 motion-reduce:transition-none",
  "hover:ring-1 hover:ring-inset hover:ring-black/10 dark:hover:ring-white/20",
  "data-[state=open]:ring-1 data-[state=open]:ring-inset data-[state=open]:ring-black/20 dark:data-[state=open]:ring-white/30",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-1 dark:focus-visible:ring-offset-zinc-900",
  "disabled:opacity-70 disabled:pointer-events-none",
].join(" ");

interface KycStatusBadgeWithActionsProps {
  status: KycStatusResponse | null;
  /** The application's reference number (APP-...) — the endpoint's only key. */
  applicationReference: string;
  className?: string;
  showValidityInLabel?: boolean;
}

/**
 * KYC status badge that lets community admins toggle an application between
 * "Not started" and "Not applicable" from a one-item menu on the pill itself.
 *
 * Fail-closed: non-admins, viewers whose permissions are still resolving, and
 * statuses outside the toggle pair all get the plain read-only KycStatusBadge.
 */
function KycStatusBadgeWithActionsComponent({
  status,
  applicationReference,
  className,
  showValidityInLabel = true,
}: KycStatusBadgeWithActionsProps) {
  // Returns false while permissions resolve — read-only badge, no flash
  const isCommunityAdmin = useHasRoleOrHigher(Role.COMMUNITY_ADMIN);
  const [menuOpen, setMenuOpen] = useState(false);
  const [tooltipOpen, setTooltipOpen] = useState(false);
  const { mutate, isPending } = useSetKycApplicability();

  const effectiveStatus = getEffectiveKycStatus(status);
  const canToggle = TOGGLEABLE_STATUSES.has(effectiveStatus);

  if (!isCommunityAdmin || !canToggle) {
    return (
      <KycStatusBadge
        status={status}
        className={className}
        showValidityInLabel={showValidityInLabel}
      />
    );
  }

  const badgeLabel = getKycBadgeLabel(status, effectiveStatus, showValidityInLabel);
  const isNotApplicable = effectiveStatus === KycVerificationStatus.NOT_APPLICABLE;

  const handleToggleApplicability = () => {
    mutate({
      applicationReference,
      // Advisory only — the server preserves the existing row's type
      verificationType: status?.verificationType ?? KycVerificationType.KYC,
      status: isNotApplicable
        ? KycVerificationStatus.NOT_STARTED
        : KycVerificationStatus.NOT_APPLICABLE,
    });
  };

  return (
    <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
      <TooltipProvider>
        {/* Fully controlled so the tooltip stays suppressed while the menu is
            open and doesn't re-fire when Radix returns focus on menu close */}
        <Tooltip open={tooltipOpen && !menuOpen} onOpenChange={setTooltipOpen}>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                disabled={isPending}
                aria-busy={isPending || undefined}
                aria-haspopup="menu"
                aria-label={`Change ${badgeLabel} status`}
                className={cn(
                  KYC_BADGE_BASE,
                  kycBadgeColors[effectiveStatus],
                  INTERACTIVE_BADGE_CLASSES,
                  className
                )}
              >
                <KycStatusIcon status={status} size="sm" showTooltip={false} />
                <span>{badgeLabel}</span>
                <ChevronDownIcon
                  className="h-3 w-3 opacity-50 transition-transform duration-150 motion-reduce:transition-none group-data-[state=open]:rotate-180"
                  aria-hidden="true"
                />
              </button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-sm">
            <KycTooltipContent status={status} showDates={!showValidityInLabel} />
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <DropdownMenuContent align="start" sideOffset={6} className="min-w-[240px]">
        {isNotApplicable ? (
          <DropdownMenuItem onSelect={handleToggleApplicability}>
            <ArrowUturnLeftIcon aria-hidden="true" />
            <span>Reset to Not started</span>
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem onSelect={handleToggleApplicability} className="items-start">
            <NoSymbolIcon aria-hidden="true" className="mt-0.5" />
            <span className="flex flex-col gap-0.5">
              <span>Mark as Not applicable</span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                KYC/KYB isn&apos;t required for this application
              </span>
            </span>
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export const KycStatusBadgeWithActions = React.memo(KycStatusBadgeWithActionsComponent);
KycStatusBadgeWithActions.displayName = "KycStatusBadgeWithActions";
