/**
 * Persistence for "has this person already been shown X".
 *
 * State is scoped to the Privy user rather than the browser: keying on the
 * browser alone means the second account to sign in on a machine silently
 * inherits the first account's completed onboarding — the same class of bug
 * `clearWagmiState` (hooks/useAuth.ts) exists to prevent for wallet state.
 *
 * find-funders is usable logged out, so entries written before a session
 * exists land under an anonymous scope and are moved onto the user at login
 * (see `migrateAnonymousState`).
 */

export type OnboardingOutcome = "completed" | "dismissed";

export interface OnboardingRecord {
  outcome: OnboardingOutcome;
  /** How many times this was opened and walked away from without finishing. */
  dismissals: number;
}

const NAMESPACE = "karma:onboarding";

/** Scope for state written before a Privy session exists. */
export const ANONYMOUS_SCOPE = "anon";

/**
 * A first dismissal is treated as a fumble — a stray Escape or backdrop click
 * shouldn't cost someone the walkthrough permanently. The second is taken as
 * intent.
 */
const MAX_DISMISSALS = 2;

/** Storage key for one onboarding surface, under one identity. */
export function onboardingKey(scope: string, surface: string): string {
  return `${NAMESPACE}:${scope}:${surface}`;
}

/**
 * Surface key for a tour. The version is part of the key so that improving a
 * tour re-runs it for people who saw the previous cut — without it, the first
 * version shipped is the only one those users ever see.
 */
export function tourSurface(tourId: string, version: number): string {
  return `tour:${tourId}:v${version}`;
}

function readRaw(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(key);
  } catch {
    // SUPPRESSED: localStorage throws in private browsing and when the quota
    // is full. Neither is actionable, and the correct fallback — treat the
    // surface as not-yet-seen — is what returning null already does.
    return null;
  }
}

function writeRaw(key: string, value: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, value);
  } catch {
    // SUPPRESSED: as above. Failing to persist means the surface may be shown
    // again later, which is strictly better than blocking the interaction.
  }
}

export function readOnboardingRecord(scope: string, surface: string): OnboardingRecord | null {
  const raw = readRaw(onboardingKey(scope, surface));
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<OnboardingRecord>;
    if (parsed.outcome !== "completed" && parsed.outcome !== "dismissed") return null;
    return {
      outcome: parsed.outcome,
      dismissals: typeof parsed.dismissals === "number" ? parsed.dismissals : 0,
    };
  } catch {
    // SUPPRESSED: a malformed entry is indistinguishable from no entry for our
    // purposes, and treating it as absent lets the next write heal it.
    return null;
  }
}

/** Records a finished walkthrough. Terminal — the surface never shows again. */
export function markCompleted(scope: string, surface: string): void {
  const record: OnboardingRecord = { outcome: "completed", dismissals: 0 };
  writeRaw(onboardingKey(scope, surface), JSON.stringify(record));
}

/** Records a walk-away, preserving the running count so a fumble is forgiven. */
export function markDismissed(scope: string, surface: string): void {
  const previous = readOnboardingRecord(scope, surface);
  const record: OnboardingRecord = {
    outcome: "dismissed",
    dismissals: (previous?.dismissals ?? 0) + 1,
  };
  writeRaw(onboardingKey(scope, surface), JSON.stringify(record));
}

/**
 * Whether a surface should be offered automatically. Manual entry points (the
 * profile menu, the find-funders help button) bypass this deliberately — asking
 * for it is always honoured.
 */
export function shouldAutoShow(scope: string, surface: string): boolean {
  const record = readOnboardingRecord(scope, surface);
  if (!record) return true;
  if (record.outcome === "completed") return false;
  return record.dismissals < MAX_DISMISSALS;
}

function collectKeys(predicate: (key: string) => boolean): string[] {
  if (typeof window === "undefined") return [];
  const matches: string[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && predicate(key)) matches.push(key);
    }
  } catch {
    // SUPPRESSED: see readRaw. An empty list degrades to "nothing to migrate
    // or clear", which is the safe outcome for both callers.
  }
  return matches;
}

/**
 * Moves anonymous onboarding state onto the Privy user at login, so someone who
 * took the find-funders tour before signing up isn't shown it again afterwards.
 *
 * Existing user-scoped entries win: the signed-in identity is the more
 * authoritative record, and a returning user's history shouldn't be overwritten
 * by whatever the shared browser accumulated.
 */
export function migrateAnonymousState(userId: string): void {
  if (typeof window === "undefined" || !userId) return;
  const prefix = `${NAMESPACE}:${ANONYMOUS_SCOPE}:`;
  for (const key of collectKeys((k) => k.startsWith(prefix))) {
    const surface = key.slice(prefix.length);
    const value = readRaw(key);
    if (value && !readRaw(onboardingKey(userId, surface))) {
      writeRaw(onboardingKey(userId, surface), value);
    }
    try {
      localStorage.removeItem(key);
    } catch {
      // SUPPRESSED: leaving the anonymous copy behind is harmless — the
      // user-scoped entry now takes precedence for every read.
    }
  }
}

/**
 * Removes one surface's record, putting it back to never-seen. Used when a user
 * unticks "don't show this again" — the opposite of a completion, so it has to
 * clear rather than write another outcome.
 */
export function writeOnboardingCleared(scope: string, surface: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(onboardingKey(scope, surface));
  } catch {
    // SUPPRESSED: see readRaw. Failing to clear leaves the surface suppressed,
    // which the user can undo by ticking and unticking again.
  }
}

/**
 * Drops every onboarding entry. Exists for the e2e suite: onboarding state and
 * the auth bypass share localStorage, so without a sweep between specs a test
 * that finishes a walkthrough silently suppresses it for every later test in
 * the same browser context.
 */
export function clearAllOnboardingState(): void {
  for (const key of collectKeys((k) => k.startsWith(`${NAMESPACE}:`))) {
    try {
      localStorage.removeItem(key);
    } catch {
      // SUPPRESSED: best-effort housekeeping; a leftover key only affects
      // whether a walkthrough re-offers itself.
    }
  }
}
