"use client";

import { ChevronRight, Search } from "lucide-react";
/**
 * Page breadcrumbs — ported from
 * grant-atlas src/features/grant-atlas/components/page-breadcrumbs.tsx.
 *
 * Reads the search session store to resolve `searchId` → query text.
 * Uses Next.js `Link` from `next/link` instead of TanStack Router's `Link`.
 * Uses `NON_PROFITS_PAGES` route constants from `utilities/pages.ts`.
 *
 * Returns `null` when there is nothing meaningful to display (no searchId
 * with a resolved query, and no middle breadcrumb items).
 */
import Link from "next/link";
import { NON_PROFITS_PAGES } from "@/utilities/pages";
import { useSearchSessionStore } from "../store/search-session";

export interface BreadcrumbItem {
  label: string;
  href: string;
}

interface PageBreadcrumbsProps {
  currentLabel: string;
  searchId?: string;
  middle?: BreadcrumbItem | BreadcrumbItem[];
}

export function PageBreadcrumbs({ currentLabel, searchId, middle }: PageBreadcrumbsProps) {
  const searchQuery = useSearchSessionStore((s) =>
    searchId ? s.sessions[searchId]?.query : undefined
  );

  const middleItems = middle ? (Array.isArray(middle) ? middle : [middle]) : [];
  const hasSearch = !!(searchId && searchQuery);
  if (!hasSearch && middleItems.length === 0) return null;

  const chevron = (
    <ChevronRight className="size-3.5 text-zinc-300 dark:text-zinc-600" aria-hidden />
  );
  let itemCount = 0;

  return (
    <nav aria-label="Breadcrumb" className="mb-4">
      <ol className="flex min-w-0 items-center gap-1.5 text-sm">
        {hasSearch && searchId && (
          <li className="flex min-w-0 shrink items-center gap-1.5">
            {itemCount++ > 0 && chevron}
            <Link
              href={NON_PROFITS_PAGES.SEARCH(searchId)}
              className="flex min-w-0 items-center gap-1 text-zinc-500 transition-colors hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
            >
              <Search className="size-3 shrink-0" aria-hidden />
              <span className="truncate">{searchQuery}</span>
            </Link>
          </li>
        )}
        {middleItems.map((item) => (
          <li key={item.href} className="flex min-w-0 shrink items-center gap-1.5">
            {itemCount++ > 0 && chevron}
            <Link
              href={item.href}
              className="truncate text-zinc-500 transition-colors hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
            >
              {item.label}
            </Link>
          </li>
        ))}
        <li className="flex min-w-0 shrink-0 items-center gap-1.5">
          {itemCount++ > 0 && chevron}
          <span className="truncate font-medium text-zinc-900 dark:text-zinc-100">
            {currentLabel}
          </span>
        </li>
      </ol>
    </nav>
  );
}
