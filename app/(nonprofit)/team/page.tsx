"use client";

import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useTeamOrg } from "@/hooks/useTeam";
import {
  TEAM_ROLE_DESCRIPTIONS,
  TEAM_ROLE_LABELS,
  type TeamRole,
  VISIBLE_TEAM_ROLES,
} from "@/lib/hermes-client";
import { NonprofitPageHeader } from "@/src/features/nonprofit/PageHeader";
import { PAGES } from "@/utilities/pages";

// Initial + a single accent color per role. Letter monograms read as real
// people on a real team (Linear, Figma, Notion all do this) and skip the
// "icon-in-colored-rounded-square" SaaS-template look.
const ROLE_VISUALS: Record<TeamRole, { initial: string; bg: string; text: string }> = {
  orchestrator: { initial: "E", bg: "bg-emerald-100", text: "text-emerald-900" },
  fundraiser: { initial: "F", bg: "bg-amber-100", text: "text-amber-900" },
  communications: { initial: "C", bg: "bg-sky-100", text: "text-sky-900" },
  operations: { initial: "O", bg: "bg-violet-100", text: "text-violet-900" },
};

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
      <NonprofitPageHeader
        eyebrow="Team"
        title="Your AI employees"
        description="Each employee owns a slice of your nonprofit. Open one to chat, set their About, or manage their skills."
        actions={<StatusDot status={org?.status ?? "unknown"} />}
      />

      <ul className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {VISIBLE_TEAM_ROLES.map((role: TeamRole) => {
          const visual = ROLE_VISUALS[role];
          return (
            <li key={role}>
              <Link
                href={`${PAGES.TEAM.MEMBER(role)}?slug=${slug}`}
                className="group relative block h-full rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-gray-300 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-3">
                  <div
                    className={`grid h-10 w-10 place-items-center rounded-full ${visual.bg} ${visual.text} font-semibold`}
                    aria-hidden
                  >
                    {visual.initial}
                  </div>
                  <ArrowUpRight
                    className="h-4 w-4 text-gray-300 transition group-hover:text-gray-700"
                    aria-hidden
                  />
                </div>
                <div className="mt-4 text-base font-semibold text-gray-900">
                  {TEAM_ROLE_LABELS[role]}
                </div>
                <p className="mt-1.5 text-sm leading-relaxed text-gray-600">
                  {TEAM_ROLE_DESCRIPTIONS[role]}
                </p>
              </Link>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
