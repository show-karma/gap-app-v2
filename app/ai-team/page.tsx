"use client";

import { AlertCircle, Plus, Users } from "lucide-react";
import Link from "next/link";
import { Skeleton } from "@/components/Utilities/Skeleton";
import { useMyOrgs } from "@/hooks/useTeam";
import { humanizeApiError } from "@/lib/ai-agent-error";
import { PAGES } from "@/utilities/pages";

export default function AITeamListPage() {
  const { data, isLoading, isError, error, refetch } = useMyOrgs();

  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-semibold leading-tight tracking-tight text-gray-900 dark:text-zinc-100">
            Your AI teams
          </h1>
          <p className="mt-2 max-w-xl text-sm text-gray-600 dark:text-zinc-400">
            Each team runs in its own private container. Open one to manage employees, work, and org
            brain.
          </p>
        </div>
        <Link
          href={PAGES.TEAM.ONBOARDING}
          className="inline-flex shrink-0 items-center gap-2 rounded-md bg-gray-900 dark:bg-zinc-100 px-3.5 py-2 text-sm font-medium text-white dark:text-zinc-900 shadow-sm transition hover:bg-gray-800 dark:hover:bg-zinc-200"
        >
          <Plus className="h-4 w-4" aria-hidden />
          New team
        </Link>
      </div>

      {isLoading ? (
        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-28 rounded-2xl" />
        </div>
      ) : isError ? (
        <div className="mt-10 flex items-start gap-2 rounded-lg border border-amber-200 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/30 px-4 py-3">
          <AlertCircle
            className="mt-0.5 h-4 w-4 shrink-0 text-amber-700 dark:text-amber-400"
            aria-hidden
          />
          <div className="flex-1">
            <p className="text-sm text-amber-900 dark:text-amber-300">
              {humanizeApiError(error, "Couldn't load your teams")}
            </p>
            <button
              type="button"
              onClick={() => refetch()}
              className="mt-2 text-sm font-medium text-amber-900 dark:text-amber-300 underline"
            >
              Try again
            </button>
          </div>
        </div>
      ) : !data || data.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed border-gray-300 dark:border-zinc-700 p-10 text-center">
          <Users className="mx-auto h-8 w-8 text-gray-400 dark:text-zinc-500" aria-hidden />
          <h2 className="mt-4 text-lg font-semibold text-gray-900 dark:text-zinc-100">
            No teams yet
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-zinc-400">
            Spin up your first AI team to get started.
          </p>
          <Link
            href={PAGES.TEAM.ONBOARDING}
            className="mt-5 inline-flex items-center gap-2 rounded-md bg-gray-900 dark:bg-zinc-100 px-4 py-2 text-sm font-medium text-white dark:text-zinc-900 shadow-sm transition hover:bg-gray-800 dark:hover:bg-zinc-200"
          >
            <Plus className="h-4 w-4" aria-hidden />
            Set up a team
          </Link>
        </div>
      ) : (
        <ul className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {data.map((org) => (
            <li key={org.id}>
              <Link
                href={PAGES.TEAM.DIRECTORY(org.slug)}
                className="group flex h-full flex-col gap-3 rounded-2xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-sm transition hover:border-gray-300 dark:hover:border-zinc-700 hover:shadow-md"
              >
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-lg bg-gray-900 dark:bg-zinc-100 text-base font-semibold text-white dark:text-zinc-900">
                    {org.slug[0]?.toUpperCase() ?? "?"}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-gray-900 dark:text-zinc-100">
                      {org.slug}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-zinc-400">
                      {org.role} · {org.status}
                    </p>
                  </div>
                </div>
                <p className="text-xs text-gray-500 dark:text-zinc-400">
                  Joined {new Date(org.joinedAt).toLocaleDateString()}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
