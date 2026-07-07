"use client";

import { useState } from "react";
import { RewardsProvider } from "../state/rewards-context";
import { BadgesGrid } from "./badges-grid";
import { CelebrationOverlay } from "./celebration-overlay";
import { GoalRing } from "./goal-ring";
import { GrantFlow } from "./grant-flow";
import { IdleNudge } from "./idle-nudge";
import { ImpactFeed } from "./impact-feed";
import { LeagueCard } from "./league-card";
import { QuestsCard } from "./quests-card";
import { RewardsHeader } from "./rewards-header";
import { StreakCard } from "./streak-card";
import { YearRecap } from "./year-recap";

export function DonorRewardsApp() {
  const [grantFlowOpen, setGrantFlowOpen] = useState(false);
  const [recapOpen, setRecapOpen] = useState(false);

  return (
    <RewardsProvider>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
        <RewardsHeader
          onOpenGrantFlow={() => setGrantFlowOpen(true)}
          onOpenRecap={() => setRecapOpen(true)}
        />

        <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-3">
          <StreakCard />
          <GoalRing />
          <IdleNudge onOpenGrantFlow={() => setGrantFlowOpen(true)} />
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <QuestsCard />
          </div>
          <LeagueCard />
        </div>

        <div className="mt-6">
          <BadgesGrid />
        </div>

        <div className="mt-6">
          <ImpactFeed />
        </div>

        <p className="mt-8 text-center text-xs text-zinc-400 dark:text-zinc-500">
          Prototype with sample data. No real grants are made from this page.
        </p>
      </main>

      <GrantFlow open={grantFlowOpen} onClose={() => setGrantFlowOpen(false)} />
      <CelebrationOverlay />
      <YearRecap open={recapOpen} onClose={() => setRecapOpen(false)} />
    </RewardsProvider>
  );
}
