"use client";

import { Compass, LayoutGrid, Rocket, ScanEye } from "lucide-react";
import type { ComponentType } from "react";
import { useEffect } from "react";
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
import { trackRecoveryOpened } from "../lib/analytics";
import { withTourParam } from "../lib/tour-query";
import { TOUR_IDS } from "../lib/tours";

interface ChooserEntry {
  key: string;
  icon: ComponentType<{ className?: string }>;
  title: string;
  body: string;
  href: string;
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
    href: withTourParam(PAGES.MY_PROJECTS, TOUR_IDS.projectWorkspace),
  },
  {
    key: "reviews",
    icon: ScanEye,
    title: "Reviewing applications",
    body: "How the review queue works, and where a reviewer's remit ends.",
    href: withTourParam(PAGES.DASHBOARD_MODULE("reviews"), TOUR_IDS.reviewerInbox),
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
        <ul className="flex list-none flex-col gap-1 p-0">
          {ENTRIES.map((entry) => {
            const Icon = entry.icon;
            return (
              <li key={entry.key}>
                <Link
                  href={entry.href}
                  onClick={close}
                  className="flex w-full flex-row items-start gap-3 rounded-lg p-3 text-left transition-colors hover:bg-muted focus-visible:bg-muted"
                >
                  <Icon className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
                  <span className="flex flex-col gap-0.5">
                    <span className="text-sm font-medium text-foreground">{entry.title}</span>
                    <span className="text-xs leading-relaxed text-muted-foreground">
                      {entry.body}
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
