"use client";

import { ArrowLeft, Building2, MapPin } from "lucide-react";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { PAGES } from "@/utilities/pages";
import { useNonprofit, useNonprofitGrants } from "../hooks/use-nonprofit";
import type { Grant } from "../types/philanthropy";

function formatCurrency(amount: number | null | undefined): string {
  if (amount == null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function GrantsReceivedTable({ grants }: { grants: Grant[] }) {
  if (grants.length === 0) {
    return <p className="text-sm text-zinc-500">No grants received.</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-200 text-left text-xs font-medium uppercase text-zinc-500 dark:border-zinc-800">
            <th className="pb-2 pr-4">Purpose</th>
            <th className="pb-2 pr-4">Amount</th>
            <th className="pb-2 pr-4">Year</th>
            <th className="pb-2 pr-4">Foundation</th>
          </tr>
        </thead>
        <tbody>
          {grants.map((grant) => (
            <tr key={grant.id} className="border-b border-zinc-100 dark:border-zinc-800/50">
              <td className="py-3 pr-4">
                <Link
                  href={PAGES.GRANT_ATLAS.GRANT(grant.id)}
                  className="text-blue-600 hover:underline dark:text-blue-400"
                >
                  {grant.purposeText || "No purpose listed"}
                </Link>
              </td>
              <td className="py-3 pr-4 tabular-nums">{formatCurrency(grant.amount)}</td>
              <td className="py-3 pr-4">{grant.filingYear}</td>
              <td className="py-3 pr-4">
                <Link
                  href={PAGES.GRANT_ATLAS.FOUNDATION(grant.foundationId)}
                  className="text-blue-600 hover:underline dark:text-blue-400"
                >
                  View foundation
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function NonprofitDetail({ id }: { id: string }) {
  const { data: nonprofit, isLoading } = useNonprofit(id);
  const { data: grants, isLoading: grantsLoading } = useNonprofitGrants(id);

  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-4xl space-y-4 px-4 py-8">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!nonprofit) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center">
        <h1 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
          Nonprofit not found
        </h1>
        <Link
          href={PAGES.GRANT_ATLAS.ROOT}
          className="mt-4 inline-block text-sm text-blue-600 hover:underline"
        >
          Back to Grant Atlas
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8">
      <Link
        href={PAGES.GRANT_ATLAS.ROOT}
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
      >
        <ArrowLeft className="size-3.5" />
        Grant Atlas
      </Link>

      <div className="mb-8">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-green-50 dark:bg-green-900/30">
            <Building2 className="size-5 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
              {nonprofit.name}
            </h1>
            <div className="flex items-center gap-3 text-sm text-zinc-500">
              {nonprofit.ein && <span>EIN: {nonprofit.ein}</span>}
              {nonprofit.location && (
                <span className="flex items-center gap-1">
                  <MapPin className="size-3" />
                  {nonprofit.location}
                </span>
              )}
            </div>
          </div>
        </div>
        {nonprofit.description && (
          <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">{nonprofit.description}</p>
        )}
      </div>

      <h2 className="mb-4 text-sm font-medium text-zinc-900 dark:text-zinc-100">
        Grants Received
        {grants && <span className="ml-1.5 text-zinc-400">({grants.length})</span>}
      </h2>

      {grantsLoading ? (
        <Skeleton className="h-48 w-full" />
      ) : (
        <GrantsReceivedTable grants={grants ?? []} />
      )}
    </div>
  );
}
