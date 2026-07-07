"use client";

import { X } from "lucide-react";
import { AnimatePresence, m } from "motion/react";
import pluralize from "pluralize";
import { useEffect, useMemo, useState } from "react";
import { CAUSES, RECAP_YEAR } from "../data/mock-data";
import { useRewards } from "../state/rewards-context";
import { formatNumber, formatUsd } from "../utils/format";
import { levelForXp } from "../utils/levels";

interface YearRecapProps {
  open: boolean;
  onClose: () => void;
}

const SLIDE_DURATION_MS = 4500;

interface Slide {
  id: string;
  background: string;
  content: React.ReactNode;
}

export function YearRecap({ open, onClose }: YearRecapProps) {
  return (
    <AnimatePresence>
      {open && (
        <m.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-4"
        >
          <RecapStories onClose={onClose} />
        </m.div>
      )}
    </AnimatePresence>
  );
}

/**
 * Mounted only while the recap is open, so slide state starts fresh on every
 * open without effect-based resets.
 */
function RecapStories({ onClose }: { onClose: () => void }) {
  const { state } = useRewards();
  const [slideIndex, setSlideIndex] = useState(0);
  const level = levelForXp(state.xp);

  const slides = useMemo<Slide[]>(() => {
    const causeChips = state.causesSupported.map((causeId) => CAUSES[causeId]);
    const totalGrants = 14 + state.grants.length;
    const totalGranted = state.grantedThisYear;

    return [
      {
        id: "intro",
        background: "bg-gradient-to-br from-emerald-600 to-teal-900",
        content: (
          <>
            <m.span
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1, rotate: [0, 10, -10, 0] }}
              transition={{
                scale: { type: "spring", stiffness: 180 },
                rotate: { duration: 0.6, ease: "easeInOut" },
              }}
              className="text-7xl"
            >
              💚
            </m.span>
            <h3 className="mt-6 text-3xl font-semibold">Your {RECAP_YEAR} in giving</h3>
            <p className="mt-3 text-lg text-white/80">
              Six months in, and you have already made it count. Let's look back.
            </p>
          </>
        ),
      },
      {
        id: "total",
        background: "bg-gradient-to-br from-violet-600 to-indigo-900",
        content: (
          <>
            <p className="text-lg font-medium text-white/80">You granted</p>
            <m.p
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 160, delay: 0.2 }}
              className="mt-2 font-mono text-6xl font-bold"
            >
              {formatUsd(totalGranted)}
            </m.p>
            <p className="mt-4 text-lg text-white/80">
              across {totalGrants} {pluralize("grant", totalGrants)}. That puts your money to work,
              not to rest.
            </p>
          </>
        ),
      },
      {
        id: "causes",
        background: "bg-gradient-to-br from-amber-500 to-orange-800",
        content: (
          <>
            <p className="text-lg font-medium text-white/80">You showed up for</p>
            <m.p
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 160, delay: 0.2 }}
              className="mt-2 font-mono text-6xl font-bold"
            >
              {state.causesSupported.length}
            </m.p>
            <p className="text-lg text-white/80">
              {pluralize("cause", state.causesSupported.length)}
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              {causeChips.map((cause, index) => (
                <m.span
                  key={cause.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 + index * 0.1 }}
                  className="rounded-full bg-white/20 px-4 py-1.5 text-sm font-semibold backdrop-blur-sm"
                >
                  {cause.emoji} {cause.label}
                </m.span>
              ))}
            </div>
          </>
        ),
      },
      {
        id: "streak",
        background: "bg-gradient-to-br from-orange-500 to-rose-800",
        content: (
          <>
            <m.span
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 260, damping: 12 }}
              className="text-7xl"
            >
              🔥
            </m.span>
            <p className="mt-4 text-lg font-medium text-white/80">Longest giving streak</p>
            <p className="mt-1 font-mono text-6xl font-bold">{state.longestStreak}</p>
            <p className="text-lg text-white/80">
              {pluralize("month", state.longestStreak)} in a row
            </p>
            <p className="mt-4 text-white/70">Consistency is the rarest kind of generosity.</p>
          </>
        ),
      },
      {
        id: "verified",
        background: "bg-gradient-to-br from-sky-600 to-blue-900",
        content: (
          <>
            <m.span
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
              className="text-7xl"
            >
              ✅
            </m.span>
            <p className="mt-4 text-lg font-medium text-white/80">Your grants touched</p>
            <p className="mt-1 font-mono text-6xl font-bold">{state.verifiedMilestones}</p>
            <p className="text-lg text-white/80">
              verified {pluralize("milestone", state.verifiedMilestones)}
            </p>
            <p className="mt-4 text-white/70">
              Every one independently verified through Karma's accountability protocol. Receipts,
              not vibes.
            </p>
          </>
        ),
      },
      {
        id: "card",
        background: "bg-gradient-to-br from-zinc-800 to-zinc-950",
        content: (
          <>
            <p className="text-lg font-medium text-white/80">Your giving card</p>
            <m.div
              initial={{ rotateY: 90, opacity: 0 }}
              animate={{ rotateY: 0, opacity: 1 }}
              transition={{ delay: 0.3, type: "spring", stiffness: 120 }}
              className="mt-4 w-full rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-700 p-6 text-left shadow-2xl"
            >
              <div className="flex items-center justify-between">
                <span className="text-3xl">🦉</span>
                <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-bold uppercase tracking-wide">
                  {level.name}
                </span>
              </div>
              <p className="mt-4 text-2xl font-bold">Maya's {RECAP_YEAR}</p>
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-white/70">Granted</p>
                  <p className="font-mono text-lg font-bold">{formatUsd(totalGranted)}</p>
                </div>
                <div>
                  <p className="text-white/70">Impact Points</p>
                  <p className="font-mono text-lg font-bold">{formatNumber(state.xp)}</p>
                </div>
                <div>
                  <p className="text-white/70">Streak</p>
                  <p className="font-mono text-lg font-bold">
                    {state.longestStreak} {pluralize("mo", state.longestStreak)}
                  </p>
                </div>
                <div>
                  <p className="text-white/70">Verified milestones</p>
                  <p className="font-mono text-lg font-bold">{state.verifiedMilestones}</p>
                </div>
              </div>
            </m.div>
            <p className="mt-4 text-sm text-white/60">Share it. Generosity is contagious.</p>
          </>
        ),
      },
    ];
  }, [state, level.name]);

  useEffect(() => {
    if (slideIndex >= slides.length - 1) return;
    const timer = setTimeout(() => setSlideIndex((index) => index + 1), SLIDE_DURATION_MS);
    return () => clearTimeout(timer);
  }, [slideIndex, slides.length]);

  const goNext = () => {
    if (slideIndex >= slides.length - 1) {
      onClose();
      return;
    }
    setSlideIndex((index) => Math.min(index + 1, slides.length - 1));
  };

  const slide = slides[slideIndex];

  return (
    <dialog
      open
      aria-label="Year in giving recap"
      className="relative m-0 h-[640px] max-h-[85vh] w-full max-w-sm overflow-hidden rounded-3xl border-0 bg-transparent p-0 shadow-2xl"
    >
      <div className="absolute left-3 right-3 top-3 z-10 flex gap-1.5">
        {slides.map((item, index) => (
          <div key={item.id} className="h-1 flex-1 overflow-hidden rounded-full bg-white/30">
            <m.div
              className="h-full bg-white"
              initial={{ width: index < slideIndex ? "100%" : "0%" }}
              animate={{ width: index <= slideIndex ? "100%" : "0%" }}
              transition={
                index === slideIndex
                  ? { duration: SLIDE_DURATION_MS / 1000, ease: "linear" }
                  : { duration: 0 }
              }
            />
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={onClose}
        aria-label="Close recap"
        className="absolute right-3 top-7 z-10 rounded-full bg-white/20 p-2 text-white backdrop-blur-sm transition hover:bg-white/30"
      >
        <X className="h-5 w-5" aria-hidden="true" />
      </button>

      <AnimatePresence mode="wait">
        <m.button
          key={slide.id}
          type="button"
          onClick={goNext}
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -40 }}
          transition={{ duration: 0.3 }}
          className={`flex h-full w-full cursor-pointer flex-col items-center justify-center p-8 text-center text-white ${slide.background}`}
        >
          {slide.content}
          <span className="absolute bottom-5 text-xs text-white/50">Tap to continue</span>
        </m.button>
      </AnimatePresence>
    </dialog>
  );
}
