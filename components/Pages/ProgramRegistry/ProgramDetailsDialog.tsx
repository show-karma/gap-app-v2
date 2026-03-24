"use client";
import { Dialog, Transition } from "@headlessui/react";
import { ChevronRightIcon, XMarkIcon } from "@heroicons/react/24/solid";
import Image from "next/image";
import { type FC, Fragment, useState } from "react";
import {
  BlogIcon,
  Discord2Icon,
  DiscussionIcon,
  OrganizationIcon,
  Telegram2Icon,
  Twitter2Icon,
} from "@/components/Icons";
import { ExternalLink } from "@/components/Utilities/ExternalLink";
import { MarkdownPreview } from "@/components/Utilities/MarkdownPreview";
import { DialogTypeSection } from "@/src/features/funding-map/components/dialog-type-sections";
import type {
  FundingProgramResponse,
  OpportunityType,
} from "@/src/features/funding-map/types/funding-program";
import formatCurrency from "@/utilities/formatCurrency";
import { formatDate } from "@/utilities/formatDate";
import { shortAddress } from "@/utilities/shortAddress";
import { cn } from "@/utilities/tailwind";
import { registryHelper } from "./helper";
import { ProgramTypeBadges } from "./ProgramTypeBadges";

type ProgramDetailsDialogProps = {
  program: FundingProgramResponse;
  isOpen: boolean;
  closeModal: () => void;
};

const INGESTION_SOURCE_LABELS: Record<string, string> = {
  grok: "Grok (AI)",
  manual: "Manual",
  ethglobal: "ETHGlobal",
  superteam_earn: "Superteam Earn",
  devfolio: "Devfolio",
};

const focusRing =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600";

function normalizeUrl(url: string | undefined): string | null {
  if (!url) return null;
  return url.includes("http") ? url : `https://${url}`;
}

function extractSourceUrl(program: FundingProgramResponse): string | null {
  const rawData = program.metadata?.rawData;
  if (rawData) {
    for (const key of [
      "url",
      "sourceUrl",
      "source_url",
      "link",
      "tweetUrl",
      "tweet_url",
      "listing_url",
      "event_url",
    ]) {
      const val = rawData[key];
      if (typeof val === "string" && val.length > 0) {
        return normalizeUrl(val);
      }
    }
  }
  if (program.metadata?.applicationUrl) {
    return normalizeUrl(program.metadata.applicationUrl);
  }
  return normalizeUrl(program.metadata?.socialLinks?.grantsSite);
}

const sectionStyles = {
  card: "flex flex-col gap-2 bg-zinc-50 dark:bg-zinc-700 rounded-xl py-3 px-4",
  label: "text-sm text-zinc-500 dark:text-zinc-400 font-medium uppercase tracking-wide",
  pillList: "flex flex-row gap-2 flex-wrap",
  pill: "rounded-full flex flex-row gap-2 bg-white dark:bg-zinc-600 px-2.5 py-1 text-sm text-zinc-700 dark:text-zinc-200 font-medium border border-zinc-200 dark:border-zinc-500",
};

const statStyles = {
  row: "flex items-center justify-between gap-4 px-4 py-2.5 max-sm:flex-col max-sm:items-start max-sm:gap-1",
  label: "text-sm text-zinc-500 dark:text-zinc-400",
  value: "text-sm font-semibold text-zinc-900 dark:text-zinc-100",
};

function StatusBadge({
  label,
  variant,
}: {
  label: string;
  variant: "green" | "red" | "amber" | "blue" | "zinc";
}) {
  const colors = {
    green:
      "bg-green-50 text-green-700 ring-green-600/20 dark:bg-green-900/30 dark:text-green-400 dark:ring-green-500/30",
    red: "bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-900/30 dark:text-red-400 dark:ring-red-500/30",
    amber:
      "bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-900/30 dark:text-amber-400 dark:ring-amber-500/30",
    blue: "bg-blue-50 text-blue-700 ring-blue-600/20 dark:bg-blue-900/30 dark:text-blue-400 dark:ring-blue-500/30",
    zinc: "bg-zinc-100 text-zinc-600 ring-zinc-500/20 dark:bg-zinc-700 dark:text-zinc-300 dark:ring-zinc-500/30",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset",
        colors[variant]
      )}
    >
      {label}
    </span>
  );
}

