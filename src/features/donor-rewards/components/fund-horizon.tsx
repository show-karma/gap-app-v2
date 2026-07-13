"use client";

import { Hourglass } from "lucide-react";
import pluralize from "pluralize";
import { useState } from "react";
import { useRewards } from "../state/rewards-context";
import { formatUsd } from "../utils/format";

/** Rough demo heuristic: every $750 granted touches about one verified milestone. */
const DOLLARS_PER_MILESTONE = 750;
const PEER_PAYOUT_RATE = 10;

export function FundHorizon() {
  const { state } = useRewards();
  const [payoutRate, setPayoutRate] = useState(5);

  const yearsToDeploy = Math.max(1, Math.round(100 / payoutRate));
  const annualDollars = Math.round((state.balance * payoutRate) / 100);
  const milestonesPerYear = Math.max(1, Math.round(annualDollars / DOLLARS_PER_MILESTONE));

  return (
    <section
      aria-label="Fund horizon"
      className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm dark:border-stone-800 dark:bg-stone-900"
    >
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-3">
          <Hourglass
            className="mt-0.5 h-5 w-5 text-emerald-700 dark:text-emerald-500"
            aria-hidden="true"
          />
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-[0.15em] text-stone-500 dark:text-stone-400">
              Fund horizon
            </h2>
            <p className="mt-1 max-w-md text-sm text-stone-700 dark:text-stone-300">
              At a <span className="font-mono font-bold">{payoutRate}%</span> annual payout, your{" "}
              {formatUsd(state.balance)} deploys in about{" "}
              <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                {yearsToDeploy} {pluralize("year", yearsToDeploy)}
              </span>{" "}
              and funds an estimated{" "}
              <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                {milestonesPerYear}
              </span>{" "}
              verified {pluralize("milestone", milestonesPerYear)} per year.
            </p>
          </div>
        </div>

        <div className="w-full max-w-xs">
          <label
            htmlFor="payout-rate"
            className="mb-1 flex items-center justify-between text-xs font-medium text-stone-500 dark:text-stone-400"
          >
            <span>Annual payout rate</span>
            <span className="font-mono font-bold text-stone-800 dark:text-stone-200">
              {payoutRate}% · {formatUsd(annualDollars)}/yr
            </span>
          </label>
          <input
            id="payout-rate"
            aria-label="Annual payout rate"
            type="range"
            min={2}
            max={25}
            step={1}
            value={payoutRate}
            onChange={(event) => setPayoutRate(Number(event.target.value))}
            className="w-full accent-emerald-600"
          />
          <p className="mt-1 text-[11px] text-stone-400 dark:text-stone-500">
            {payoutRate < PEER_PAYOUT_RATE
              ? `Donors like you target ${PEER_PAYOUT_RATE}%+ per year. Money that moves creates impact now.`
              : "Nice pace. Your dollars are working, not resting."}
          </p>
        </div>
      </div>
    </section>
  );
}
