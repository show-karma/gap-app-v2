"use client";

import { useParams, useRouter } from "next/navigation";
import pluralize from "pluralize";
import { Skeleton } from "@/components/Utilities/Skeleton";
import { useTeamOrg } from "@/hooks/useTeam";
import { VISIBLE_TEAM_ROLES } from "@/lib/ai-agent-client";
import { humanizeApiError } from "@/lib/ai-agent-error";
import { CrewCard } from "@/src/features/team/CrewCard";

function StatusDot({ status }: { status: string }) {
  const color =
    status === "active"
      ? "bg-emerald-500"
      : status === "provisioning"
        ? "bg-amber-500 animate-pulse"
        : status === "failed"
          ? "bg-red-500"
          : "bg-gray-400";
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-gray-600 dark:text-zinc-400">
      <span className={`h-1.5 w-1.5 rounded-full ${color}`} aria-hidden />
      <span className="capitalize">{status}</span>
    </span>
  );
}

export default function TeamDirectoryPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const { data: org, isLoading, isError, error } = useTeamOrg(slug);

  if (isLoading) {
    return (
      <main className="w-full">
        <Skeleton className="h-8 w-64 rounded" />
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {VISIBLE_TEAM_ROLES.map((role) => (
            <Skeleton key={role} className="h-32 rounded border" />
          ))}
        </div>
      </main>
    );
  }

  if (isError) {
    return (
      <main className="w-full">
        <h1 className="text-2xl font-semibold">Couldn&apos;t load your team</h1>
        <p className="mt-3 text-sm text-red-600">
          {humanizeApiError(error, "We couldn't load your team. Try again in a moment.")}
        </p>
        <button
          type="button"
          onClick={() => router.refresh()}
          className="mt-6 rounded border dark:border-zinc-700 px-4 py-2 dark:text-zinc-300"
        >
          Try again
        </button>
      </main>
    );
  }

  return (
    <main className="w-full">
      <div className="flex items-end justify-between gap-6">
        <div className="max-w-xl">
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-emerald-600">
            Your Team
          </div>
          <h1 className="text-[34px] font-bold leading-[1.05] tracking-[-0.025em] text-gray-900 dark:text-zinc-100">
            {VISIBLE_TEAM_ROLES.length} {pluralize("teammate", VISIBLE_TEAM_ROLES.length)} on the
            case for <span className="text-gray-900 dark:text-zinc-100">{slug}</span>.
          </h1>
          <p className="mt-3 text-sm leading-[1.5] text-gray-500 dark:text-zinc-400">
            Tap a card to chat. They each own a slice — fundraising, comms, ops — and report to ED.
          </p>
        </div>
        <StatusDot status={org?.status ?? "unknown"} />
      </div>

      <ul className="mt-8 grid grid-cols-1 gap-[18px] md:grid-cols-2 lg:grid-cols-3">
        {VISIBLE_TEAM_ROLES.map((role) => (
          <li key={role}>
            <CrewCard role={role} slug={slug} />
          </li>
        ))}
      </ul>
    </main>
  );
}
