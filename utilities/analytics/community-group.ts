"use client";

import { useEffect, useSyncExternalStore } from "react";
import { setCommunityGroup } from "./client";

/**
 * Which community the visitor is inside, as a stable UID.
 *
 * Deriving this from the URL is what it replaced, and the URL cannot answer it:
 * `/community/[communityId]` accepts either a slug or a uid, so the same
 * community reaches Mixpanel under two different group ids depending on which
 * link the visitor followed — and a slug change silently splits its history in
 * two. The layout has already resolved the community, so the UID is free there
 * and unambiguous.
 *
 * A module-level store rather than context because the two sides sit in
 * different branches of the tree: the community layout binds it, and
 * `AnalyticsProvider` — mounted from the root layout, not inside the community
 * subtree — reads it.
 */

let boundCommunityUid: string | null = null;
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

const getSnapshot = (): string | null => boundCommunityUid;

/** Server render has no community bound; the layout binds one on the client. */
const getServerSnapshot = (): string | null => null;

/** The community currently bound, for the provider's page views. */
export const useBoundCommunityId = (): string | null =>
  useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

/**
 * Binds the community the visitor is inside for as long as this component is
 * mounted. Called once, from the community layout, with the resolved UID.
 */
export const useCommunityAnalyticsGroup = (uid: string | null | undefined): void => {
  useEffect(() => {
    const next = uid || null;
    boundCommunityUid = next;
    setCommunityGroup(next);
    emit();

    return () => {
      // Leaving the community subtree unbinds it, so events on the next screen
      // are not still attributed to the community the visitor just left.
      boundCommunityUid = null;
      setCommunityGroup(null);
      emit();
    };
  }, [uid]);
};

/** Test-only: forget a binding left by a previous case. */
export const __resetCommunityGroupForTests = (): void => {
  boundCommunityUid = null;
  emit();
};
