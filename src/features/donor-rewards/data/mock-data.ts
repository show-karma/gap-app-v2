import type {
  BadgeDef,
  CauseId,
  CauseInfo,
  ImpactUpdate,
  LeaguePeer,
  LevelDef,
  Nonprofit,
  Quest,
  RewardsState,
} from "../types";

export const CAUSES: Record<CauseId, CauseInfo> = {
  climate: { id: "climate", label: "Climate", emoji: "🌍" },
  education: { id: "education", label: "Education", emoji: "📚" },
  health: { id: "health", label: "Health", emoji: "🩺" },
  food: { id: "food", label: "Food Security", emoji: "🥕" },
  housing: { id: "housing", label: "Housing", emoji: "🏠" },
  arts: { id: "arts", label: "Arts & Culture", emoji: "🎭" },
};

export const LEVELS: LevelDef[] = [
  { name: "Supporter", minXp: 0 },
  { name: "Contributor", minXp: 500 },
  { name: "Champion", minXp: 1200 },
  { name: "Benefactor", minXp: 2200 },
  { name: "Philanthropist", minXp: 3500 },
  { name: "Luminary", minXp: 5200 },
];

export const XP_PER_GRANT = 150;
export const XP_NEW_CAUSE_BONUS = 50;
export const XP_RECURRING_BONUS = 100;

export const NONPROFITS: Nonprofit[] = [
  {
    id: "org-rainforest",
    name: "Rainforest Guardians",
    tagline: "Protecting 40,000 acres of primary forest in the Amazon basin",
    cause: "climate",
    emoji: "🌳",
    verified: true,
    impactNote: "14 milestones verified this year",
    suggestedAmounts: [100, 250, 500],
  },
  {
    id: "org-solar",
    name: "SunUp Communities",
    tagline: "Solar microgrids for off-grid clinics and schools",
    cause: "climate",
    emoji: "☀️",
    verified: true,
    impactNote: "9 milestones verified this year",
    suggestedAmounts: [100, 250, 500],
  },
  {
    id: "org-tutors",
    name: "Open Door Tutors",
    tagline: "Free 1:1 tutoring for first-generation students",
    cause: "education",
    emoji: "✏️",
    verified: true,
    impactNote: "11 milestones verified this year",
    suggestedAmounts: [50, 150, 300],
  },
  {
    id: "org-meals",
    name: "Harvest Table",
    tagline: "Rescuing surplus produce for 120 neighborhood pantries",
    cause: "food",
    emoji: "🍎",
    verified: true,
    impactNote: "17 milestones verified this year",
    suggestedAmounts: [100, 250, 500],
  },
  {
    id: "org-clinic",
    name: "Mobile Health Collective",
    tagline: "Pop-up clinics reaching rural patients without coverage",
    cause: "health",
    emoji: "🚐",
    verified: false,
    impactNote: "Reporting onboarding in progress",
    suggestedAmounts: [100, 250, 500],
  },
  {
    id: "org-stage",
    name: "Neighborhood Stage",
    tagline: "Youth theater programs in under-resourced schools",
    cause: "arts",
    emoji: "🎭",
    verified: true,
    impactNote: "6 milestones verified this year",
    suggestedAmounts: [50, 150, 300],
  },
];

const INITIAL_QUESTS: Quest[] = [
  {
    id: "q-climate",
    title: "Fund a climate project",
    description: "Make a grant to any climate organization this month",
    xp: 120,
    type: "grant_cause",
    targetCause: "climate",
    goal: 1,
    progress: 0,
  },
  {
    id: "q-any-grant",
    title: "Keep your streak alive",
    description: "Make at least one grant in July",
    xp: 80,
    type: "grant_any",
    goal: 1,
    progress: 0,
  },
  {
    id: "q-recurring",
    title: "Put giving on autopilot",
    description: "Set up one recurring monthly grant",
    xp: 150,
    type: "recurring",
    goal: 1,
    progress: 0,
  },
  {
    id: "q-updates",
    title: "See your impact",
    description: "Read 2 verified updates from your grantees",
    xp: 60,
    type: "read_updates",
    goal: 2,
    progress: 1,
  },
];

