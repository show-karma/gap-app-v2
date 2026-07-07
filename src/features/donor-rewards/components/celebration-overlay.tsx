"use client";

import { Flame, Sparkles, TrendingUp } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import pluralize from "pluralize";
import { useEffect } from "react";
import { useRewards } from "../state/rewards-context";
import { formatUsd } from "../utils/format";

export function CelebrationOverlay() {
  const { state, dismissCelebration } = useRewards();
  const celebration = state.celebration;

  useEffect(() => {
    if (!celebration) return;
    let cancelled = false;
    import("js-confetti")
      .then(({ default: JSConfetti }) => {
        if (cancelled) return;
        const confetti = new JSConfetti();
        confetti.addConfetti({ emojis: ["🎉", "💚", "✨", "🌱"], confettiNumber: 60 });
        confetti.addConfetti({ confettiNumber: 120 });
      })
      .catch(() => {
        // Confetti is decorative. The celebration screen still renders without it.
      });
    return () => {
      cancelled = true;
    };
  }, [celebration]);

  return (
    <AnimatePresence>
      {celebration && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Grant celebration"
            initial={{ scale: 0.8, opacity: 0, y: 30 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
            className="w-full max-w-md rounded-3xl bg-white p-8 text-center shadow-2xl dark:bg-zinc-900"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1, rotate: [0, -10, 10, 0] }}
              transition={{
                delay: 0.15,
                scale: { type: "spring", stiffness: 200, delay: 0.15 },
                rotate: { duration: 0.6, delay: 0.15, ease: "easeInOut" },
              }}
              className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-5xl dark:bg-emerald-500/15"
            >
              🎉
            </motion.div>

            <h2 className="mt-4 text-2xl font-bold text-zinc-900 dark:text-white">
              {formatUsd(celebration.grant.amount)} on its way!
            </h2>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              Your grant to {celebration.grant.orgName}
              {celebration.grant.recurring ? " will repeat monthly" : " is being processed"}.
            </p>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
              className="mt-5 flex items-center justify-center gap-2 rounded-2xl bg-violet-50 py-3 dark:bg-violet-950/40"
            >
              <Sparkles className="h-5 w-5 text-violet-500" aria-hidden="true" />
              <span className="font-mono text-xl font-bold text-violet-700 dark:text-violet-300">
                +{celebration.xpEarned} Impact Points
              </span>
            </motion.div>

            <div className="mt-3 flex flex-col gap-2">
              {celebration.newStreak !== null && (
                <motion.div
                  initial={{ opacity: 0, x: -14 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 }}
                  className="flex items-center gap-3 rounded-2xl bg-orange-50 px-4 py-3 text-left dark:bg-orange-950/40"
                >
                  <Flame
                    className="h-6 w-6 shrink-0 text-orange-500"
                    fill="currentColor"
                    aria-hidden="true"
                  />
                  <span className="text-sm font-semibold text-orange-800 dark:text-orange-300">
                    Streak extended to {celebration.newStreak}{" "}
                    {pluralize("month", celebration.newStreak)}!
                  </span>
                </motion.div>
              )}

              {celebration.leveledUpTo && (
                <motion.div
                  initial={{ opacity: 0, x: -14 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.65 }}
                  className="flex items-center gap-3 rounded-2xl bg-emerald-50 px-4 py-3 text-left dark:bg-emerald-950/40"
                >
                  <TrendingUp className="h-6 w-6 shrink-0 text-emerald-500" aria-hidden="true" />
                  <span className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">
                    Level up! You are now a {celebration.leveledUpTo}.
                  </span>
                </motion.div>
              )}

              {celebration.questsCompleted.map((quest, index) => (
                <motion.div
                  key={quest.id}
                  initial={{ opacity: 0, x: -14 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.8 + index * 0.12 }}
                  className="flex items-center gap-3 rounded-2xl bg-zinc-100 px-4 py-3 text-left dark:bg-zinc-800"
                >
                  <span className="text-lg">✅</span>
                  <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                    Quest complete: {quest.title}
                  </span>
                </motion.div>
              ))}

              {celebration.badgesUnlocked.map((badge, index) => (
                <motion.div
                  key={badge.id}
                  initial={{ opacity: 0, scale: 0.7 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 1 + index * 0.15, type: "spring", stiffness: 220 }}
                  className="flex items-center gap-3 rounded-2xl border-2 border-amber-300 bg-amber-50 px-4 py-3 text-left dark:border-amber-700 dark:bg-amber-950/40"
                >
                  <span className="text-2xl">{badge.emoji}</span>
                  <span>
                    <span className="block text-sm font-bold text-amber-800 dark:text-amber-300">
                      New badge: {badge.name}
                    </span>
                    <span className="block text-xs text-amber-700 dark:text-amber-400">
                      {badge.description}
                    </span>
                  </span>
                </motion.div>
              ))}
            </div>

            <button
              type="button"
              onClick={dismissCelebration}
              className="mt-6 w-full rounded-2xl bg-zinc-900 py-3.5 font-bold text-white transition hover:bg-zinc-700 active:scale-[0.98] dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              Keep going
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
