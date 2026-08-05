import { mixpanelEvent } from "@/utilities/mixpanelEvent";

/**
 * Onboarding funnel events.
 *
 * Identity is the Privy DID rather than the wallet address the older
 * `onboarding:*` events used, so these join against the state written by
 * `lib/storage` — an address-keyed funnel can't be reconciled with DID-keyed
 * progress.
 *
 * `mixpanelEvent` is a no-op outside production, so a preview or staging run
 * emits nothing; the funnel can only be confirmed once deployed.
 */

export type OnboardingPersona = "advisor" | "nonprofit" | "project-owner";

/** Where a persona choice came from — an inferred entry point, or an answer. */
export type PersonaSource = "entry-point" | "picker";

interface BaseProperties {
  /** Privy DID, or undefined for a logged-out visitor. */
  userId?: string;
}

function track(event: string, properties: Record<string, unknown>): void {
  void mixpanelEvent({ event: `onboarding:${event}`, properties });
}

export function trackPickerShown(props: BaseProperties & { source: "entry-point" | "cold" }): void {
  track("picker-shown", { ...props });
}

export function trackPersonaSelected(
  props: BaseProperties & { persona: OnboardingPersona; source: PersonaSource }
): void {
  track("persona-selected", { ...props });
}

export function trackDestinationReached(
  props: BaseProperties & { persona: OnboardingPersona; route: string }
): void {
  track("destination-reached", { ...props });
}

/**
 * The persona's first meaningful action landed — an advisor row created, a
 * project created, a first search run. This is the north-star numerator.
 */
export function trackFlowCompleted(props: BaseProperties & { persona: OnboardingPersona }): void {
  track("flow-completed", { ...props });
}

export function trackTourStarted(props: BaseProperties & { tour: string; version: number }): void {
  track("tour-started", { ...props });
}

export function trackTourCompleted(
  props: BaseProperties & { tour: string; version: number; steps: number }
): void {
  track("tour-completed", { ...props });
}

/** `atStep` is what tells us a tour is too long, and exactly where it loses people. */
export function trackTourDismissed(
  props: BaseProperties & { tour: string; version: number; atStep: number }
): void {
  track("tour-dismissed", { ...props });
}

/**
 * Someone reopened a walkthrough from the profile menu. Every fire is a user
 * who got lost and found their own way back — the direct measure of the
 * recovery path, and the counter-signal if first-run is still failing.
 */
export function trackRecoveryOpened(props: BaseProperties & { source: "profile-menu" }): void {
  track("recovery-opened", { ...props });
}
