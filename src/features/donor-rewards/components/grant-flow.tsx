"use client";

import { ArrowLeft, BadgeCheck, X } from "lucide-react";
import { AnimatePresence, m } from "motion/react";
import React, { useEffect, useState } from "react";
import { CAUSES, NONPROFITS } from "../data/mock-data";
import { useRewards } from "../state/rewards-context";
import type { Nonprofit } from "../types";
import { formatUsd } from "../utils/format";

interface GrantFlowProps {
  open: boolean;
  onClose: () => void;
}

const OrgOption = React.memo(function OrgOption({
  org,
  onSelect,
}: {
  org: Nonprofit;
  onSelect: (org: Nonprofit) => void;
}) {
  const cause = CAUSES[org.cause];

  return (
    <li>
      <button
        type="button"
        onClick={() => onSelect(org)}
        className="flex w-full items-start gap-3 rounded-2xl border border-zinc-200 bg-white p-4 text-left transition hover:border-emerald-400 hover:shadow-md active:scale-[0.99] dark:border-zinc-700 dark:bg-zinc-800 dark:hover:border-emerald-500"
      >
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-2xl dark:bg-zinc-700">
          {org.emoji}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-1.5">
            <span className="font-bold text-zinc-900 dark:text-white">{org.name}</span>
            {org.verified && (
              <span className="inline-flex items-center gap-0.5 rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-bold text-sky-700 dark:bg-sky-500/15 dark:text-sky-400">
                <BadgeCheck className="h-3 w-3" aria-hidden="true" />
                Verified
              </span>
            )}
          </span>
          <span className="mt-0.5 block text-sm text-zinc-500 dark:text-zinc-400">
            {org.tagline}
          </span>
          <span className="mt-1.5 flex items-center gap-2 text-xs">
            <span className="rounded-full bg-zinc-100 px-2 py-0.5 font-medium text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300">
              {cause.emoji} {cause.label}
            </span>
            <span className="text-zinc-400 dark:text-zinc-500">{org.impactNote}</span>
          </span>
        </span>
      </button>
    </li>
  );
});

export function GrantFlow({ open, onClose }: GrantFlowProps) {
  const { state, makeGrant } = useRewards();
  const [selectedOrg, setSelectedOrg] = useState<Nonprofit | null>(null);
  const [amount, setAmount] = useState<number>(500);
  const [recurring, setRecurring] = useState(false);

  const handleClose = () => {
    onClose();
    setSelectedOrg(null);
    setAmount(500);
    setRecurring(false);
  };

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") handleClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  const handleConfirm = () => {
    if (!selectedOrg) return;
    makeGrant(selectedOrg.id, amount, recurring);
    handleClose();
  };

  const isNewCause = selectedOrg ? !state.causesSupported.includes(selectedOrg.cause) : false;

  return (
    <AnimatePresence>
      {open && (
        <m.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 backdrop-blur-sm sm:items-center sm:p-6"
        >
          <m.div
            role="dialog"
            aria-modal="true"
            aria-label="Make a grant"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-zinc-50 p-6 shadow-2xl sm:rounded-3xl dark:bg-zinc-900"
          >
            <div className="flex items-center justify-between">
              {selectedOrg ? (
                <button
                  type="button"
                  onClick={() => setSelectedOrg(null)}
                  className="flex items-center gap-1 text-sm font-semibold text-zinc-500 transition hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
                >
                  <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                  Back
                </button>
              ) : (
                <h2 className="text-xl font-semibold text-zinc-900 dark:text-white">
                  Make a grant
                </h2>
              )}
              <button
                type="button"
                onClick={handleClose}
                aria-label="Close"
                className="rounded-full p-2 text-zinc-400 transition hover:bg-zinc-200 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            {!selectedOrg ? (
              <>
                <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                  Suggested for you, based on your causes and this month's quests
                </p>
                <ul className="mt-4 flex flex-col gap-3">
                  {NONPROFITS.map((org) => (
                    <OrgOption key={org.id} org={org} onSelect={setSelectedOrg} />
                  ))}
                </ul>
              </>
            ) : (
              <div className="mt-4">
                <div className="flex items-center gap-3 rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800">
                  <span className="text-3xl">{selectedOrg.emoji}</span>
                  <div>
                    <p className="font-bold text-zinc-900 dark:text-white">{selectedOrg.name}</p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      {selectedOrg.impactNote}
                    </p>
                  </div>
                </div>

                <p className="mt-5 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                  Grant amount
                </p>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {selectedOrg.suggestedAmounts.map((suggested) => (
                    <button
                      key={suggested}
                      type="button"
                      onClick={() => setAmount(suggested)}
                      className={`rounded-2xl border-2 py-3 font-mono text-lg font-bold transition active:scale-95 ${
                        amount === suggested
                          ? "border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
                          : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                      }`}
                    >
                      {formatUsd(suggested)}
                    </button>
                  ))}
                </div>

                <label className="mt-5 flex cursor-pointer items-center justify-between rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800">
                  <span>
                    <span className="block font-semibold text-zinc-900 dark:text-white">
                      Make it monthly
                    </span>
                    <span className="block text-xs text-zinc-500 dark:text-zinc-400">
                      Protects your streak automatically · +100 IP bonus
                    </span>
                  </span>
                  <input
                    type="checkbox"
                    aria-label="Make it monthly"
                    checked={recurring}
                    onChange={(event) => setRecurring(event.target.checked)}
                    className="peer sr-only"
                  />
                  <span
                    aria-hidden="true"
                    className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${
                      recurring ? "bg-emerald-500" : "bg-zinc-300 dark:bg-zinc-600"
                    }`}
                  >
                    <span
                      className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${
                        recurring ? "left-6" : "left-1"
                      }`}
                    />
                  </span>
                </label>

                <div className="mt-5 rounded-2xl bg-violet-50 p-4 text-sm dark:bg-violet-950/40">
                  <p className="font-semibold text-violet-800 dark:text-violet-300">
                    You will earn
                  </p>
                  <ul className="mt-1 space-y-0.5 text-violet-700 dark:text-violet-400">
                    <li>+150 IP for this grant</li>
                    {isNewCause && <li>+50 IP for supporting a new cause</li>}
                    {recurring && <li>+100 IP recurring bonus</li>}
                    {!state.grantedThisMonth && (
                      <li>🔥 Streak extends to month {state.streakMonths + 1}</li>
                    )}
                  </ul>
                </div>

                <div className="sticky bottom-0 -mx-6 mt-5 bg-zinc-50 px-6 pb-1 pt-2 dark:bg-zinc-900">
                  <button
                    type="button"
                    onClick={handleConfirm}
                    className="w-full rounded-2xl bg-emerald-600 py-4 text-base font-bold text-white shadow-lg transition hover:bg-emerald-700 active:scale-[0.98]"
                  >
                    Grant {formatUsd(amount)}
                    {recurring ? " monthly" : ""} to {selectedOrg.name}
                  </button>
                  <p className="mt-2 text-center text-xs text-zinc-400 dark:text-zinc-500">
                    Prototype: no real money moves.
                  </p>
                </div>
              </div>
            )}
          </m.div>
        </m.div>
      )}
    </AnimatePresence>
  );
}