function SocialLinksRow({ program }: { program: FundingProgramResponse }) {
  const socialLinks = program.metadata?.socialLinks;
  if (!socialLinks) return null;

  const links = [
    {
      url: socialLinks.grantsSite,
      icon: "/icons/globe.svg",
      darkIcon: "/icons/globe-white.svg",
      label: "Website",
    },
    { url: socialLinks.twitter, Icon: Twitter2Icon, label: "Twitter" },
    { url: socialLinks.discord, Icon: Discord2Icon, label: "Discord" },
    { url: socialLinks.telegram, Icon: Telegram2Icon, label: "Telegram" },
    { url: socialLinks.forum, Icon: DiscussionIcon, label: "Forum" },
    { url: socialLinks.blog, Icon: BlogIcon, label: "Blog" },
    { url: socialLinks.orgWebsite, Icon: OrganizationIcon, label: "Organization" },
  ].filter((l) => l.url);

  if (links.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5">
      {links.map((link) => {
        const href = normalizeUrl(link.url);
        if (!href) return null;
        return (
          <ExternalLink
            key={link.label}
            href={href}
            className={cn("w-max rounded", focusRing)}
            aria-label={`${link.label} (opens in new tab)`}
          >
            {"Icon" in link && link.Icon ? (
              <link.Icon className="w-5 h-5 text-zinc-600 dark:text-zinc-300" />
            ) : (
              <>
                <Image
                  width={20}
                  height={20}
                  src={link.icon!}
                  alt={link.label}
                  className="w-5 h-5 dark:hidden"
                />
                <Image
                  width={20}
                  height={20}
                  src={link.darkIcon!}
                  alt={link.label}
                  className="w-5 h-5 hidden dark:block"
                />
              </>
            )}
          </ExternalLink>
        );
      })}
    </div>
  );
}

