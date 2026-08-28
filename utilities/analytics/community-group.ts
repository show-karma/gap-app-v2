"use client";

import { useEffect, useSyncExternalStore } from "react";

/**
 * Which community the visitor is inside, as the layout resolved it.
 *
 * Deriving this from the URL is what it replaced, and the URL cannot answer it:
 * `/community/[communityId]` accepts either a slug or a uid, so the same
 * community reaches Mixpanel under two different ids depending on which link
 * the visitor followed — and a slug change silently splits its history in two.
 * The layout has already resolved the community, so both the uid and the
 * canonical slug are free there and unambiguous.
 *
 * A module-level store rather than context because the two sides sit in
 * different branches of the tree: the community layout binds it, and
 * `AnalyticsProvider` — mounted from the root layout, not inside the community
 * subtree — reads it.
 *
 * This module PUBLISHES and nothing else. Writing `set_group` here was the bug:
 * the layout mounts on its own schedule, with no view of whether Privy has
 * resolved yet, so on a reload the group write landed while Mixpanel still held
 * the previous session's identity from localStorage — attributing a community
 * to whoever was signed in last. The provider owns every SDK write, and only
 * after it has settled identity.
 */

export interface BoundCommunity {
  /** The community's UID. What grouping joins on. */
  uid: string;
  /**
   * The community's canonical slug, as the API resolved it — never the raw URL
   * segment, which may be a uid. Readable label only; `uid` stays authoritative.
   */
  slug: string | null;
}

let boundCommunity: BoundCommunity | null = null;
const listeners = new Set<() => void>();

const emit = (): void => {
  for (const listener of listeners) listener();
};

const subscribe = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

// Returns the stored object itself, not a fresh one: `useSyncExternalStore`
// re-renders on every snapshot whose identity changed, so building a new object
// per call would loop forever.
const getSnapshot = (): BoundCommunity | null => boundCommunity;

/** Server render has no community bound; the layout binds one on the client. */
const getServerSnapshot = (): BoundCommunity | null => null;

/** The community currently bound, for the provider's group and page views. */
export const useBoundCommunity = (): BoundCommunity | null =>
  useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

/**
 * Publishes the community the visitor is inside for as long as this component
 * is mounted. Called once, from the community layout, with the resolved uid and
 * slug.
 *
 * Publishing only: the provider picks the value up through
 * {@link useBoundCommunity} and performs the actual `set_group` inside its
 * ready-gated effect, after identity is settled.
 */
export const useCommunityAnalyticsGroup = (
  uid: string | null | undefined,
  slug: string | null | undefined
): void => {
  useEffect(() => {
    boundCommunity = uid ? { uid, slug: slug || null } : null;
    emit();

    return () => {
      // Leaving the community subtree unpublishes it, so events on the next
      // screen are not still attributed to the community just left. The
      // provider turns this into the SDK calls that clear the binding.
      boundCommunity = null;
      emit();
    };
  }, [uid, slug]);
};

/** Test-only: forget a binding left by a previous case. */
export const __resetCommunityGroupForTests = (): void => {
  boundCommunity = null;
  emit();
};
