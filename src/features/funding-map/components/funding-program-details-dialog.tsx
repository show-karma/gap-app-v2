"use client";

import {
  BadgeCheck,
  Bug,
  Building2,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Globe,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import {
  BlogIcon,
  Discord2Icon,
  DiscussionIcon,
  Telegram2Icon,
  Twitter2Icon,
} from "@/components/Icons";
import { MarkdownPreview } from "@/components/Utilities/MarkdownPreview";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { envVars } from "@/utilities/enviromentVars";
import formatCurrency from "@/utilities/formatCurrency";
import { FUNDING_PLATFORM_PAGES } from "@/utilities/pages";
import { cn } from "@/utilities/tailwind";
import { NETWORK_IMAGES } from "../constants/filter-options";
import type {
  FundingProgramCommunity,
  FundingProgramMetadata,
  FundingProgramResponse,
} from "../types/funding-program";
import { FUNDING_PLATFORM_DOMAINS } from "../utils/funding-platform-domains";
import { isValidImageUrl } from "../utils/image-utils";

interface FundingProgramDetailsDialogProps {
  program: FundingProgramResponse | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isLoading?: boolean;
}

function formatBudgetValue(budget: string | undefined): string | null {
  if (!budget || Number(budget) === 0) return null;
  const numBudget = Number(budget);
  if (Number.isNaN(numBudget)) return budget;
  return `$${formatCurrency(numBudget)}`;
}

function formatGrantSize(min: string | undefined, max: string | undefined): string | null {
  if (!min || !max) return null;
  const minNum = Number(min);
  const maxNum = Number(max);
  if (Number.isNaN(minNum) || Number.isNaN(maxNum)) return null;
  return `$${formatCurrency(minNum)} - $${formatCurrency(maxNum)}`;
}

function normalizeUrl(url: string | undefined): string | null {
  if (!url) return null;
  return url.includes("http") ? url : `https://${url}`;
}

function getApplyUrl(
  program: FundingProgramResponse,
  community?: FundingProgramCommunity
): string | null {
  // If program is on Karma and has a community, use the Karma funding platform apply URL
  if (program.isOnKarma && program.programId && community?.slug) {
    const communitySlug = community.slug;
    const exclusiveDomain =
      FUNDING_PLATFORM_DOMAINS[communitySlug as keyof typeof FUNDING_PLATFORM_DOMAINS];
    // Use exclusive domain if available, otherwise fall through to shared domain
    const domain = exclusiveDomain
      ? envVars.isDev
        ? exclusiveDomain.dev
        : exclusiveDomain.prod
      : undefined;
    return FUNDING_PLATFORM_PAGES(communitySlug, domain).PROGRAM_PAGE(program.programId);
  }
  // Fallback to grantsSite from social links
  return normalizeUrl(program.metadata?.socialLinks?.grantsSite);
}

function isProgramActive(program: FundingProgramResponse): boolean {
  const endsAt = program.metadata?.endsAt;
  const status = program.metadata?.status?.toLowerCase();

  if (endsAt) {
    return new Date(endsAt) >= new Date();
  }

  return status === "active";
}

interface CommunityApplyButtonProps {
  program: FundingProgramResponse;
  isActive: boolean;
}

function CommunityApplyButton({ program, isActive }: CommunityApplyButtonProps) {
  const validCommunities = program.communities?.filter((c) => c.slug) ?? [];

  // Case 1: No valid communities with slugs - fall back to grantsSite
  if (validCommunities.length === 0) {
    const fallbackUrl = normalizeUrl(program.metadata?.socialLinks?.grantsSite);
    if (!fallbackUrl) return null;

    return (
      <Button
        asChild
        size="sm"
        disabled={!isActive}
        className={cn("gap-1.5 ml-auto", !isActive && "pointer-events-none opacity-50")}
      >
        <Link href={isActive ? fallbackUrl : ""} target="_blank" rel="noopener noreferrer">
          Apply
          <ChevronRight className="h-4 w-4" />
        </Link>
      </Button>
    );
  }

  // Case 2: Single community - direct button
  if (validCommunities.length === 1) {
    const applyUrl = getApplyUrl(program, validCommunities[0]);
    if (!applyUrl) return null;

    return (
      <Button
        asChild
        size="sm"
        disabled={!isActive}
        className={cn("gap-1.5 ml-auto", !isActive && "pointer-events-none opacity-50")}
      >
        <Link href={isActive ? applyUrl : ""} target="_blank" rel="noopener noreferrer">
          Apply on Karma
          <ChevronRight className="h-4 w-4" />
        </Link>
      </Button>
    );
  }

  // Case 3: Multiple communities - dropdown
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          size="sm"
          disabled={!isActive}
          className={cn("gap-1.5 ml-auto", !isActive && "pointer-events-none opacity-50")}
        >
          Apply on Karma
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {validCommunities.map((community) => {
          const applyUrl = getApplyUrl(program, community);
          if (!applyUrl) return null;

          return (
            <DropdownMenuItem key={community.uid} asChild>
              <a
                href={isActive ? applyUrl : undefined}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 cursor-pointer"
              >
                {isValidImageUrl(community.imageUrl) && (
                  <Image
                    src={community.imageUrl}
                    alt={community.name ?? ""}
                    width={20}
                    height={20}
                    className="rounded-full"
                  />
                )}
                <span>{community.name || community.slug}</span>
              </a>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function DialogSkeleton() {
  return (
    <div className="flex flex-col gap-6 p-8 sm:p-10">
      <DialogTitle className="sr-only">Loading program details</DialogTitle>
      <div className="flex flex-col gap-3">
        <div className="flex gap-2">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-6 w-20" />
        </div>
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-5 w-1/3" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
      </div>
    </div>
  );
}

function SocialLinks({ socialLinks }: { socialLinks: FundingProgramMetadata["socialLinks"] }) {
  if (!socialLinks) return null;

  const links = [
    { url: socialLinks.grantsSite, icon: Globe, label: "Website" },
    { url: socialLinks.twitter, icon: Twitter2Icon, label: "Twitter" },
    { url: socialLinks.discord, icon: Discord2Icon, label: "Discord" },
    { url: socialLinks.telegram, icon: Telegram2Icon, label: "Telegram" },
    { url: socialLinks.forum, icon: DiscussionIcon, label: "Forum" },
    { url: socialLinks.blog, icon: BlogIcon, label: "Blog" },
    { url: socialLinks.orgWebsite, icon: Building2, label: "Organization" },
  ].filter((link) => link.url);

  if (links.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {links.map((link) => {
        const Icon = link.icon;
        const href = normalizeUrl(link.url);
        if (!href) return null;

        return (
          <a
            key={link.label}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center w-8 h-8 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
            title={link.label}
          >
            <Icon className="h-4 w-4 text-foreground" />
          </a>
        );
      })}
    </div>
  );
}

function InfoCard({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2 rounded-xl bg-blue-50 dark:bg-zinc-700 px-4 py-3">
      <div className="text-sm font-semibold text-foreground">{label}</div>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function InfoPill({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 rounded-full bg-white dark:bg-zinc-800 px-3 py-1 text-sm font-medium text-blue-600 dark:text-blue-400">
      {children}
    </div>
  );
}

function StatRow({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-2">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-semibold text-foreground">{value}</span>
    </div>
  );
}

function NetworkIcon({ network }: { network: string }) {
  const images = NETWORK_IMAGES[network.toLowerCase()];
  if (!images) {
    return <div className="w-5 h-5 rounded-full bg-muted" />;
  }

  return (
    <>
      <Image
        src={images.light}
        alt={network}
        width={20}
        height={20}
        className="rounded-full dark:hidden"
      />
      <Image
        src={images.dark}
        alt={network}
        width={20}
        height={20}
        className="rounded-full hidden dark:block"
      />
    </>
  );
}

export function FundingProgramDetailsDialog({
  program,
  open,
  onOpenChange,
  isLoading = false,
}: FundingProgramDetailsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0">
        {isLoading || !program ? <DialogSkeleton /> : <DialogContentInner program={program} />}
      </DialogContent>
    </Dialog>
  );
}

function DialogContentInner({ program }: { program: FundingProgramResponse }) {
  const { metadata, isOnKarma, communities, programId } = program;
  const title = metadata?.title;
  const description = metadata?.description;
  const grantTypes = metadata?.grantTypes?.filter(
    (type): type is string => typeof type === "string"
  );
  const categories = metadata?.categories?.filter((cat): cat is string => typeof cat === "string");
  const networks = metadata?.networks?.filter((net): net is string => typeof net === "string");
  const ecosystems = metadata?.ecosystems?.filter((eco): eco is string => typeof eco === "string");
  const platformsUsed = metadata?.platformsUsed?.filter(
    (plat): plat is string => typeof plat === "string"
  );
  const organizations = metadata?.organizations?.filter(
    (org): org is string => typeof org === "string"
  );

  const validCommunities = communities?.filter((c) => c.name && c.name.trim().length > 0) ?? [];
  const fallbackName = organizations?.join(", ") ?? "";

  // Only used for non-Karma programs as fallback
  const fallbackApplyUrl = normalizeUrl(metadata?.socialLinks?.grantsSite);
  const isActive = isProgramActive(program);

  const budget = formatBudgetValue(metadata?.programBudget);
  const grantSize = formatGrantSize(metadata?.minGrantSize, metadata?.maxGrantSize);
  const amountDistributed = formatBudgetValue(metadata?.amountDistributedToDate);
  const grantsIssued = metadata?.grantsToDate ? metadata?.grantsToDate : null;
  const bugBounty = normalizeUrl(metadata?.bugBounty);

  const hasStats = budget || grantSize || amountDistributed || grantsIssued;
  const hasInfoCards =
    (categories?.length ?? 0) > 0 ||
    (networks?.length ?? 0) > 0 ||
    (ecosystems?.length ?? 0) > 0 ||
    (platformsUsed?.length ?? 0) > 0 ||
    (organizations?.length ?? 0) > 0;

  return (
    <div className="flex flex-col">
      {/* Header Section */}
      <div className="flex flex-col gap-4 p-6 sm:p-8">
        <DialogHeader className="space-y-3">
          {/* Top row: Grant types + Social links */}
          <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2">
              {isOnKarma && (
                <Badge
                  variant="secondary"
                  className="flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400"
                >
                  <BadgeCheck className="h-3.5 w-3.5" />
                  On Karma
                </Badge>
              )}
              {grantTypes?.map((type) => (
                <Badge
                  key={type}
                  variant="secondary"
                  className="rounded-lg bg-neutral-100 px-2 py-1 text-xs font-medium text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200"
                >
                  {type}
                </Badge>
              ))}
            </div>
            <SocialLinks socialLinks={metadata?.socialLinks} />
          </div>

          {/* Title */}
          <DialogTitle className="text-xl sm:text-2xl font-bold tracking-tight">
            {title}
          </DialogTitle>

          {/* Organization/Community */}
          {(validCommunities.length > 0 || fallbackName) && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">by</span>
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
        </DialogHeader>

        {/* Description */}
        {description && (
          <DialogDescription asChild>
            <div className="text-sm leading-relaxed text-muted-foreground">
              <MarkdownPreview
                source={description}
                className="prose prose-sm dark:prose-invert max-w-none"
              />
            </div>
          </DialogDescription>
        )}

        {/* Info Cards Grid */}
        {hasInfoCards && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            {categories && categories.length > 0 && (
              <InfoCard label="Categories">
                {categories.map((category) => (
                  <InfoPill key={category}>{category}</InfoPill>
                ))}
              </InfoCard>
            )}

            {networks && networks.length > 0 && (
              <InfoCard label="Networks">
                {networks.map((network) => (
                  <InfoPill key={network}>
                    <NetworkIcon network={network} />
                    {network}
                  </InfoPill>
                ))}
              </InfoCard>
            )}

            {ecosystems && ecosystems.length > 0 && (
              <InfoCard label="Ecosystems">
                {ecosystems.map((ecosystem) => (
                  <InfoPill key={ecosystem}>{ecosystem}</InfoPill>
                ))}
              </InfoCard>
            )}

            {platformsUsed && platformsUsed.length > 0 && (
              <InfoCard label="Platforms Used">
                {platformsUsed.map((platform) => (
                  <InfoPill key={platform}>{platform}</InfoPill>
                ))}
              </InfoCard>
            )}

            {organizations && organizations.length > 0 && (
              <InfoCard label="Organizations">
                {organizations.map((org) => (
                  <InfoPill key={org}>{org}</InfoPill>
                ))}
              </InfoCard>
            )}
          </div>
        )}

        {/* Stats Card */}
        {hasStats ? (
          <div className="rounded-xl bg-blue-50 dark:bg-zinc-700 divide-y divide-blue-100 dark:divide-zinc-600">
            <StatRow label="Budget" value={budget} />
            <StatRow label="Grant Size" value={grantSize} />
            <StatRow label="Amount Distributed to Date" value={amountDistributed} />
            <StatRow label="Grants Issued to Date" value={grantsIssued?.toString() ?? ""} />
          </div>
        ) : null}

        {/* Actions Row */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
          {bugBounty && (
            <a
              href={bugBounty}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
            >
              <Bug className="h-4 w-4" />
              Bug Bounty
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}

          {isOnKarma ? (
            <CommunityApplyButton program={program} isActive={isActive} />
          ) : (
            fallbackApplyUrl && (
              <Button
                asChild
                size="sm"
                disabled={!isActive}
                className={cn("gap-1.5 ml-auto", !isActive && "pointer-events-none opacity-50")}
              >
                <Link
                  href={isActive ? fallbackApplyUrl : ""}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Apply
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </Button>
            )
          )}
        </div>
      </div>

      {/* Footer: Claim this program */}
      {programId && (
        <div className="border-t border-border px-6 py-4 bg-muted/30">
          <p className="text-sm text-muted-foreground">
            Are you the manager of this grant program?{" "}
            <a
              href={`https://tally.so/r/3qB1PY?program_id=${programId}&program_name=karma`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline dark:text-blue-400"
            >
              Claim
            </a>{" "}
            this program to update it.
          </p>
        </div>
      )}
    </div>
  );
}
