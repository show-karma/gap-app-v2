"use client";

import { Building2, Compass, KanbanSquare, type LucideIcon, Puzzle, Users } from "lucide-react";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { PAGES } from "@/utilities/pages";

interface NavLink {
  href: (slug: string) => string;
  label: string;
  icon: LucideIcon;
  match: (pathname: string, slug: string) => boolean;
  /** Show only when slug is present (i.e., team is set up), except onboarding */
  requiresSlug: boolean;
}

const NAV: NavLink[] = [
  {
    href: () => PAGES.TEAM.ONBOARDING,
    label: "Onboarding",
    icon: Compass,
    match: (p) => p === PAGES.TEAM.ONBOARDING,
    requiresSlug: false,
  },
  {
    href: (slug) => PAGES.TEAM.DIRECTORY(slug),
    label: "Team",
    icon: Users,
    match: (p, slug) =>
      p === PAGES.TEAM.DIRECTORY(slug) || p.startsWith(`${PAGES.TEAM.DIRECTORY(slug)}/`),
    requiresSlug: true,
  },
  {
    href: (slug) => PAGES.ORG(slug),
    label: "Org Brain",
    icon: Building2,
    match: (p, slug) => p === PAGES.ORG(slug),
    requiresSlug: true,
  },
  {
    href: (slug) => PAGES.WORK(slug),
    label: "Work",
    icon: KanbanSquare,
    match: (p, slug) => p === PAGES.WORK(slug),
    requiresSlug: true,
  },
  {
    href: (slug) => PAGES.SKILLS(slug),
    label: "Skills",
    icon: Puzzle,
    match: (p, slug) => p === PAGES.SKILLS(slug) || p.startsWith(`${PAGES.SKILLS(slug)}/`),
    requiresSlug: true,
  },
];

export function NonprofitSidebar() {
  const pathname = usePathname();
  // Slug comes from the URL segment — undefined on the /onboarding route
  // which sits outside the [slug] dynamic segment.
  const params = useParams<{ slug?: string }>();
  const slug = params.slug;

  const visible = NAV.filter((link) => {
    if (!link.requiresSlug) return true;
    return Boolean(slug);
  });

  return (
    <aside className="hidden w-60 shrink-0 border-r border-gray-200 bg-gray-50/40 md:block">
      <nav className="sticky top-0 px-3 py-6">
        <div className="px-3 pb-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-400">
            Workspace
          </p>
          <div className="mt-1 flex items-center gap-2">
            <span className="grid h-7 w-7 place-items-center rounded-md bg-gray-900 text-[11px] font-semibold text-white">
              {(slug?.[0] ?? "?").toUpperCase()}
            </span>
            <span className="truncate text-sm font-semibold text-gray-900">
              {slug ?? "Not set up"}
            </span>
          </div>
        </div>
        <ul className="space-y-0.5">
          {visible.map((link) => {
            const href = link.href(slug ?? "");
            const active = slug ? link.match(pathname, slug) : pathname === PAGES.TEAM.ONBOARDING;
            const Icon = link.icon;
            return (
              <li key={link.label}>
                <Link
                  href={href}
                  className={`group flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition ${
                    active ? "bg-gray-900 text-white shadow-sm" : "text-gray-700 hover:bg-gray-100"
                  }`}
                  aria-current={active ? "page" : undefined}
                >
                  <Icon
                    className={`h-4 w-4 shrink-0 ${
                      active ? "text-white" : "text-gray-400 group-hover:text-gray-700"
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
