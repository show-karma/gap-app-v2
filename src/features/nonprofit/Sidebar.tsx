"use client";

import { Building2, KanbanSquare, type LucideIcon, Puzzle, Users } from "lucide-react";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { PAGES } from "@/utilities/pages";

interface NavLink {
  href: (slug: string) => string;
  label: string;
  icon: LucideIcon;
  match: (pathname: string, slug: string) => boolean;
}

const NAV: NavLink[] = [
  {
    href: (slug) => PAGES.TEAM.DIRECTORY(slug),
    label: "Team",
    icon: Users,
    match: (p, slug) =>
      p === PAGES.TEAM.DIRECTORY(slug) || p.startsWith(`${PAGES.TEAM.DIRECTORY(slug)}/`),
  },
  {
    href: (slug) => PAGES.ORG(slug),
    label: "Org Brain",
    icon: Building2,
    match: (p, slug) => p === PAGES.ORG(slug),
  },
  {
    href: (slug) => PAGES.WORK(slug),
    label: "Work",
    icon: KanbanSquare,
    match: (p, slug) => p === PAGES.WORK(slug),
  },
  {
    href: (slug) => PAGES.SKILLS(slug),
    label: "Skills",
    icon: Puzzle,
    match: (p, slug) => p === PAGES.SKILLS(slug) || p.startsWith(`${PAGES.SKILLS(slug)}/`),
  },
];

export function NonprofitSidebar() {
  const pathname = usePathname();
  // Slug comes from the URL segment — undefined on the /onboarding route
  // which sits outside the [slug] dynamic segment.
  const params = useParams<{ slug?: string }>();
  const slug = params.slug;

  // Without a slug we're on a non-team route (e.g. /onboarding) — nothing
  // in the sidebar applies yet.
  const visible = slug ? NAV : [];

  return (
    <aside className="hidden w-60 shrink-0 border-r border-gray-200 dark:border-zinc-800 bg-gray-50/40 dark:bg-zinc-900 md:block">
      <nav className="sticky top-0 px-3 py-6">
        <div className="px-3 pb-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-400 dark:text-zinc-500">
            Workspace
          </p>
          <div className="mt-1 flex items-center gap-2">
            <span className="grid h-7 w-7 place-items-center rounded-md bg-gray-900 dark:bg-zinc-100 text-[11px] font-semibold text-white dark:text-zinc-900">
              {(slug?.[0] ?? "?").toUpperCase()}
            </span>
            <span className="truncate text-sm font-semibold text-gray-900 dark:text-zinc-100">
              {slug ?? "Not set up"}
            </span>
          </div>
        </div>
        <ul className="space-y-0.5">
          {visible.map((link) => {
            const href = link.href(slug ?? "");
            const active = slug ? link.match(pathname, slug) : false;
            const Icon = link.icon;
            return (
              <li key={link.label}>
                <Link
                  href={href}
                  className={`group flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition ${
                    active
                      ? "bg-gray-900 dark:bg-zinc-100 text-white dark:text-zinc-900 shadow-sm"
                      : "text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-800"
                  }`}
                  aria-current={active ? "page" : undefined}
                >
                  <Icon
                    className={`h-4 w-4 shrink-0 ${
                      active
                        ? "text-white dark:text-zinc-900"
                        : "text-gray-400 dark:text-zinc-500 group-hover:text-gray-700 dark:group-hover:text-zinc-300"
                    }`}
                    aria-hidden
                  />
                  <span>{link.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
