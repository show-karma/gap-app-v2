"use client";

import { Compass, LayoutGrid, Rocket, ScanEye } from "lucide-react";
import type { ComponentType } from "react";
import { useEffect } from "react";
import type { DashboardModuleKey } from "@/components/Pages/Dashboard/v3/module";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Link } from "@/src/components/navigation/Link";
import { useGettingStarted } from "@/store/modals/gettingStarted";
import { NON_PROFITS_PAGES, PAGES } from "@/utilities/pages";
import { useOnboardingScope } from "../hooks/use-onboarding-scope";
import { useReachableModules } from "../hooks/use-reachable-modules";
import { trackRecoveryOpened } from "../lib/analytics";
import { withTourParam } from "../lib/tour-query";
import { TOUR_IDS } from "../lib/tours";

interface ChooserEntry {
  key: string;
  icon: ComponentType<{ className?: string }>;
  title: string;
  body: string;
  href: string;
  /**
   * Dashboard module this entry drills into. `/dashboard/[module]` redirects
   * back to the overview for a module the user isn't gated for, so offering one
   * they don't have throws them straight back to where they started with no
   * explanation. Entries without a module key are always reachable.
   */
  requiresModule?: DashboardModuleKey;
}

/**
 * Every walkthrough runs on the page it describes, so each entry links to that
 * page and asks it to start the tour on arrival.
 */
const ENTRIES: ChooserEntry[] = [
  {
    key: "overview",
    icon: LayoutGrid,
    title: "See what you can do on Karma",
    body: "The starting points for every kind of account, and where each one leads.",
    href: PAGES.DASHBOARD,
  },
  {
    key: "find-funders",
    icon: Compass,
    title: "Find Funders",
    body: "Search foundations and grants for your nonprofit, and collect a prospect list.",
    href: withTourParam(NON_PROFITS_PAGES.HOME, TOUR_IDS.findFunders),
  },
  {
    key: "projects",
    icon: Rocket,
    title: "Your project workspace",
    body: "Record the grants you've received and publish milestones funders can follow.",
    href: withTourParam(PAGES.DASHBOARD_MODULE("projects"), TOUR_IDS.projectWorkspace),
    requiresModule: "projects",
  },
  {
    key: "reviews",
    icon: ScanEye,
    title: "Reviewing applications",
    body: "How the review queue works, and where a reviewer's remit ends.",
    href: withTourParam(PAGES.DASHBOARD_MODULE("reviews"), TOUR_IDS.reviewerInbox),
    requiresModule: "reviews",
  },
];

/**
 * Always-available way back into onboarding, reachable from the profile menu on
 * every page. Deliberately not dismissible-forever: getting lost a second time
 * is exactly when someone needs this, and a walkthrough they've already seen is
 * still the thing they're looking for.
 */
export function GettingStartedDialog() {
  const { isOpen, close } = useGettingStarted();
  const { scope, isAuthenticated } = useOnboardingScope();

  useEffect(() => {
    if (!isOpen) return;
    trackRecoveryOpened({
      userId: isAuthenticated ? scope : undefined,
      source: "profile-menu",
    });
  }, [isOpen, isAuthenticated, scope]);

  return (
    <Dialog open={isOpen} onOpenChange={(next) => !next && close()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Getting started</DialogTitle>
          <DialogDescription>
            Walkthroughs for the things Karma does. Open one whenever you need it.
          </DialogDescription>
        </DialogHeader>
        <ChooserEntries onNavigate={close} />
      </DialogContent>
    </Dialog>
  );
}

/**
 * Rendered only while the dialog is open — Radix unmounts dialog content when
 * closed, so the module queries below never run just because the app loaded.
 */
function ChooserEntries({ onNavigate }: { onNavigate: () => void }) {
  const { keys, isResolved } = useReachableModules(true);
  // Hold the module-scoped entries until we know they lead somewhere; offering
  // one the user isn't gated for bounces them back to the overview.
  const entries = ENTRIES.filter(
    (entry) => !entry.requiresModule || (isResolved && keys.has(entry.requiresModule))
  );

  return (
    <ul className="flex list-none flex-col gap-1 p-0">
      {entries.map((entry) => {
        const Icon = entry.icon;
        return (
          <li key={entry.key}>
            <Link
              href={entry.href}
              onClick={onNavigate}
              className="flex w-full flex-row items-start gap-3 rounded-lg p-3 text-left transition-colors hover:bg-muted focus-visible:bg-muted"
            >
              <Icon className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
              <span className="flex flex-col gap-0.5">
                <span className="text-sm font-medium text-foreground">{entry.title}</span>
                <span className="text-xs leading-relaxed text-muted-foreground">{entry.body}</span>
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
