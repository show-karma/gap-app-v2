"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useTeamOrg } from "@/hooks/useTeam";
import { VISIBLE_TEAM_ROLES } from "@/lib/hermes-client";
import { CrewCard } from "@/src/features/team/CrewCard";
import { PAGES } from "@/utilities/pages";

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
    <span className="inline-flex items-center gap-1.5 text-xs text-gray-600">
      <span className={`h-1.5 w-1.5 rounded-full ${color}`} aria-hidden />
      <span className="capitalize">{status}</span>
    </span>
  );
}

// Surfaces the six visible employees as a roster. The slug for "which org's
// team" is currently driven by ?slug=... query param — in a follow-up this
// will move to a dedicated /[slug]/team route once we wire org → user
// mapping on the indexer side.
export default function TeamDirectoryPage() {
  const params = useSearchParams();
  const router = useRouter();
  const [slug, setSlug] = useState<string | undefined>(undefined);

  useEffect(() => {
    setSlug(params.get("slug") ?? undefined);
  }, [params]);

  const { data: org, isLoading, isError, error } = useTeamOrg(slug);

  if (!slug) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="text-2xl font-semibold">Your Team</h1>
        <p className="mt-4 text-gray-700">
          You don&apos;t have a team set up yet. Walk through onboarding to create yours.
        </p>
        <button
          type="button"
          onClick={() => router.push(PAGES.TEAM.ONBOARDING)}
          className="mt-6 rounded bg-black px-4 py-2 text-white"
        >
          Set up my team
        </button>
      </main>
    );
  }

  if (isLoading) {
    return (
      <main className="mx-auto max-w-5xl px-6 py-12">
        <div className="h-8 w-64 animate-pulse rounded bg-gray-200" />
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {VISIBLE_TEAM_ROLES.map((role) => (
            <div key={role} className="h-32 animate-pulse rounded border bg-gray-100" />
          ))}
        </div>
      </main>
    );
  }

  if (isError) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="text-2xl font-semibold">Couldn&apos;t load your team</h1>
        <p className="mt-3 text-sm text-red-600">
          {error instanceof Error ? error.message : "Unknown error"}
        </p>
        <button
          type="button"
          onClick={() => router.refresh()}
          className="mt-6 rounded border px-4 py-2"
        >
          Try again
        </button>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <div className="flex items-end justify-between gap-6">
        <div className="max-w-xl">
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-emerald-600">
            Your Team
          </div>
          <h1 className="text-[34px] font-bold leading-[1.05] tracking-[-0.025em] text-gray-900">
            Four teammates on the case
            {slug ? (
              <>
                {" "}
                for <span className="text-gray-900">{slug}</span>.
              </>
            ) : (
              "."
            )}
          </h1>
          <p className="mt-3 text-sm leading-[1.5] text-gray-500">
            Tap a card to chat. They each own a slice — fundraising, comms, ops — and report to ED.
          </p>
        </div>
        <StatusDot status={org?.status ?? "unknown"} />
      </div>

      <ul className="mt-8 grid grid-cols-1 gap-[18px] md:grid-cols-2">
        {VISIBLE_TEAM_ROLES.map((role) => (
          <li key={role}>
            <CrewCard role={role} slug={slug} />
          </li>
        ))}
      </ul>
    </main>
  );
}
