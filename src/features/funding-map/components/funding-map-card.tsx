import { BadgeCheck, Calendar } from "lucide-react";
import Image from "next/image";
import type { KeyboardEvent } from "react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { formatDate } from "@/utilities/formatDate";
import { cn } from "@/utilities/tailwind";
import type { FundingProgramResponse } from "../types/funding-program";
import { isValidImageUrl } from "../utils/image-utils";
import { FundingMapDescription } from "./funding-map-description";
import { OnKarmaBadge } from "./on-karma-badge";

interface FundingMapCardProps {
  program: FundingProgramResponse;
  onClick?: () => void;
}

/**
 * Determines if the program needs a pending review indicator (ring).
 * Shows ring for programs that are pending validation and still active.
 */
function isPendingReview(program: FundingProgramResponse): boolean {
  const isValidated = program.isValid;
  const isInactive = program.metadata?.status === "inactive";
  const hasEnded = program.metadata?.endsAt && program.metadata.endsAt < new Date().toISOString();

  // Show ring only for programs that are not validated, not inactive, and not ended
  return !isValidated && !isInactive && !hasEnded;
}

export function FundingMapCard({ program, onClick }: FundingMapCardProps) {
  const { metadata, isOnKarma, communities } = program;

  const title = metadata?.title;
  const description = metadata?.description;
  const grantTypes = metadata?.grantTypes;
  const organizations = metadata?.organizations;
  const endsAt = formatDate(metadata?.endsAt, "UTC", "MMM D, YYYY");
  const hasEnded = metadata?.endsAt && new Date(metadata.endsAt) < new Date();

  // Check if we have valid communities with names
  const validCommunities = communities?.filter((c) => c.name && c.name.trim().length > 0) ?? [];

  // Fallback to organizations if no communities
  const fallbackName =
    organizations?.filter((org): org is string => typeof org === "string").join(", ") ?? "";

  const categories = metadata?.categories;

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      // Prevent Space from scrolling the page
      if (event.key === " ") {
        event.preventDefault();
      }
      onClick?.();
    }
  };

  return (
    <Card
      className={cn(
        "flex flex-col gap-4 border-border p-5 shadow-sm transition-shadow hover:shadow-md cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        isPendingReview(program) && "ring-1 ring-gray-200"
      )}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="button"
      aria-label={`View funding program: ${title ?? "Untitled program"}`}
    >
      <div className="flex flex-col gap-3">
        <div className="relative flex w-full flex-row items-start justify-between gap-2">
          {endsAt && (
            <div className="flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-xs font-medium text-muted-foreground">
              <Calendar className="h-3 w-3" />
              <span>
                {hasEnded ? "Ended" : "Ends"} {endsAt}
              </span>
            </div>
          )}
          {isOnKarma && <OnKarmaBadge className="flex-shrink-0" />}
        </div>

        <h3 className="text-lg font-semibold text-foreground">{title}</h3>

        {(validCommunities.length > 0 || fallbackName) && (
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-medium text-muted-foreground">by</span>
            <div className="flex flex-wrap items-center gap-1.5">
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
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <FundingMapDescription description={description ?? ""} />

        <div className="flex flex-wrap items-center gap-2">
          {categories
            ?.filter((category): category is string => typeof category === "string")
            .map((category) => (
              <Badge
                key={category}
                variant="outline"
                className="rounded-full border-border px-2 py-0.5 text-xs font-medium text-foreground"
              >
                {category}
              </Badge>
            ))}
        </div>

        <div className="relative flex-1 overflow-hidden">
          <div className="flex flex-nowrap gap-1 overflow-x-auto scrollbar-hide">
            {grantTypes
              ?.filter((type): type is string => typeof type === "string")
              .map((type) => (
                <Badge
                  key={type}
                  variant="secondary"
                  className="rounded-lg px-2 py-0.5 text-xs font-medium whitespace-nowrap"
                >
                  {type}
                </Badge>
              ))}
          </div>
          <div className="absolute top-0 right-0 h-full w-8 bg-gradient-to-l from-white dark:from-zinc-950 to-transparent pointer-events-none" />
        </div>
      </div>
    </Card>
  );
}
