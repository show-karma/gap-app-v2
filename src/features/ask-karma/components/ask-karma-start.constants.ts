// Animation timing — tuned for a snappy ~1s click-to-chat handoff while
// still reading as deliberate motion. Exported for tests so they can advance
// fake timers by exactly the right amount.
export const ASK_KARMA_ANIMATION = {
  FLY_DURATION_MS: 350,
  TYPE_SPEED_MS: 18,
  POST_TYPE_PAUSE_MS: 150,
} as const;
