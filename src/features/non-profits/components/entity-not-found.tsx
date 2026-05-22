import Link from "next/link";
import type * as React from "react";
import { NON_PROFITS_PAGES } from "@/utilities/pages";

/**
 * Unified not-found state for non-profits detail pages (foundation, nonprofit, grant).
 * Keeps every detail route's empty state visually consistent.
 */
export function EntityNotFound({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center px-4 text-center">
      <div className="mb-3 flex size-14 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
        {icon}
      </div>
      <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{title}</h1>
      <p className="mt-1 text-sm text-zinc-500">{description}</p>
      <Link
        href={NON_PROFITS_PAGES.HOME}
        className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
      >
        Back to Non-Profits
      </Link>
    </div>
  );
}
