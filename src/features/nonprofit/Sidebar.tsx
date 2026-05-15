"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { PAGES } from "@/utilities/pages";

interface NavLink {
  href: string;
  label: string;
  match: (pathname: string) => boolean;
  // Onboarding hides once a team is set up; the others surface only when
  // a slug is known.
  show: (slug: string | undefined) => boolean;
}

const NAV: NavLink[] = [
  {
    href: PAGES.TEAM.ONBOARDING,
    label: "Onboarding",
    match: (p) => p === PAGES.TEAM.ONBOARDING,
    show: (slug) => !slug,
  },
  {
    href: PAGES.TEAM.DIRECTORY,
    label: "Team",
    match: (p) => p === PAGES.TEAM.DIRECTORY || p.startsWith(`${PAGES.TEAM.DIRECTORY}/`),
    show: (slug) => Boolean(slug),
  },
  {
    href: PAGES.ORG,
    label: "Org Brain",
    match: (p) => p === PAGES.ORG,
    show: (slug) => Boolean(slug),
  },
  {
    href: PAGES.WORK,
    label: "Work",
    match: (p) => p === PAGES.WORK,
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
    <aside className="hidden w-56 shrink-0 border-r bg-white md:block">
      <nav className="sticky top-0 px-4 py-6">
        <p className="px-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
          Your nonprofit
        </p>
        <ul className="mt-3 space-y-1">
          {visible.map((link) => {
            const active = link.match(pathname);
            return (
              <li key={link.href}>
                <Link
                  href={`${link.href}${qs}`}
                  className={`block rounded px-3 py-2 text-sm transition ${
                    active
                      ? "bg-black text-white"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                  aria-current={active ? "page" : undefined}
                >
                  {link.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
