"use client";

import { notFound, useParams } from "next/navigation";
import { type MouseEvent, useEffect } from "react";
import { useDashboardContext } from "@/components/Pages/Dashboard/DashboardProvider";
import { SoftIcon } from "@/components/Pages/Dashboard/v3/SoftIcon";
import { moduleTransitionName } from "@/components/Pages/Dashboard/v3/soft-classes";
import {
  signalDashboardRoutePainted,
  supportsViewTransitions,
  useDashboardTransition,
} from "@/components/Pages/Dashboard/v3/useDashboardTransition";
import { Link } from "@/src/components/navigation/Link";

/**
 * `/dashboard/[module]` — a single role module's full drill-in view. The module
 * is resolved from the shared context by its route key; an unknown/ungated key
 * 404s. "Back to overview" is a plain `<Link href="/dashboard">`, so browser
 * Back closes the drill-in natively.
 *
 * The drill-in container carries the module's `view-transition-name`, matching
 * its overview tile, so opening/closing morphs the box across the route change.
 */
export default function DashboardModulePage() {
  const { modules } = useDashboardContext();
  const params = useParams<{ module: string }>();
  const navigate = useDashboardTransition();
  const activeModule = modules.find((m) => m.key === params.module);

  // Tell an in-flight open transition the drill-in has painted so it can
  // capture the "after" snapshot and run the morph.
  useEffect(() => {
    signalDashboardRoutePainted();
  }, []);

  if (!activeModule) {
    notFound();
  }

  const handleBack = (e: MouseEvent<HTMLAnchorElement>) => {
    if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    if (!supportsViewTransitions()) return;
    e.preventDefault();
    navigate("/dashboard");
  };

  return (
    <div>
      <Link
        href="/dashboard"
        onClick={handleBack}
        className="mb-4 inline-flex h-9 items-center gap-2 rounded-full border border-sf-line-strong bg-sf-card pl-[11px] pr-[15px] text-[13px] font-semibold text-sf-ink-soft hover:bg-sf-chip"
      >
        <SoftIcon
          name="arrow"
          className="h-[15px] w-[15px]"
          style={{ transform: "rotate(180deg)" }}
        />
        Back to overview
      </Link>
      <div style={{ viewTransitionName: moduleTransitionName(activeModule.key) }}>
        {activeModule.render()}
      </div>
    </div>
  );
}
