import { tourSurface } from "./storage";
import { TOUR_ANCHORS, type TourAnchor } from "./tour-anchors";

export interface TourStep {
  anchor: TourAnchor;
  title: string;
  description: string;
}

export interface TourDefinition {
  id: string;
  /**
   * Bump when the steps change materially. The version is part of the storage
   * key, so raising it re-runs the tour for people who saw the previous cut.
   */
  version: number;
  steps: TourStep[];
}

export const TOUR_IDS = {
  gettingStarted: "getting-started",
  findFunders: "find-funders",
  reviewerInbox: "reviewer-inbox",
  projectWorkspace: "project-workspace",
} as const;

/**
 * One spotlight pointing at the profile menu, so people know where to find the
 * walkthroughs again. Deliberately not shown at sign-in — it competes with
 * whatever the user actually came to do, and a recovery affordance is only
 * meaningful once there is something to recover to.
 */
export const GETTING_STARTED_TOUR: TourDefinition = {
  id: TOUR_IDS.gettingStarted,
  version: 1,
  steps: [
    {
      anchor: TOUR_ANCHORS.gettingStarted,
      title: "Find your way back",
      description:
        "Walkthroughs for everything you can do on Karma live in this menu, under Getting started. Open it any time.",
    },
  ],
};

/**
 * Replaces the find-funders help modal. Its content already described the three
 * things on screen — search, results, the research tray — so it reads better
 * anchored to them than in a panel covering them.
 */
export const FIND_FUNDERS_TOUR: TourDefinition = {
  id: TOUR_IDS.findFunders,
  version: 1,
  steps: [
    {
      anchor: TOUR_ANCHORS.findFundersSearch,
      title: "Search in plain language",
      description:
        "Describe the funding you're looking for the way you'd say it out loud — the cause, the place, the size of the grant. Press Enter to run it.",
    },
    {
      anchor: TOUR_ANCHORS.findFundersResults,
      title: "Results come with the reasoning",
      description:
        "Every match is analysed against IRS 990 filings. Click any result to see the detail behind it.",
    },
    {
      anchor: TOUR_ANCHORS.findFundersTray,
      title: "Build a prospect list",
      description:
        "Bookmark funders as you go and they collect here, so a session of searching ends with a shortlist you can work from.",
    },
  ],
};

/**
 * Reviewers arrive already assigned, so this covers what the screen cannot show
 * them: the boundaries of the role. The limitations step is the one piece of the
 * retired ReviewerOnboarding component worth keeping — an absent permission has
 * no affordance to point at, so nothing else teaches it.
 */
export const REVIEWER_INBOX_TOUR: TourDefinition = {
  id: TOUR_IDS.reviewerInbox,
  version: 1,
  steps: [
    {
      anchor: TOUR_ANCHORS.reviewerInboxQueue,
      title: "Your review queue",
      description:
        "Applications waiting on you, across every program you've been added to. Open one to read it and leave your assessment.",
    },
    {
      anchor: TOUR_ANCHORS.reviewerInboxScope,
      title: "What a reviewer decides",
      description:
        "You score applications and leave comments. Editing an application, making the final funding call, and changing program settings stay with the program's admins.",
    },
  ],
};

/**
 * Fires once a project exists — on an empty workspace two of these anchors have
 * nothing behind them, and the concepts they'd explain are better placed in the
 * empty states the user is already reading.
 */
export const PROJECT_WORKSPACE_TOUR: TourDefinition = {
  id: TOUR_IDS.projectWorkspace,
  version: 1,
  steps: [
    {
      anchor: TOUR_ANCHORS.projectGrants,
      title: "Add the grants you've received",
      description:
        "Each grant hangs off your project, so funders can see what was awarded and what came of it.",
    },
    {
      anchor: TOUR_ANCHORS.projectUpdates,
      title: "Post milestones and updates",
      description:
        "Progress you publish here is what funders check when they're deciding whether to fund you again.",
    },
  ],
};

export const ALL_TOURS: readonly TourDefinition[] = [
  GETTING_STARTED_TOUR,
  FIND_FUNDERS_TOUR,
  REVIEWER_INBOX_TOUR,
  PROJECT_WORKSPACE_TOUR,
];

/** Storage surface for a tour, carrying its version. */
export function surfaceFor(tour: TourDefinition): string {
  return tourSurface(tour.id, tour.version);
}
