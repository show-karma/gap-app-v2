export type CauseId = "climate" | "education" | "health" | "food" | "housing" | "arts";

export interface CauseInfo {
  id: CauseId;
  label: string;
  emoji: string;
}

export interface Nonprofit {
  id: string;
  name: string;
  tagline: string;
  cause: CauseId;
  emoji: string;
  /** Karma GAP verified impact reporting */
  verified: boolean;
  impactNote: string;
  suggestedAmounts: number[];
}

export type QuestType = "grant_cause" | "grant_any" | "recurring" | "read_updates";

export interface Quest {
  id: string;
  title: string;
  description: string;
  xp: number;
  type: QuestType;
  targetCause?: CauseId;
  /** for progress-based quests such as reading updates */
  goal: number;
  progress: number;
}

export interface BadgeDef {
  id: string;
  name: string;
  description: string;
  emoji: string;
  unlocked: boolean;
}

export interface ImpactUpdate {
  id: string;
  orgName: string;
  orgEmoji: string;
  title: string;
  detail: string;
  postedAgo: string;
  verified: boolean;
  read: boolean;
  xp: number;
  /** Total IP actually credited when read, including quest-completion bonuses */
  xpAwarded?: number;
}

export interface GrantRecord {
  id: string;
  orgId: string;
  orgName: string;
  amount: number;
  cause: CauseId;
  recurring: boolean;
}

export interface LeaguePeer {
  id: string;
  alias: string;
  emoji: string;
  points: number;
  isUser: boolean;
}

export interface LevelDef {
  name: string;
  minXp: number;
}

export interface CelebrationPayload {
  grant: GrantRecord;
  xpEarned: number;
  questsCompleted: Quest[];
  badgesUnlocked: BadgeDef[];
  leveledUpTo: string | null;
  newStreak: number | null;
}

export interface PersonalGoalTargets {
  /** how many distinct cause areas to support this year */
  causesTarget: number;
  /** how many months in a row to give */
  monthsTarget: number;
}

export interface RewardsState {
  balance: number;
  grantedThisYear: number;
  /** cumulative dollars granted since the fund opened */
  lifetimeGranted: number;
  /** investment returns earned inside the fund this year */
  investmentGains: number;
  annualGoal: number;
  personalGoals: PersonalGoalTargets;
  xp: number;
  streakMonths: number;
  longestStreak: number;
  grantedThisMonth: boolean;
  idleDays: number;
  causesSupported: CauseId[];
  quests: Quest[];
  badges: BadgeDef[];
  updates: ImpactUpdate[];
  grants: GrantRecord[];
  hasRecurringGrant: boolean;
  celebration: CelebrationPayload | null;
  verifiedMilestones: number;
}
