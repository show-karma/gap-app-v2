"use client";

import { ArrowLeft, HandCoins } from "lucide-react";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { PAGES } from "@/utilities/pages";
import { useGrant } from "../hooks/use-grant";

function formatCurrency(amount: number | null | undefined): string {
  if (amount == null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function GrantDetail({ id }: { id: string }) {
  const { data: grant, isLoading } = useGrant(id);

  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-4xl space-y-4 px-4 py-8">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!grant) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center">
        <h1 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">Grant not found</h1>
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
          <div className="flex size-10 items-center justify-center rounded-lg bg-amber-50 dark:bg-amber-900/30">
            <HandCoins className="size-5 text-amber-600 dark:text-amber-400" />
          </div>
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">Grant Detail</h1>
        </div>
      </div>

      <div className="space-y-6 rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        {grant.purposeText && (
          <div>
            <h3 className="text-xs font-medium uppercase text-zinc-500">Purpose</h3>
            <p className="mt-1 text-sm text-zinc-900 dark:text-zinc-100">{grant.purposeText}</p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-6 sm:grid-cols-3">
          <div>
            <h3 className="text-xs font-medium uppercase text-zinc-500">Amount</h3>
            <p className="mt-1 text-lg font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
              {formatCurrency(grant.amount)}
            </p>
          </div>

          <div>
            <h3 className="text-xs font-medium uppercase text-zinc-500">Filing Year</h3>
            <p className="mt-1 text-sm text-zinc-900 dark:text-zinc-100">{grant.filingYear}</p>
          </div>

          {grant.date && (
            <div>
              <h3 className="text-xs font-medium uppercase text-zinc-500">Date</h3>
              <p className="mt-1 text-sm text-zinc-900 dark:text-zinc-100">
                {new Date(grant.date).toLocaleDateString()}
              </p>
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-4 border-t border-zinc-200 pt-4 dark:border-zinc-800">
          <Link
            href={PAGES.GRANT_ATLAS.FOUNDATION(grant.foundationId)}
            className="text-sm text-blue-600 hover:underline dark:text-blue-400"
          >
            View Foundation
          </Link>
          {grant.nonprofitId && (
            <Link
              href={PAGES.GRANT_ATLAS.NONPROFIT(grant.nonprofitId)}
              className="text-sm text-blue-600 hover:underline dark:text-blue-400"
            >
              View Nonprofit Recipient
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
