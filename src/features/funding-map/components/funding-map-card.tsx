"use client";

import { Calendar, Coins } from "lucide-react";
import Image from "next/image";
import { type KeyboardEvent, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import Link from "@/src/components/navigation/Link";
import { track } from "@/utilities/analytics/client";
import { formatDate } from "@/utilities/formatDate";
import { cn } from "@/utilities/tailwind";
import type { FundingProgramResponse, OpportunityType } from "../types/funding-program";
import { formatBudgetValue } from "../utils/format-budget";
import { isValidImageUrl } from "../utils/image-utils";
import { CardTypeDetails } from "./card-type-details";
import { FundingMapDescription } from "./funding-map-description";
import { GrantTypeBadges } from "./grant-type-badges";
import { OnKarmaBadge } from "./on-karma-badge";

interface FundingMapCardProps {
  program: FundingProgramResponse;
  onClick?: () => void;
  /** URL to navigate to when the card is clicked (takes precedence over onClick) */
  href?: string;
  /** Hide the description section */
  hideDescription?: boolean;
  /** Hide the categories section */
  hideCategories?: boolean;
  /** Optional element rendered next to the OnKarma badge in the top-right */
  statusSlot?: React.ReactNode;
  /** Position of the card in the grid (0-indexed) */
  cardPosition?: number;
}

/**
 * Determines if the program needs a pending review indicator (ring).
 * Shows ring for programs that are pending validation and still active.
 */
/**
 * `nowMs` is passed in rather than read here: `new Date()` during render is an
 * unstable value and cacheComponents rejects it. `null` means the clock is not
 * known yet (prerender, and the first client render), and the ring simply does
 * not show until it is.
 */
function isPendingReview(program: FundingProgramResponse, nowMs: number | null): boolean {
  const isValidated = program.isValid;
  const isInactive = program.metadata?.status === "inactive";
  const endsAt = program.metadata?.endsAt;
  const hasEnded = endsAt !== undefined && nowMs !== null && new Date(endsAt).getTime() < nowMs;

  // Show ring only for programs that are not validated, not inactive, and not ended
  return !isValidated && !isInactive && !hasEnded;
}

export function FundingMapCard({
  program,
  onClick,
  href,
  hideDescription = false,
  hideCategories = false,
  statusSlot,
  cardPosition,
  className,
}: FundingMapCardProps & { className?: string }) {
  const { metadata, isOnKarma, communities } = program;
  const opportunityType: OpportunityType = program.type ?? "grant";
  const isNonGrant = opportunityType !== "grant";

  const title = metadata?.title;
  const description = metadata?.description;
  const grantTypes = metadata?.grantTypes;
  const organizations = metadata?.organizations;
  const endsAt = formatDate(metadata?.endsAt, "UTC", "MMM D, YYYY");
  // `new Date()` during render is an unstable value and cacheComponents rejects
  // it (blocking-prerender-current-time-client). This card sits above the
  // crawlable list, so it cannot go behind a boundary — the comparison moves to
  // after hydration, which is also when "has it ended" becomes a question about
  // the reader's clock rather than the build's.
  const [nowMs, setNowMs] = useState<number | null>(null);
  useEffect(() => {
    setNowMs(Date.now());
  }, []);
  const endsAtMs = metadata?.endsAt ? new Date(metadata.endsAt).getTime() : null;
  const hasEnded = endsAtMs !== null && nowMs !== null && endsAtMs < nowMs;

  // Check if we have valid communities with names
  const validCommunities = communities?.filter((c) => c.name && c.name.trim().length > 0) ?? [];

  // Fallback to organizations if no communities
  const fallbackName =
    organizations?.filter((org): org is string => typeof org === "string").join(", ") ?? "";

  const categories = metadata?.categories;

  // Format budget for display - using same logic as details dialog
  const budget = metadata?.programBudget;
  const formattedBudget = formatBudgetValue(budget);

  const handleClick = () => {
    track("funding_map_card_clicked", {
      program_id: program.programId ?? "",
      position: cardPosition ?? null,
    });
    onClick?.();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      if (event.key === " ") {
        event.preventDefault();
      }
      handleClick();
    }
  };

  const cardClassName = cn(
    "flex flex-col justify-between border-border p-6 shadow-sm transition-shadow hover:shadow-md cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
    "h-full",
    isPendingReview(program, nowMs) && "ring-1 ring-gray-200",
    className
  );

  const cardContent = (
    <>
      <div className="flex flex-col gap-4 mb-4 flex-1">
        <div className="flex w-full flex-row items-center justify-between gap-2">
          {(formattedBudget || isNonGrant || (grantTypes && grantTypes.length > 0)) && (
            <div className="flex items-center rounded-[10px] bg-secondary p-0.5 max-w-full overflow-hidden">
              {formattedBudget && (
                <Badge
                  variant="outline"
                  className="flex items-center gap-1.5 rounded-full border-transparent px-2 bg-transparent font-medium"
                >
                  <Coins className="h-3 w-3 shrink-0" />
                  <span className="truncate max-w-[120px]">{formattedBudget}</span>
                </Badge>
              )}
              <GrantTypeBadges
                types={grantTypes ?? []}
                showLabels="conditional"
                variant="secondary"
                iconSize="sm"
                className="gap-0.5"
                opportunityType={opportunityType}
              />
            </div>
          )}
          <div className="flex items-center gap-1.5">
            {statusSlot}
            {isOnKarma && <OnKarmaBadge showTooltip={true} />}
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <h3 className="text-lg font-semibold text-foreground">{title}</h3>
          {(validCommunities.length > 0 || fallbackName) && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-sm text-muted-foreground">by</span>
              {validCommunities.length > 0 ? (
                validCommunities.map((community, index) => (
                  <div key={community.uid} className="flex items-center gap-1">
                    {isValidImageUrl(community.imageUrl) && (
                      <Image
                        src={community.imageUrl}
                        alt={community.name ?? ""}
                        width={20}
                        height={20}
                        className="rounded-full"
                      />
                    )}
                    <span className="text-sm font-medium text-foreground">
                      {community.name}
                      {index < validCommunities.length - 1 && ","}
                    </span>
                  </div>
                ))
              ) : (
                <span className="text-sm font-medium text-foreground">{fallbackName}</span>
              )}
            </div>
          )}
        </div>
        {isNonGrant && <CardTypeDetails program={program} />}
        {!hideDescription && <FundingMapDescription description={description ?? ""} />}
      </div>

      <div className="flex flex-col gap-4 mt-auto">
        {(endsAt || (!hideCategories && categories && categories.length > 0)) && (
          <div className="flex flex-col gap-1.5">
            {endsAt && (
              <Badge
                variant="outline"
                className="flex items-center gap-1.5 rounded-lg font-medium w-fit"
              >
                <Calendar className="h-3 w-3" />
                <span>
                  {hasEnded ? "Ended" : "Ends"} {endsAt}
                </span>
              </Badge>
            )}

            {!hideCategories && categories && categories.length > 0 && (
              <div className="relative flex-1 overflow-hidden">
                <div className="flex flex-nowrap gap-1 overflow-x-auto scrollbar-hide">
                  {categories
                    ?.filter((category): category is string => typeof category === "string")
                    .map((category) => (
                      <Badge
                        key={category}
                        variant="outline"
                        className="rounded-full border-border px-2 py-0.5 text-xs font-medium text-foreground whitespace-nowrap"
                      >
                        {category}
                      </Badge>
                    ))}
                </div>
                <div className="absolute top-0 right-0 h-full w-8 bg-gradient-to-l from-white dark:from-zinc-950 to-transparent pointer-events-none" />
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );

  if (href) {
    // Progressive enhancement when both href and onClick are provided
    // (funding-map list): the server HTML carries a real, followable
    // anchor to the program detail page, while a JS click is intercepted
    // to keep the existing dialog behavior. Without onClick (community
    // funding-opportunities grid) the anchor navigates as before.
    const opensDialog = Boolean(onClick);
    return (
      <Link
        href={href}
        className="no-underline"
        tabIndex={opensDialog ? 0 : -1}
        onClick={
          opensDialog
            ? (event) => {
                event.preventDefault();
                handleClick();
              }
            : undefined
        }
        aria-label={
          opensDialog ? `View funding program: ${title ?? "Untitled program"}` : undefined
        }
      >
        <Card
          className={cardClassName}
          onClick={opensDialog ? undefined : handleClick}
          tabIndex={opensDialog ? -1 : 0}
          aria-label={
            opensDialog ? undefined : `View funding program: ${title ?? "Untitled program"}`
          }
        >
          {cardContent}
        </Card>
      </Link>
    );
  }

  return (
    <Card
      className={cardClassName}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="button"
      aria-label={`View funding program: ${title ?? "Untitled program"}`}
    >
      {cardContent}
    </Card>
  );
}
