"use client";

import { X } from "lucide-react";
import { m } from "motion/react";
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

// A ref callback opens the native dialog with showModal() the moment it mounts,
// so it renders in the top layer — always viewport-centered and immune to page
// scroll — with Escape-to-close and focus trapping for free. Unmounting on close
// removes it from the top layer. A plain <dialog open> renders in normal flow
// and opens off-screen once the page has been scrolled.
const openAsModal = (node: HTMLDialogElement | null) => {
  if (node && !node.open) {
    node.showModal();
    // showModal moves focus to the dialog's first focusable control — the
    // close button — where Enter would immediately close the deck. Hand it
    // to the slide advance button so keyboard users can walk the slides.
    node.querySelector<HTMLButtonElement>("[data-slide-advance]")?.focus();
  }
};

// When a slide remounts, focus has fallen back to the body/dialog; claim it
// for the new slide button so Enter/Space keeps advancing the deck.
const refocusSlide = (node: HTMLButtonElement | null) => {
  const active = document.activeElement;
  if (node && (!active || active === document.body || active.tagName === "DIALOG")) {
    node.focus();
  }
};

export function YearRecap({ open, onClose }: YearRecapProps) {
  if (!open) return null;

  return (
    <dialog
      ref={openAsModal}
      aria-label="Year in giving recap"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      className="m-0 max-h-none max-w-none bg-transparent p-0 backdrop:bg-black/80 backdrop:backdrop-blur-sm"
    >
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <RecapStories onClose={onClose} />
      </div>
    </dialog>
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
        background: "bg-gradient-to-br from-stone-800 to-stone-950",
        content: (
          <>
            <p className="text-lg font-medium text-white/80">Your giving card</p>
            <m.div
              initial={{ rotateY: 90, opacity: 0 }}
              animate={{ rotateY: 0, opacity: 1 }}
              transition={{ delay: 0.3, type: "spring", stiffness: 120 }}
              className="mt-4 w-full rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 p-6 text-left shadow-2xl"
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
                  <p className="text-white/70">Longest streak</p>
                  <p className="font-mono text-lg font-bold">
                    {state.longestStreak} {pluralize("month", state.longestStreak)}
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
    <div className="relative h-[640px] max-h-[85vh] w-full max-w-sm overflow-hidden rounded-2xl shadow-2xl">
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

      {/* Enter-only animation: the outgoing slide unmounts instantly when the
          key changes, so rapid taps can never race an exit transition into a
          blank card (an AnimatePresence mode="wait" exit did exactly that).
          The remount drops keyboard focus, so refocus the new slide button
          unless the user has deliberately moved focus elsewhere (e.g. the
          close button). */}
      <m.button
        key={slide.id}
        ref={refocusSlide}
        data-slide-advance
        type="button"
        onClick={goNext}
        initial={{ opacity: 0, x: 40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.25 }}
        className={`flex h-full w-full cursor-pointer flex-col items-center justify-center p-8 text-center text-white ${slide.background}`}
      >
        {slide.content}
        <span className="absolute bottom-5 text-xs text-white/50">Tap to continue</span>
      </m.button>
    </div>
  );
}
