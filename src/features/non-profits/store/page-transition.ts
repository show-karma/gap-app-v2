/**
 * Page-transition Zustand store — ported from grant-atlas src/store/page-transition.ts.
 *
 * Captures the bounding-rect snapshot of entity-card fields (name, badge,
 * location, assets, year) at click time. The HeroTransitionOverlay component
 * on the detail page reads these rects and animates ghost elements from their
 * search-card positions to the hero field positions.
 *
 * Stale threshold: 2000 ms — if the user navigated slowly (SSR hydration,
 * slow network) the snapshot is too old to produce a believable animation.
 */
import { create } from "zustand";

export interface FieldRect {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface PageTransitionFields {
  name: FieldRect;
  badge?: FieldRect;
  location?: FieldRect;
  assets?: FieldRect;
  year?: FieldRect;
}

interface PageTransitionState {
  entityId: string | null;
  entityType: string | null;
  fields: PageTransitionFields | null;
  timestamp: number;
  set: (entityId: string, entityType: string, fields: PageTransitionFields) => void;
  clear: () => void;
  isStale: () => boolean;
}

const STALE_THRESHOLD_MS = 2000;

export const usePageTransitionStore = create<PageTransitionState>()((set, get) => ({
  entityId: null,
  entityType: null,
  fields: null,
  timestamp: 0,

  set: (entityId, entityType, fields) => {
    set({ entityId, entityType, fields, timestamp: Date.now() });
  },

  clear: () => {
    set({ entityId: null, entityType: null, fields: null, timestamp: 0 });
  },

  isStale: () => {
    const { timestamp } = get();
    if (timestamp === 0) return true;
    return Date.now() - timestamp > STALE_THRESHOLD_MS;
  },
}));
