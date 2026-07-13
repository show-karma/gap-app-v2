"use client";

import { domAnimation, LazyMotion } from "motion/react";
import { useState } from "react";
import { RewardsProvider } from "../state/rewards-context";
import { BadgesGrid } from "./badges-grid";
import { CelebrationOverlay } from "./celebration-overlay";
import { FundHorizon } from "./fund-horizon";
import { GainsCard } from "./gains-card";
import { GoalRing } from "./goal-ring";
import { GrantFlow } from "./grant-flow";
import { IdleNudge } from "./idle-nudge";
import { ImpactFeed } from "./impact-feed";
import { LeagueCard } from "./league-card";
import { PersonalGoals } from "./personal-goals";
import { QuestsCard } from "./quests-card";
import { RewardsHeader } from "./rewards-header";
import { StreakCard } from "./streak-card";
import { YearRecap } from "./year-recap";

interface GrantRequest {
  open: boolean;
  amount: number | null;
}

export function DonorRewardsApp() {
  const [grantRequest, setGrantRequest] = useState<GrantRequest>({ open: false, amount: null });
  const [recapOpen, setRecapOpen] = useState(false);

  const openGrantFlow = () => setGrantRequest({ open: true, amount: null });
  const openGrantFlowWithAmount = (amount: number) => setGrantRequest({ open: true, amount });
  const closeGrantFlow = () => setGrantRequest({ open: false, amount: null });

  return (
    <RewardsProvider>
      <LazyMotion features={domAnimation} strict>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
          <RewardsHeader onOpenGrantFlow={openGrantFlow} onOpenRecap={() => setRecapOpen(true)} />

          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <FundHorizon />
            </div>
            <GainsCard onGrantGains={openGrantFlowWithAmount} />
          </div>

          <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-3">
            <StreakCard />
            <GoalRing />
            <IdleNudge onOpenGrantFlow={openGrantFlow} />
          </div>

          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <QuestsCard />
            </div>
            <div className="flex flex-col gap-6">
              <PersonalGoals />
              <LeagueCard />
            </div>
          </div>

          <div className="mt-6">
            <BadgesGrid />
          </div>

          <div className="mt-6">
            <ImpactFeed />
          </div>

          <p className="mt-8 text-center text-xs text-stone-400 dark:text-stone-500">
            Prototype with sample data. No real grants are made from this page.
          </p>
        </main>

        <GrantFlow
          open={grantRequest.open}
          requestedAmount={grantRequest.amount}
          onClose={closeGrantFlow}
        />
        <CelebrationOverlay />
        <YearRecap open={recapOpen} onClose={() => setRecapOpen(false)} />
      </LazyMotion>
    </RewardsProvider>
  );
}
