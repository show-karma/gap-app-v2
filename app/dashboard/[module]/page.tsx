"use client";

import { notFound, redirect, useParams } from "next/navigation";
import { type MouseEvent, useEffect, useState } from "react";
import { useDashboardContext } from "@/components/Pages/Dashboard/DashboardProvider";
import { DASHBOARD_MODULE_KEYS } from "@/components/Pages/Dashboard/v3/module";
import { SkeletonList } from "@/components/Pages/Dashboard/v3/primitives";
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
 * is resolved from the shared context by its route key.
 *
 * A key resolves in three ways, in order:
 *  - **still resolving** (`!isSettled`): hold a skeleton — never 404 while the
 *    module queries are in flight, or a hard load / refresh / deep link would
 *    404 before its module appears;
 *  - **known but not gated for this user**: send them back to the overview;
 *  - **unknown key**: a genuine 404.
 *
 * "Back to overview" is a plain `<Link href="/dashboard">`, so browser Back
 * closes the drill-in natively; the container carries the module's
 * `view-transition-name` so opening/closing morphs across the route change.
 */
export default function DashboardModulePage() {
  const { modules, isSettled } = useDashboardContext();
  const params = useParams<{ module: string }>();
  const navigate = useDashboardTransition();
  const activeModule = modules.find((m) => m.key === params.module);
  const isKnownKey = (DASHBOARD_MODULE_KEYS as readonly string[]).includes(params.module);

  // Tell an in-flight open transition the drill-in has painted so it can
  // capture the "after" snapshot and run the morph.
  useEffect(() => {
    signalDashboardRoutePainted();
  }, []);

  // A gated module can be briefly absent from `modules` right after its query
  // resolves — some hooks (e.g. useUserApplications) land the data in a Zustand
  // store one render later. Wait out a short grace before treating a known key
  // as "not gated", so a hard load / deep link of a module the user DOES have
  // renders instead of bouncing to the overview.
  const [graceExpired, setGraceExpired] = useState(false);
  useEffect(() => {
    if (activeModule || !isSettled) {
      setGraceExpired(false);
      return;
    }
    const timer = setTimeout(() => setGraceExpired(true), 600);
    return () => clearTimeout(timer);
  }, [activeModule, isSettled]);

  if (!activeModule) {
    // A key that isn't a real module is a genuine 404, immediately.
    if (!isKnownKey) {
      notFound();
    }
    // Known key: hold a skeleton while data resolves (and through the grace),
    // then — if the module still hasn't appeared — the user isn't gated for it.
    if (!isSettled || !graceExpired) {
      return <SkeletonList count={4} />;
    }
    redirect("/dashboard");
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
