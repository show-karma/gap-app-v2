"use client";

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
import { PAGES } from "@/utilities/pages";

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
    <main className="mx-auto max-w-5xl px-6 py-12">
      <header className="flex items-baseline justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Your Team</h1>
          <p className="text-sm text-gray-600">
            Status: <span className="font-medium">{org?.status ?? "unknown"}</span>
          </p>
        </div>
      </header>

      <ul className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {VISIBLE_TEAM_ROLES.map((role: TeamRole) => (
          <li key={role}>
            <Link
              href={`${PAGES.TEAM.MEMBER(role)}?slug=${slug}`}
              className="block h-full rounded-lg border bg-white p-5 shadow-sm transition hover:shadow"
            >
              <div className="text-base font-semibold">{TEAM_ROLE_LABELS[role]}</div>
              <p className="mt-2 text-sm text-gray-600">{TEAM_ROLE_DESCRIPTIONS[role]}</p>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
