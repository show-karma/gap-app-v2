"use client";

import { notFound, useParams } from "next/navigation";
import { useDashboardContext } from "@/components/Pages/Dashboard/DashboardProvider";
import { SoftIcon } from "@/components/Pages/Dashboard/v3/SoftIcon";
import { Link } from "@/src/components/navigation/Link";

/**
 * `/dashboard/[module]` — a single role module's full drill-in view. The module
 * is resolved from the shared context by its route key; an unknown/ungated key
 * 404s. "Back to overview" is a plain `<Link href="/dashboard">`, so browser
 * Back closes the drill-in natively.
 *
 * The tile→drill-in morph animation from the in-place overview isn't wired here
 * yet (route transition) — that's a deliberate follow-up.
 */
export default function DashboardModulePage() {
  const { modules } = useDashboardContext();
  const params = useParams<{ module: string }>();
  const activeModule = modules.find((m) => m.key === params.module);

  if (!activeModule) {
    notFound();
  }

  return (
    <div>
      <Link
        href="/dashboard"
        className="mb-4 inline-flex h-9 items-center gap-2 rounded-full border border-sf-line-strong bg-sf-card pl-[11px] pr-[15px] text-[13px] font-semibold text-sf-ink-soft hover:bg-sf-chip"
      >
        <SoftIcon
          name="arrow"
          className="h-[15px] w-[15px]"
          style={{ transform: "rotate(180deg)" }}
        />
        Back to overview
      </Link>
      {activeModule.render()}
    </div>
  );
}
