"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import type { FundingProgram } from "@/services/fundingPlatformService";
import { PAGES } from "@/utilities/pages";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { chosenCommunities } from "@/utilities/chosenCommunities";
import { blo } from "blo";
import { useTheme } from "next-themes";
import { ExternalLink } from "@/components/Utilities/ExternalLink";

interface FundingOpportunityCardProps {
  program: FundingProgram;
  isFeatured?: boolean;
}

function formatCurrency(amount: string | undefined): string {
  if (!amount) return "TBD";
  const num = parseFloat(amount);
  if (num >= 1000000) return `$${(num / 1000000).toFixed(0)}M`;
  if (num >= 1000) return `$${(num / 1000).toFixed(0)}k`;
  return `$${num.toFixed(0)}`;
}

function getProgramStatus(program: FundingProgram): {
  label: string;
  variant: "default" | "secondary" | "destructive" | "outline";
  endsSoon: boolean;
} {
  const endsAt = program.metadata?.endsAt;
  const isEnabled = program.applicationConfig?.isEnabled;

  if (!isEnabled) {
    return { label: "Closed", variant: "secondary", endsSoon: false };
  }

  if (endsAt) {
    const daysUntilEnd = Math.ceil(
      (new Date(endsAt).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysUntilEnd <= 7 && daysUntilEnd > 0) {
      return { label: "Ends soon", variant: "destructive", endsSoon: true };
    }
  }

  return { label: "Open for Applications", variant: "default", endsSoon: false };
}

function getCommunityImage(program: FundingProgram, theme: string | undefined): string | null {
  // First check if communityImage is already provided
  if (program.communityImage) {
    return program.communityImage;
  }

  // Try to find in chosenCommunities by slug or uid
  const communities = chosenCommunities(true);
  const community = communities.find(
    (c) => c.slug === program.communitySlug || c.uid === program.communityUID
  );

  if (community) {
    return theme === "dark" ? community.imageURL.dark : community.imageURL.light;
  }

  // If communityUID exists, generate blockie
  if (program.communityUID) {
    return blo(program.communityUID as `0x${string}`);
  }

  return null;
}

export function FundingOpportunityCard({
  program,
  isFeatured = false
}: FundingOpportunityCardProps) {
  const { theme } = useTheme();
  const status = getProgramStatus(program);
  const title = program.metadata?.title || program.name;
  const budget = program.metadata?.programBudget;
  const communityName = program.communityName || program.communitySlug || "Unknown";
  const communityImage = getCommunityImage(program, theme) || program.metadata?.logoImg;
  const programDetailUrl = program.communitySlug && program.programId
    ? PAGES.EXTERNAL_PROGRAM.DETAIL(program.communitySlug, program.programId)
    : null;
  const applyUrl = program.communitySlug && program.programId
    ? PAGES.EXTERNAL_PROGRAM.APPLY(program.communitySlug, program.programId)
    : null;

  if (isFeatured) {
    // Mobile featured card with gradient background
    const CardWrapper = programDetailUrl ? ExternalLink : 'div';
    const cardProps = programDetailUrl ? { href: programDetailUrl, className: "cursor-pointer" } : {};

    return (
      <Card className="relative overflow-hidden border-0">
        <div
          className="absolute inset-0 bg-gradient-to-b from-blue-900 via-purple-900 to-blue-800"
          style={{
            backgroundImage: "linear-gradient(to bottom, rgba(30, 58, 138, 0.9), rgba(88, 28, 135, 0.9), rgba(30, 64, 175, 0.9))"
          }}
        />
        <CardWrapper {...cardProps}>
          <CardContent className="relative p-6 md:p-8 min-h-[400px] flex flex-col justify-between">
            {/* Top section */}
            <div className="flex items-start justify-between mb-4">
              {applyUrl ? (
                <ExternalLink
                  href={applyUrl}
                  onClick={(e) => e.stopPropagation()}
                  className="inline-block"
                >
                  <Badge
                    variant="secondary"
                    className="bg-green-100 text-green-800 border-green-200 flex items-center gap-1.5 cursor-pointer hover:bg-green-200 transition-colors"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-green-600" />
                    Apply now
                  </Badge>
                </ExternalLink>
              ) : (
                <Badge
                  variant="secondary"
                  className="bg-green-100 text-green-800 border-green-200 flex items-center gap-1.5"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-green-600" />
                  Apply now
                </Badge>
              )}
              {status.endsSoon && (
                <div className="flex items-center gap-1.5 text-white text-sm font-medium">
                  <Clock className="w-4 h-4" />
                  {status.label}
                </div>
              )}
            </div>

            {/* Title section */}
            <div className="flex-1 flex flex-col justify-center mb-6">
              <div className="relative">
                {/* Layered text effect */}
                <div className="absolute inset-0 opacity-20">
                  <h3 className="text-5xl md:text-6xl font-bold text-white leading-none">
                    {title.split(" ")[0]}
                  </h3>
                </div>
                <h3 className="text-4xl md:text-5xl font-bold text-white leading-tight relative z-10">
                  {title}
                </h3>
              </div>
              {program.metadata?.description && (
                <p className="text-white/80 text-sm mt-2">
                  {program.metadata.description.substring(0, 100)}...
                </p>
              )}
            </div>

            {/* Bottom section */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {communityImage && (
                  <Image
                    src={communityImage}
                    alt={communityName}
                    width={24}
                    height={24}
                    className="rounded-full"
                  />
                )}
                <span className="text-white text-sm font-medium">{communityName.toUpperCase()}</span>
              </div>
              <div className="text-right">
                <div className="text-white text-lg font-bold">{formatCurrency(budget)}</div>
                <div className="text-white/70 text-xs">Available</div>
              </div>
            </div>
          </CardContent>
        </CardWrapper>
      </Card>
    );
  }

  // Desktop card (3-card layout)
  const CardWrapper = programDetailUrl ? ExternalLink : 'div';
  const cardProps = programDetailUrl ? { href: programDetailUrl, className: "cursor-pointer" } : {};

  return (
    <Card className="h-full flex flex-col">
      <CardWrapper {...cardProps}>
        <CardContent className="p-6 flex flex-col h-full">
          {/* Top section */}
          <div className="flex items-start justify-between mb-4">
            <Badge
              variant={status.variant === "default" ? "default" : "secondary"}
              className={cn(
                status.variant === "default" && "bg-teal-100 text-teal-700 border-teal-200 hover:bg-teal-100 hover:text-teal-700 hover:border-teal-200 text-xs font-normal leading-[1.5] tracking-[0.015em] text-center align-middle"
              )}
            >
              {status.label}
            </Badge>
            <div className="text-right">
              <div className="text-lg font-bold text-foreground">{formatCurrency(budget)}</div>
              <div className="text-xs text-muted-foreground">Available</div>
            </div>
          </div>

          {/* Title */}
          <h3 className="text-xl font-semibold leading-[1.2] tracking-[-0.02em] text-foreground mb-4 flex-1">
            {title}
          </h3>

          {/* Bottom section */}
          <div className="flex items-center justify-between mt-auto">
            <div className="flex items-center gap-2">
              {communityImage ? (
                <Image
                  src={communityImage}
                  alt={communityName}
                  width={24}
                  height={24}
                  className="rounded-full w-6 h-6"
                />
              ) : program.communityUID ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={blo(program.communityUID as `0x${string}`)}
                  alt={communityName}
                  className="rounded-full w-6 h-6"
                />
              ) : null}
              <span className="text-xs font-medium leading-[1.5] tracking-[0.015em] text-foreground">{communityName}</span>
            </div>
            {applyUrl ? (
              <ExternalLink
                href={applyUrl}
                onClick={(e) => e.stopPropagation()}
                className="inline-block"
              >
                <Button
                  variant="outline"
                  size="sm"
                  className="border-border text-sm font-medium leading-[1.5] tracking-[0.005em] text-center align-middle text-foreground"
                >
                  Apply now
                </Button>
              </ExternalLink>
            ) : (
              <Button
                variant="outline"
                size="sm"
                disabled
                className="border-border text-sm font-medium leading-[1.5] tracking-[0.005em] text-center align-middle text-foreground"
              >
                Apply now
              </Button>
            )}
          </div>
        </CardContent>
      </CardWrapper>
    </Card>
  );
}

