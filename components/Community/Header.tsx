"use client";
import { useQuery } from "@tanstack/react-query";
import {
  AwardIcon,
  CalendarIcon,
  CheckCircle2Icon,
  ChevronRightIcon,
  RadioIcon,
  SparklesIcon,
  UsersIcon,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { CommunityPageNavigator } from "@/components/Pages/Communities/CommunityPageNavigator";
import { InfoTooltip } from "@/components/Utilities/InfoTooltip";
import { BorderBeam } from "@/components/ui/border-beam";
import { useDominantColor } from "@/hooks/useDominantColor";
import { layoutTheme } from "@/src/helper/theme";
import { useAgentChatStore } from "@/store/agentChat";
import type { Community } from "@/types/v2/community";
import { communityColors } from "@/utilities/communityColors";
import formatCurrency from "@/utilities/formatCurrency";
import { PAGES } from "@/utilities/pages";
import { getCommunityStats } from "@/utilities/queries/v2/getCommunityData";
import { cn } from "@/utilities/tailwind";
import { useWhitelabel } from "@/utilities/whitelabel-context";

const AdminCommunityHeader = ({ community }: { community: Community }) => {
  return (
    <div
      className={cn(
        layoutTheme.padding,
        "flex flex-col gap-4 justify-between items-start sm:px-3 md:px-4 px-6 py-2 border-b border-gray-200 dark:border-gray-800"
      )}
    >
      <div className="flex flex-row gap-4 flex-wrap max-lg:flex-col justify-between items-center w-full">
        <div className="flex h-max flex-1 flex-row items-center justify-start gap-3 ">
          <div className="flex justify-center bg-black rounded-full p-2">
            <Image
              alt={(community as Community)?.details?.name || "Community"}
              src={(community as Community)?.details?.logoUrl || "/placeholder.png"}
              width={24}
              height={24}
              className={"h-6 w-6 min-w-6 min-h-6 rounded-full"}
            />
          </div>
          <div className="flex flex-col gap-0">
            <p className="text-3xl font-body font-semibold text-black dark:text-white max-2xl:text-2xl max-lg:text-xl">
              {community ? (community as Community)?.details?.name : ""}
            </p>
          </div>
        </div>
      </div>
      <CommunityPageNavigator />
    </div>
  );
};

const ACCENT_PALETTE = [
  "#0090FF",
  "#2ED1A8",
  "#7C3AED",
  "#F59E0B",
  "#EF4444",
  "#06B6D4",
  "#EC4899",
  "#10B981",
  "#6366F1",
  "#F97316",
];

function pickAccent(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return ACCENT_PALETTE[hash % ACCENT_PALETTE.length];
}

function hexToRgba(hex: string, alpha: number): string | null {
  const m = hex.trim().match(/^#?([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (!m) return null;
  let h = m[1];
  if (h.length === 3)
    h = h
      .split("")
      .map((c) => c + c)
      .join("");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

type MetaRowStats = {
  totalGrants?: number;
  projectUpdates?: number;
  completedMilestones?: number;
  totalMilestones?: number;
  updatesBreakdown?: React.ReactNode;
};

const MetaRow = ({
  sinceYear,
  projectsCount,
  stats,
}: {
  sinceYear: number | null;
  projectsCount: number | undefined;
  stats?: MetaRowStats;
}) => {
  const hasStats = !!stats && (stats.totalGrants || stats.projectUpdates || stats.totalMilestones);
  if (!sinceYear && !projectsCount && !hasStats) return null;
  return (
    <div className="flex gap-x-4 gap-y-1 mt-2.5 text-[12.5px] text-gray-500 dark:text-zinc-400 flex-wrap items-center">
      {sinceYear ? (
        <span className="inline-flex items-center gap-1.5">
          <CalendarIcon size={13} /> Since {sinceYear}
        </span>
      ) : null}
      {projectsCount ? (
        <span className="inline-flex items-center gap-1.5">
          <UsersIcon size={13} /> {formatCurrency(projectsCount)} projects
        </span>
      ) : null}
      {stats?.totalGrants ? (
        <span className="inline-flex items-center gap-1.5">
          <AwardIcon size={13} /> {formatCurrency(stats.totalGrants)} grants
        </span>
      ) : null}
      {stats?.projectUpdates ? (
        stats.updatesBreakdown ? (
          <InfoTooltip
            content={stats.updatesBreakdown}
            side="top"
            align="start"
            contentClassName="max-w-sm"
            triggerAsChild
          >
            <span className="inline-flex items-center gap-1.5 cursor-help underline decoration-dotted decoration-gray-300 dark:decoration-zinc-600 underline-offset-2">
              <RadioIcon size={13} /> {formatCurrency(stats.projectUpdates)} updates
            </span>
          </InfoTooltip>
        ) : (
          <span className="inline-flex items-center gap-1.5">
            <RadioIcon size={13} /> {formatCurrency(stats.projectUpdates)} updates
          </span>
        )
      ) : null}
      {stats?.totalMilestones
        ? (() => {
            const completed = stats.completedMilestones ?? 0;
            const pct = Math.min(100, (completed / stats.totalMilestones) * 100);
            return (
              <span className="inline-flex items-center gap-1.5 max-sm:flex max-sm:flex-col max-sm:items-start max-sm:gap-1 max-sm:w-full">
                <span className="inline-flex items-center gap-1.5">
                  <CheckCircle2Icon size={13} /> {completed}/{stats.totalMilestones} milestones
                </span>
                <span className="inline-flex items-center gap-1.5 max-sm:w-full">
                  <span
                    className="inline-block w-16 h-1 rounded-full overflow-hidden bg-gray-200 dark:bg-zinc-800 align-middle max-sm:flex-1"
                    role="progressbar"
                    aria-valuenow={pct}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`${pct.toFixed(0)}% of milestones completed`}
                  >
                    <span
                      className="block h-full bg-emerald-500 dark:bg-emerald-400 transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </span>
                  <span className="text-[11px] tabular-nums text-gray-400 dark:text-zinc-500">
                    {pct.toFixed(0)}%
                  </span>
                </span>
              </span>
            );
          })()
        : null}
    </div>
  );
};

const NormalCommunityHeader = ({ community }: { community: Community }) => {
  const params = useParams();
  const communityId = (params?.communityId as string) || community?.details?.slug || "";
  const [isMac, setIsMac] = useState(false);
  const setChatOpen = useAgentChatStore((s) => s.setOpen);
  const setAgentContext = useAgentChatStore((s) => s.setAgentContext);
  const communityName = community?.details?.name || "";

  const openKarmaAssistant = useCallback(() => {
    if (communityId) {
      setAgentContext({ communityId });
    }
    setChatOpen(true);
    // Wait for the chat shell + input to mount before focusing.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const editor = document.querySelector<HTMLElement>(
          '[role="textbox"][aria-label="Chat message"]'
        );
        editor?.focus();
      });
    });
  }, [communityId, setAgentContext, setChatOpen]);

  useEffect(() => {
    if (typeof navigator !== "undefined") {
      setIsMac(/Mac|iPhone|iPad|iPod/i.test(navigator.platform || navigator.userAgent));
    }
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = isMac ? e.metaKey : e.ctrlKey;
      if (mod && (e.key === "k" || e.key === "K")) {
        e.preventDefault();
        openKarmaAssistant();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isMac, openKarmaAssistant]);
  const { isWhitelabel, config } = useWhitelabel();
  const uid = (community as Community)?.uid?.toLowerCase() || "";
  const slug = community?.details?.slug?.toLowerCase() || "";
  const logoUrl = community?.details?.logoUrl;
  const dominantColor = useDominantColor(logoUrl);
  const logoBg =
    config?.theme?.logoBackground ??
    communityColors[uid] ??
    communityColors[slug] ??
    dominantColor ??
    pickAccent(uid || slug || community?.details?.name || "community");

  const name = community?.details?.name ?? "";
  const description = community?.details?.description ?? "";

  const { data: communityStats } = useQuery({
    queryKey: ["community-stats", communityId],
    queryFn: () => getCommunityStats(communityId),
    enabled: !!communityId,
    staleTime: 5 * 60 * 1000,
  });

  const sinceYear = community?.createdAt ? new Date(community.createdAt).getFullYear() : null;
  const projectsCount = communityStats?.totalProjects;
  const breakdown = communityStats?.projectUpdatesBreakdown;
  const completedMilestones = breakdown
    ? breakdown.projectCompletedMilestones + breakdown.grantCompletedMilestones
    : 0;
  const updatesBreakdownNode = breakdown ? (
    <div className="flex flex-col gap-1.5 p-1">
      <div className="font-semibold text-xs mb-1 border-b border-gray-200 dark:border-zinc-700 pb-1">
        Project Updates Breakdown
      </div>
      <div className="flex justify-between gap-3 text-xs">
        <span className="text-gray-600 dark:text-gray-400">Project Milestones</span>
        <span className="font-medium">{breakdown.projectMilestones}</span>
      </div>
      <div className="flex justify-between gap-3 text-xs">
        <span className="text-gray-600 dark:text-gray-400">Project Milestone Completions</span>
        <span className="font-medium">{breakdown.projectCompletedMilestones}</span>
      </div>
      <div className="flex justify-between gap-3 text-xs">
        <span className="text-gray-600 dark:text-gray-400">Project Updates</span>
        <span className="font-medium">{breakdown.projectUpdates}</span>
      </div>
      <div className="flex justify-between gap-3 text-xs">
        <span className="text-gray-600 dark:text-gray-400">Grant Milestones</span>
        <span className="font-medium">{breakdown.grantMilestones}</span>
      </div>
      <div className="flex justify-between gap-3 text-xs">
        <span className="text-gray-600 dark:text-gray-400">Grant Milestone Completions</span>
        <span className="font-medium">{breakdown.grantCompletedMilestones}</span>
      </div>
      <div className="flex justify-between gap-3 text-xs">
        <span className="text-gray-600 dark:text-gray-400">Grant Updates</span>
        <span className="font-medium">{breakdown.grantUpdates}</span>
      </div>
    </div>
  ) : null;

  const accentPrimary = hexToRgba(logoBg, 0.1) ?? "rgba(0,144,255,0.07)";
  const accentSecondary = hexToRgba(logoBg, 0.06) ?? "rgba(46,209,168,0.07)";
  const ambientGradient = `radial-gradient(1200px 280px at 10% -20%, ${accentPrimary}, transparent 60%), radial-gradient(800px 220px at 95% 0%, ${accentSecondary}, transparent 60%)`;

  return (
    <div
      className={cn(
        layoutTheme.padding,
        "relative py-0 flex flex-col gap-7 justify-between items-start border-b border-gray-200 dark:border-zinc-800 bg-white dark:bg-black",
        isWhitelabel ? "pt-7" : "pt-7"
      )}
    >
      {!isWhitelabel ? (
        <div
          className="pointer-events-none absolute inset-0 dark:opacity-40"
          style={{ background: ambientGradient }}
        />
      ) : null}
      <nav
        aria-label="Breadcrumb"
        className="relative flex items-center gap-1.5 text-[13px] text-gray-500 dark:text-zinc-400 animate-fade-in-up"
      >
        <Link
          href={PAGES.COMMUNITIES}
          className="hover:text-gray-900 dark:hover:text-white transition-colors"
        >
          Communities
        </Link>
        <ChevronRightIcon size={12} className="text-gray-400 dark:text-zinc-600" />
        <span className="font-medium text-gray-900 dark:text-white">{name}</span>
      </nav>
      <div className="relative flex flex-row gap-6 flex-wrap max-lg:flex-col justify-between items-end w-full">
        <div className="flex h-max flex-1 flex-row items-center justify-start gap-[18px] min-w-0">
          <div
            className="flex items-center justify-center rounded-[18px] shrink-0 shadow-[0_10px_30px_-10px_rgba(0,144,255,0.5),inset_0_1px_0_rgba(255,255,255,0.2)] max-lg:w-14 max-lg:h-14 animate-scale-in"
            style={{ backgroundColor: logoBg, width: 72, height: 72, animationDelay: "60ms" }}
          >
            <div className="flex items-center justify-center rounded-full bg-white border-2 border-white/90 overflow-hidden w-[54px] h-[54px] max-lg:w-10 max-lg:h-10">
              <Image
                alt={name || "Community"}
                src={community?.details?.logoUrl || "/placeholder.png"}
                width={48}
                height={48}
                className="h-9 w-9 object-cover max-lg:h-7 max-lg:w-7"
              />
            </div>
          </div>
          <div
            className="flex flex-col min-w-0 animate-fade-in-up"
            style={{ animationDelay: "120ms" }}
          >
            <div className="flex items-center gap-2.5 flex-wrap mb-1">
              <h1 className="text-[34px] max-2xl:text-3xl max-lg:text-2xl font-body font-semibold tracking-[-0.02em] leading-none text-black dark:text-white m-0">
                {name}
              </h1>
            </div>
            {description ? (
              <p className="text-sm leading-[1.5] text-gray-600 dark:text-zinc-400 font-medium line-clamp-1 max-w-[620px] m-0">
                {description}
              </p>
            ) : null}
            <MetaRow
              sinceYear={sinceYear}
              projectsCount={projectsCount}
              stats={{
                totalGrants: communityStats?.totalGrants,
                projectUpdates: communityStats?.projectUpdates,
                completedMilestones,
                totalMilestones: communityStats?.totalMilestones,
                updatesBreakdown: updatesBreakdownNode,
              }}
            />
          </div>
        </div>
        <div
          className="flex items-center gap-2 max-lg:w-full max-lg:justify-center animate-fade-in-up"
          style={{ animationDelay: "200ms" }}
        >
          <button
            type="button"
            onClick={openKarmaAssistant}
            aria-label={`Ask Assistant about ${communityName || "this community"}`}
            className="group relative overflow-hidden inline-flex items-center gap-2 pl-3 pr-3.5 py-2 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-full text-[13px] font-medium text-gray-900 dark:text-white shadow-[0_1px_2px_rgba(0,0,0,0.04)] hover:border-brand-500 hover:shadow-[0_0_0_3px_rgba(46,209,168,0.12)] transition-all"
          >
            <span className="inline-flex items-center justify-center w-[22px] h-[22px] rounded-full bg-gradient-to-br from-brand-500 to-[#22c9a0] text-white">
              <SparklesIcon size={12} />
            </span>
            Ask Assistant
            <kbd className="ml-0.5 px-1.5 py-px font-mono text-[10.5px] bg-gray-100 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded text-gray-500 dark:text-zinc-400">
              {isMac ? "⌘" : "Ctrl"} K
            </kbd>
            <BorderBeam size={60} duration={5} colorFrom="#2ed1a8" colorTo="#0090FF" />
          </button>
        </div>
      </div>
      <div className="relative w-full animate-fade-in-up" style={{ animationDelay: "280ms" }}>
        <CommunityPageNavigator />
      </div>
    </div>
  );
};
export default function CommunityHeader({ community }: { community: Community }) {
  const pathname = usePathname();
  const isAdminPage = pathname.includes("/manage");
  const isReviewerPage = pathname.includes("/reviewer");
  const isDonatePage = pathname.includes("/donate");
  if (isAdminPage) {
    return <AdminCommunityHeader community={community} />;
  }
  if (isReviewerPage) {
    return null;
  }
  if (isDonatePage) {
    return null;
  }
  // The (with-header) route group layout renders this component — if we're here, show it.
  // Pages that don't need the header belong in other route groups (e.g., (whitelabel)).
  return <NormalCommunityHeader community={community} />;
}
