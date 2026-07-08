"use client";

import { createContext, use, useMemo, useReducer } from "react";
import {
  INITIAL_STATE,
  NONPROFITS,
  XP_NEW_CAUSE_BONUS,
  XP_PER_GRANT,
  XP_RECURRING_BONUS,
} from "../data/mock-data";
import type {
  BadgeDef,
  CelebrationPayload,
  PersonalGoalTargets,
  Quest,
  RewardsState,
} from "../types";
import { levelForXp } from "../utils/levels";
import { questsCompletedByGrant, questsCompletedByRead } from "./quest-logic";

type RewardsAction =
  | { type: "MAKE_GRANT"; orgId: string; amount: number; recurring: boolean }
  | { type: "READ_UPDATE"; updateId: string }
  | { type: "SET_ANNUAL_GOAL"; amount: number }
  | { type: "SET_PERSONAL_GOALS"; targets: Partial<PersonalGoalTargets> }
  | { type: "DISMISS_CELEBRATION" };

function unlockBadge(badges: BadgeDef[], id: string, unlockedList: BadgeDef[]): BadgeDef[] {
  return badges.map((badge) => {
    if (badge.id === id && !badge.unlocked) {
      const unlockedBadge = { ...badge, unlocked: true };
      unlockedList.push(unlockedBadge);
      return unlockedBadge;
    }
    return badge;
  });
}

function applyGrant(
  state: RewardsState,
  action: { orgId: string; amount: number; recurring: boolean }
): RewardsState {
  const org = NONPROFITS.find((nonprofit) => nonprofit.id === action.orgId);
  if (!org) return state;

  const grant = {
    id: `grant-${state.grants.length + 1}`,
    orgId: org.id,
    orgName: org.name,
    amount: action.amount,
    cause: org.cause,
    recurring: action.recurring,
  };

  // Windfall-first accounting with separate pools: a grant spends this year's
  // investment gains before it ever touches principal. Granting exactly your
  // gains therefore leaves the "ready to deploy" balance whole — matching the
  // Gains card's promise — and only a grant larger than the remaining gains
  // draws principal down.
  const gainsApplied = Math.min(action.amount, state.investmentGains);
  const balanceDrawn = action.amount - gainsApplied;

  const isNewCause = !state.causesSupported.includes(org.cause);
  const causesSupported = isNewCause
    ? [...state.causesSupported, org.cause]
    : state.causesSupported;

  let xpEarned = XP_PER_GRANT;
  if (isNewCause) xpEarned += XP_NEW_CAUSE_BONUS;
  if (action.recurring) xpEarned += XP_RECURRING_BONUS;

  const completedIds = new Set(
    questsCompletedByGrant(state.quests, { cause: org.cause, recurring: action.recurring }).map(
      (quest) => quest.id
    )
  );
  const questsCompleted: Quest[] = [];
  const quests = state.quests.map((quest) => {
    if (!completedIds.has(quest.id)) return quest;
    const completed = { ...quest, progress: quest.goal };
    questsCompleted.push(completed);
    return completed;
  });
  xpEarned += questsCompleted.reduce((sum, quest) => sum + quest.xp, 0);

  const badgesUnlocked: BadgeDef[] = [];
  let badges = state.badges;
  if (causesSupported.length >= 5) {
    badges = unlockBadge(badges, "b-cause-explorer", badgesUnlocked);
  }
  if (action.recurring) {
    badges = unlockBadge(badges, "b-recurring", badgesUnlocked);
  }

  const previousLevel = levelForXp(state.xp);
  const newXp = state.xp + xpEarned;
  const newLevel = levelForXp(newXp);
  const leveledUpTo = newLevel.minXp > previousLevel.minXp ? newLevel.name : null;
  if (newLevel.name === "Luminary") {
    badges = unlockBadge(badges, "b-luminary", badgesUnlocked);
  }

  const extendsStreak = !state.grantedThisMonth;
  const streakMonths = extendsStreak ? state.streakMonths + 1 : state.streakMonths;

  const celebration: CelebrationPayload = {
    grant,
    xpEarned,
    questsCompleted,
    badgesUnlocked,
    leveledUpTo,
    newStreak: extendsStreak ? streakMonths : null,
  };

  return {
    ...state,
    balance: Math.max(0, state.balance - balanceDrawn),
    grantedThisYear: state.grantedThisYear + action.amount,
    lifetimeGranted: state.lifetimeGranted + action.amount,
    investmentGains: state.investmentGains - gainsApplied,
    xp: newXp,
    streakMonths,
    longestStreak: Math.max(state.longestStreak, streakMonths),
    grantedThisMonth: true,
    idleDays: 0,
    causesSupported,
    quests,
    badges,
    grants: [...state.grants, grant],
    hasRecurringGrant: state.hasRecurringGrant || action.recurring,
    celebration,
  };
}

function applyReadUpdate(state: RewardsState, updateId: string): RewardsState {
  const update = state.updates.find((item) => item.id === updateId);
  if (!update || update.read) return state;

  const questBonus = questsCompletedByRead(state.quests).reduce((sum, quest) => sum + quest.xp, 0);
  const xpEarned = update.xp + questBonus;

  // xpAwarded records the full credit (update + quest bonus) so the feed can
  // report exactly what this read actually earned.
  const updates = state.updates.map((item) =>
    item.id === updateId ? { ...item, read: true, xpAwarded: xpEarned } : item
  );

  const quests = state.quests.map((quest) => {
    if (quest.type !== "read_updates" || quest.progress >= quest.goal) return quest;
    return { ...quest, progress: quest.progress + 1 };
  });

  return { ...state, updates, quests, xp: state.xp + xpEarned };
}

function rewardsReducer(state: RewardsState, action: RewardsAction): RewardsState {
  switch (action.type) {
    case "MAKE_GRANT":
      return applyGrant(state, action);
    case "READ_UPDATE":
      return applyReadUpdate(state, action.updateId);
    case "SET_ANNUAL_GOAL":
      return { ...state, annualGoal: action.amount };
    case "SET_PERSONAL_GOALS":
      return { ...state, personalGoals: { ...state.personalGoals, ...action.targets } };
    case "DISMISS_CELEBRATION":
      return { ...state, celebration: null };
    default:
      return state;
  }
}

interface RewardsContextValue {
  state: RewardsState;
  makeGrant: (orgId: string, amount: number, recurring: boolean) => void;
  readUpdate: (updateId: string) => void;
  setAnnualGoal: (amount: number) => void;
  setPersonalGoals: (targets: Partial<PersonalGoalTargets>) => void;
  dismissCelebration: () => void;
}

const RewardsContext = createContext<RewardsContextValue | null>(null);

export function RewardsProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(rewardsReducer, INITIAL_STATE);

  const value = useMemo<RewardsContextValue>(
    () => ({
      state,
      makeGrant: (orgId, amount, recurring) =>
        dispatch({ type: "MAKE_GRANT", orgId, amount, recurring }),
      readUpdate: (updateId) => dispatch({ type: "READ_UPDATE", updateId }),
      setAnnualGoal: (amount) => dispatch({ type: "SET_ANNUAL_GOAL", amount }),
      setPersonalGoals: (targets) => dispatch({ type: "SET_PERSONAL_GOALS", targets }),
      dismissCelebration: () => dispatch({ type: "DISMISS_CELEBRATION" }),
    }),
    [state]
  );

  return <RewardsContext.Provider value={value}>{children}</RewardsContext.Provider>;
}

export function useRewards(): RewardsContextValue {
  const context = use(RewardsContext);
  if (!context) {
    throw new Error("useRewards must be used within a RewardsProvider");
  }
  return context;
}