function InfoCardsGrid({ program }: { program: FundingProgramResponse }) {
  const { metadata } = program;
  const categories = metadata?.categories;
  const networks = metadata?.networks;
  const ecosystems = metadata?.ecosystems;
  const platforms = metadata?.platformsUsed;
  const organizations = metadata?.organizations;

  const hasAny =
    (categories?.length ?? 0) > 0 ||
    (networks?.length ?? 0) > 0 ||
    (ecosystems?.length ?? 0) > 0 ||
    (platforms?.length ?? 0) > 0 ||
    (organizations?.length ?? 0) > 0;

  if (!hasAny) return null;

  return (
    <div className="grid grid-cols-2 max-sm:grid-cols-1 gap-3">
      {categories && categories.length > 0 && (
        <div className={sectionStyles.card}>
          <div className={sectionStyles.label}>Categories</div>
          <div className={sectionStyles.pillList}>
            {categories.map((cat) => (
              <div key={cat} className={sectionStyles.pill}>
                {cat}
              </div>
            ))}
          </div>
        </div>
      )}
      {networks && networks.length > 0 && (
        <div className={sectionStyles.card}>
          <div className={sectionStyles.label}>Networks</div>
          <div className={sectionStyles.pillList}>
            {networks.map((network) => (
              <div key={network} className={sectionStyles.pill}>
                <div className="w-5 h-5 rounded-full flex justify-center items-center">
                  {registryHelper.networkImages[network.toLowerCase()] ? (
                    <>
                      <Image
                        width={20}
                        height={20}
                        src={registryHelper.networkImages[network.toLowerCase()].light}
                        alt={network}
                        className="rounded-full w-5 h-5 dark:hidden"
                      />
                      <Image
                        width={20}
                        height={20}
                        src={registryHelper.networkImages[network.toLowerCase()].dark}
                        alt={network}
                        className="rounded-full w-5 h-5 hidden dark:block"
                      />
                    </>
                  ) : (
                    <div className="w-5 h-5 rounded-full bg-zinc-400" />
                  )}
                </div>
                {network}
              </div>
            ))}
          </div>
        </div>
      )}
      {ecosystems && ecosystems.length > 0 && (
        <div className={sectionStyles.card}>
          <div className={sectionStyles.label}>Ecosystems</div>
          <div className={sectionStyles.pillList}>
            {ecosystems.map((eco) => (
              <div key={eco} className={sectionStyles.pill}>
                {eco}
              </div>
            ))}
          </div>
        </div>
      )}
      {platforms && platforms.length > 0 && (
        <div className={sectionStyles.card}>
          <div className={sectionStyles.label}>Platforms Used</div>
          <div className={sectionStyles.pillList}>
            {platforms.map((p) => (
              <div key={p} className={sectionStyles.pill}>
                {p}
              </div>
            ))}
          </div>
        </div>
      )}
      {organizations && organizations.length > 0 && (
        <div className={sectionStyles.card}>
          <div className={sectionStyles.label}>Organizations</div>
          <div className={sectionStyles.pillList}>
            {organizations.map((org) => (
              <div key={org} className={sectionStyles.pill}>
                {org}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatsCard({ program }: { program: FundingProgramResponse }) {
  const { metadata } = program;
  const budget = metadata?.programBudget;
  const minGrant = metadata?.minGrantSize;
  const maxGrant = metadata?.maxGrantSize;
  const distributed = metadata?.amountDistributedToDate;
  const grantsToDate = metadata?.grantsToDate;

  const hasStats = budget || (minGrant && maxGrant) || distributed || grantsToDate;
  if (!hasStats) return null;

  const formatVal = (val: string | undefined) => {
    if (!val) return null;
    const formatted = formatCurrency(+val);
    return formatted === "NaN" ? val : `$${formatted}`;
  };

  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-600 divide-y divide-zinc-200 dark:divide-zinc-600">
      {budget && (
        <div className={statStyles.row}>
          <span className={statStyles.label}>Budget</span>
          <span className={statStyles.value}>{formatVal(budget)}</span>
        </div>
      )}
      {minGrant && maxGrant && (
        <div className={statStyles.row}>
          <span className={statStyles.label}>Grant Size</span>
          <span className={statStyles.value}>
            {formatVal(minGrant)} - {formatVal(maxGrant)}
          </span>
        </div>
      )}
      {distributed && (
        <div className={statStyles.row}>
          <span className={statStyles.label}>Amount Distributed</span>
          <span className={statStyles.value}>{formatVal(distributed)}</span>
        </div>
      )}
      {grantsToDate && (
        <div className={statStyles.row}>
          <span className={statStyles.label}>Grants Issued</span>
          <span className={statStyles.value}>{grantsToDate}</span>
        </div>
      )}
    </div>
  );
}

function AdminDetailsSection({ program }: { program: FundingProgramResponse }) {
  const [rawDataOpen, setRawDataOpen] = useState(false);
  const { metadata } = program;
  const ingestionSource = metadata?.ingestionSource || program.source;
  const sourceUrl = extractSourceUrl(program);
  const rawData = metadata?.rawData;
  const sourceLabel = ingestionSource
    ? (INGESTION_SOURCE_LABELS[ingestionSource] ?? ingestionSource)
    : null;

  const hasAnyDetail =
    program.programId ||
    sourceLabel ||
    sourceUrl ||
    program.createdByAddress ||
    program.createdAt ||
    program.updatedAt ||
    (metadata?.adminEmails && metadata.adminEmails.length > 0) ||
    (metadata?.financeEmails && metadata.financeEmails.length > 0) ||
    (program.admins && program.admins.length > 0) ||
    (rawData && Object.keys(rawData).length > 0);

  if (!hasAnyDetail) return null;

  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-600 overflow-hidden">
      <div className="bg-zinc-100 dark:bg-zinc-700 px-4 py-2.5">
        <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">
          Admin Details
        </span>
      </div>
      <div className="divide-y divide-zinc-200 dark:divide-zinc-600">
        {program.programId && (
          <div className={statStyles.row}>
            <span className={statStyles.label}>Program ID</span>
            <span className={cn(statStyles.value, "font-mono text-xs")}>{program.programId}</span>
          </div>
        )}

        {sourceLabel && (
          <div className={statStyles.row}>
            <span className={statStyles.label}>Ingestion Source</span>
            <StatusBadge label={sourceLabel} variant="blue" />
          </div>
        )}

        {sourceUrl && (
          <div className={statStyles.row}>
            <span className={statStyles.label}>Source URL</span>
            <ExternalLink
              href={sourceUrl}
              className={cn(
                "text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline truncate max-w-[50%]",
                focusRing,
                "rounded"
              )}
              aria-label="Source URL (opens in new tab)"
            >
              {sourceUrl}
            </ExternalLink>
          </div>
        )}

        <div className={statStyles.row}>
          <span className={statStyles.label}>Active</span>
          <StatusBadge
            label={program.isActive ? "Yes" : "No"}
            variant={program.isActive ? "green" : "zinc"}
          />
        </div>

        {program.createdByAddress && (
          <div className={statStyles.row}>
            <span className={statStyles.label}>Created By</span>
            <span className={cn(statStyles.value, "font-mono text-xs")}>
              {shortAddress(program.createdByAddress)}
            </span>
          </div>
        )}

        {program.createdAt && (
          <div className={statStyles.row}>
            <span className={statStyles.label}>Created At</span>
            <span className={statStyles.value}>{formatDate(program.createdAt)}</span>
          </div>
        )}
        {program.updatedAt && (
          <div className={statStyles.row}>
            <span className={statStyles.label}>Updated At</span>
            <span className={statStyles.value}>{formatDate(program.updatedAt)}</span>
          </div>
        )}

        {metadata?.adminEmails && metadata.adminEmails.length > 0 && (
          <div className={statStyles.row}>
            <span className={statStyles.label}>Admin Emails</span>
            <span className={statStyles.value}>{metadata.adminEmails.join(", ")}</span>
          </div>
        )}

        {metadata?.financeEmails && metadata.financeEmails.length > 0 && (
          <div className={statStyles.row}>
            <span className={statStyles.label}>Finance Emails</span>
            <span className={statStyles.value}>{metadata.financeEmails.join(", ")}</span>
          </div>
        )}

        {program.admins && program.admins.length > 0 && (
          <div className={statStyles.row}>
            <span className={statStyles.label}>Admins</span>
            <div className="flex flex-wrap gap-1">
              {program.admins.map((admin) => (
                <span
                  key={admin}
                  className="font-mono text-xs bg-zinc-100 dark:bg-zinc-600 px-2 py-0.5 rounded"
                >
                  {shortAddress(admin)}
                </span>
              ))}
            </div>
          </div>
        )}

        {rawData && Object.keys(rawData).length > 0 && (
          <div className="px-4 py-2.5">
            <button
              type="button"
              onClick={() => setRawDataOpen(!rawDataOpen)}
              className={cn(
                "flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors rounded",
                focusRing
              )}
              aria-expanded={rawDataOpen}
              aria-controls="raw-data-content"
            >
              <ChevronRightIcon
                className={cn("w-3.5 h-3.5 transition-transform", rawDataOpen && "rotate-90")}
                aria-hidden="true"
              />
              Raw Data ({Object.keys(rawData).length}{" "}
              {Object.keys(rawData).length === 1 ? "field" : "fields"})
            </button>
            {rawDataOpen && (
              <section
                id="raw-data-content"
                aria-label="Raw ingestion data"
                className="mt-2 max-h-80 overflow-auto rounded-lg bg-zinc-900 text-zinc-100 p-3 text-xs font-mono whitespace-pre"
              >
                {JSON.stringify(rawData, null, 2)}
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export const ProgramDetailsDialog: FC<ProgramDetailsDialogProps> = ({
  program,
  isOpen,
  closeModal,
}) => {
  const opportunityType: OpportunityType = program.type ?? "grant";
  const isNonGrant = opportunityType !== "grant";
  const isValid = program.isValid;
  const isStaleDeactivation = program.metadata?.deactivationReason === "stale_no_end_date";

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-10" onClose={closeModal}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/40" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto" id="grant-program-details-modal">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-3xl lg:max-w-4xl max-h-[85vh] flex flex-col transform rounded-xl dark:bg-zinc-800 bg-white text-left align-middle transition-all shadow-xl">
                {/* Sticky Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-600 shrink-0">
                  <Dialog.Title
                    as="h2"
                    className="text-xl font-bold text-zinc-900 dark:text-zinc-100 truncate pr-4"
                  >
                    {program.metadata?.title}
                  </Dialog.Title>
                  <button
                    type="button"
                    className={cn(
                      "hover:opacity-75 transition-all dark:text-zinc-100 rounded-lg p-1",
                      focusRing
                    )}
                    onClick={closeModal}
                    aria-label="Close dialog"
                  >
                    <XMarkIcon className="w-5 h-5" />
                  </button>
                </div>

                {/* Scrollable Body */}
                <div className="flex-1 overflow-y-auto px-6 py-5">
                  <div className="flex flex-col gap-5">
                    {/* Status Badges Row */}
                    <div className="flex flex-wrap items-center gap-2">
                      <ProgramTypeBadges
                        type={program.type}
                        legacyTypes={program.metadata?.grantTypes ?? []}
                      />
                      {isValid === true && <StatusBadge label="Accepted" variant="green" />}
                      {isValid === false && <StatusBadge label="Rejected" variant="red" />}
                      {isValid === null || isValid === undefined ? (
                        <StatusBadge label="Pending" variant="amber" />
                      ) : null}
                      {program.isOnKarma && <StatusBadge label="On Karma" variant="blue" />}
                      {isStaleDeactivation && (
                        <StatusBadge label="Stale: no end date (90+ days)" variant="amber" />
                      )}
                    </div>

                    {/* Social Links */}
                    <SocialLinksRow program={program} />

                    {/* Date Range */}
                    {(program.metadata?.startsAt || program.metadata?.endsAt) && (
                      <p className="text-sm text-zinc-500 dark:text-zinc-400">
                        {program.metadata?.startsAt &&
                          `Starts: ${formatDate(program.metadata.startsAt)}`}
                        {program.metadata?.startsAt && program.metadata?.endsAt && " — "}
                        {program.metadata?.endsAt && `Ends: ${formatDate(program.metadata.endsAt)}`}
                      </p>
                    )}

                    {/* Description */}
                    {program.metadata?.description && (
                      <div className="text-sm text-zinc-700 dark:text-zinc-300">
                        <MarkdownPreview
                          source={program.metadata.description}
                          className="w-full max-w-full text-wrap font-body text-sm"
                        />
                      </div>
                    )}

                    {/* Type-Specific Details */}
                    {isNonGrant && <DialogTypeSection program={program} />}

                    {/* Info Cards */}
                    <InfoCardsGrid program={program} />

                    {/* Stats */}
                    <StatsCard program={program} />

                    {/* Admin Details (admin-only section) */}
                    <AdminDetailsSection program={program} />
                  </div>
                </div>

                {/* Sticky Footer */}
                <div className="flex flex-wrap items-center gap-4 justify-end px-6 py-4 border-t border-zinc-200 dark:border-zinc-600 shrink-0">
                  {program.metadata?.bugBounty && (
                    <ExternalLink
                      href={program.metadata.bugBounty}
                      className={cn(
                        "text-sm font-bold text-blue-600 dark:text-blue-400 rounded",
                        focusRing
                      )}
                      aria-label="Bug Bounty (opens in new tab)"
                    >
                      Bug Bounty
                    </ExternalLink>
                  )}
                  {program.metadata?.socialLinks?.grantsSite && (
                    <ExternalLink
                      href={normalizeUrl(program.metadata.socialLinks.grantsSite) ?? ""}
                      className={cn(
                        "px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors inline-block",
                        focusRing
                      )}
                      aria-label="Apply to program (opens in new tab)"
                    >
                      Apply
                    </ExternalLink>
                  )}
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};