const INITIAL_BADGES: BadgeDef[] = [
  {
    id: "b-first-grant",
    name: "First Grant",
    description: "Made your very first grant",
    emoji: "🌱",
    unlocked: true,
  },
  {
    id: "b-streak-3",
    name: "3-Month Streak",
    description: "Granted 3 months in a row",
    emoji: "🔥",
    unlocked: true,
  },
  {
    id: "b-early-bird",
    name: "Early Bird",
    description: "Gave before Giving Tuesday",
    emoji: "🐦",
    unlocked: true,
  },
  {
    id: "b-big-heart",
    name: "Big Heart",
    description: "Granted $10,000 in a single year",
    emoji: "💗",
    unlocked: true,
  },
  {
    id: "b-local-hero",
    name: "Local Hero",
    description: "Supported a nonprofit in your own city",
    emoji: "🏙️",
    unlocked: true,
  },
  {
    id: "b-cause-explorer",
    name: "Cause Explorer",
    description: "Supported 5 different cause areas",
    emoji: "🧭",
    unlocked: false,
  },
  {
    id: "b-recurring",
    name: "Recurring Giver",
    description: "Set up a recurring monthly grant",
    emoji: "🔁",
    unlocked: false,
  },
  {
    id: "b-streak-12",
    name: "12-Month Streak",
    description: "A full year of monthly giving",
    emoji: "🏆",
    unlocked: false,
  },
  {
    id: "b-matcher",
    name: "Matcher",
    description: "Joined a matching campaign",
    emoji: "🤝",
    unlocked: false,
  },
  {
    id: "b-luminary",
    name: "Luminary",
    description: "Reached the highest giving level",
    emoji: "✨",
    unlocked: false,
  },
];

const INITIAL_UPDATES: ImpactUpdate[] = [
  {
    id: "u-harvest",
    orgName: "Harvest Table",
    orgEmoji: "🍎",
    title: "Milestone complete: 500,000 lbs of produce rescued",
    detail:
      "Six months ahead of schedule. Your March grant helped fund the two refrigerated vans that made the new routes possible.",
    postedAgo: "2 days ago",
    verified: true,
    read: false,
    xp: 15,
  },
  {
    id: "u-tutors",
    orgName: "Open Door Tutors",
    orgEmoji: "✏️",
    title: "Spring cohort results are in",
    detail:
      "94% of tutored students passed algebra, up from 61% last year. 38 new volunteer tutors onboarded.",
    postedAgo: "5 days ago",
    verified: true,
    read: false,
    xp: 15,
  },
  {
    id: "u-stage",
    orgName: "Neighborhood Stage",
    orgEmoji: "🎭",
    title: "Summer production funded and cast",
    detail:
      "62 students from 4 schools are staging The Tempest in August. Costume shop is run entirely by students.",
    postedAgo: "1 week ago",
    verified: true,
    read: true,
    xp: 15,
  },
  {
    id: "u-clinic",
    orgName: "Mobile Health Collective",
    orgEmoji: "🚐",
    title: "Q2 report: 1,840 patients seen",
    detail: "Three new county partnerships signed. Dental van pilot starts in September.",
    postedAgo: "2 weeks ago",
    verified: false,
    read: false,
    xp: 15,
  },
];

export const LEAGUE_PEERS: Omit<LeaguePeer, "points" | "isUser">[] = [
  { id: "p1", alias: "Quiet Redwood", emoji: "🌲" },
  { id: "p2", alias: "Golden Finch", emoji: "🐤" },
  { id: "p3", alias: "Steady Lantern", emoji: "🏮" },
  { id: "p4", alias: "Blue Harbor", emoji: "⚓" },
  { id: "p5", alias: "Kind Comet", emoji: "☄️" },
  { id: "p6", alias: "Bright Acorn", emoji: "🌰" },
  { id: "p7", alias: "Silver Brook", emoji: "🌊" },
];

export const INITIAL_STATE: RewardsState = {
  balance: 48200,
  grantedThisYear: 16750,
  annualGoal: 25000,
  xp: 2140,
  streakMonths: 4,
  longestStreak: 7,
  grantedThisMonth: false,
  idleDays: 47,
  // Three causes to date. The Cause Explorer badge needs five, so it stays
  // locked until the donor branches into genuinely new areas over several
  // grants — a single grant can never trip it.
  causesSupported: ["education", "health", "food"],
  quests: INITIAL_QUESTS,
  badges: INITIAL_BADGES,
  updates: INITIAL_UPDATES,
  grants: [],
  hasRecurringGrant: false,
  celebration: null,
  verifiedMilestones: 23,
};

export const RECAP_YEAR = 2026;
