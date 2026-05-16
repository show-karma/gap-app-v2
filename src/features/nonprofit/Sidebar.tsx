"use client";

import { Building2, Compass, KanbanSquare, type LucideIcon, Puzzle, Users } from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { PAGES } from "@/utilities/pages";

interface NavLink {
  href: string;
  label: string;
  icon: LucideIcon;
  match: (pathname: string) => boolean;
  show: (slug: string | undefined) => boolean;
}

const NAV: NavLink[] = [
  {
    href: PAGES.TEAM.ONBOARDING,
    label: "Onboarding",
    icon: Compass,
    match: (p) => p === PAGES.TEAM.ONBOARDING,
    show: (slug) => !slug,
  },
  {
    href: PAGES.TEAM.DIRECTORY,
    label: "Team",
    icon: Users,
    match: (p) => p === PAGES.TEAM.DIRECTORY || p.startsWith(`${PAGES.TEAM.DIRECTORY}/`),
    show: (slug) => Boolean(slug),
  },
  {
    href: PAGES.ORG,
    label: "Org Brain",
    icon: Building2,
    match: (p) => p === PAGES.ORG,
    show: (slug) => Boolean(slug),
  },
  {
    href: PAGES.WORK,
    label: "Work",
    icon: KanbanSquare,
    match: (p) => p === PAGES.WORK,
    show: (slug) => Boolean(slug),
  },
  {
    href: PAGES.SKILLS,
    label: "Skills",
    icon: Puzzle,
    match: (p) => p === PAGES.SKILLS || p.startsWith(`${PAGES.SKILLS}/`),
    show: (slug) => Boolean(slug),
  },
];

export function NonprofitSidebar() {
  const pathname = usePathname();
  const params = useSearchParams();
  const [slug, setSlug] = useState<string | undefined>(undefined);

  useEffect(() => {
    setSlug(params.get("slug") ?? undefined);
  }, [params]);

  const qs = slug ? `?slug=${slug}` : "";
  const visible = NAV.filter((link) => link.show(slug) || link.match(pathname));

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
            const active = link.match(pathname);
            const Icon = link.icon;
            return (
              <li key={link.href}>
                <Link
                  href={`${link.href}${qs}`}
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
