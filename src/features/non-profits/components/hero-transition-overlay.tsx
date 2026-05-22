"use client";

/**
 * Hero transition overlay — ported from grant-atlas
 * src/features/grant-atlas/components/hero-transition-overlay.tsx.
 *
 * Reads bounding-rect snapshots from `usePageTransitionStore` captured on
 * entity-card click (in the search workbench). Renders ghost text elements
 * positioned at the source coordinates, then animates them toward the
 * corresponding `[data-hero-field="…"]` elements in the detail page hero.
 *
 * App Router adaptation: TanStack Router navigation is replaced by plain
 * Next.js `Link` / `useRouter`. The timing boundary is the same — the store
 * is marked stale after `STALE_THRESHOLD_MS` (2 s). If the page hasn't
 * hydrated by then, the overlay is silently skipped.
 *
 * Note: Cross-page shared-element timing under Next.js App Router is reliable
 * for same-origin client navigations (client-side routing). It will NOT fire
 * during hard refreshes or initial SSR loads — the overlay component renders
 * `null` in those cases, and the detail page shows without animation.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { type FieldRect, usePageTransitionStore } from "../store/page-transition";

interface HeroTransitionOverlayProps {
  entityId: string;
  onAnimatingChange?: (isAnimating: boolean) => void;
}

type FieldKey = "name" | "badge" | "location" | "assets" | "year";

const FIELD_ORDER: FieldKey[] = ["name", "badge", "location", "assets", "year"];
const STAGGER_MS = 30;
const DURATION_MS = 400;

interface AnimatingField {
  key: FieldKey;
  rect: FieldRect;
  destRect: DOMRect | null;
}

interface FieldStyle {
  left: number;
  top: number;
  width: number;
  height: number;
  opacity: number;
  transform: string;
  transition: string;
}

function getFieldStyle(field: AnimatingField, played: boolean, staggerDelay: number): FieldStyle {
  const { rect } = field;
  const dest = field.destRect;

  const baseStyle: FieldStyle = {
    left: rect.x,
    top: rect.y,
    width: rect.width,
    height: rect.height,
    opacity: played ? 0 : 1,
    transform: "translate(0, 0)",
    transition: "none",
  };

  if (!played || !dest) return baseStyle;

  const dx = dest.left - rect.x;
  const dy = dest.top - rect.y;
  const scaleX = rect.width > 0 ? dest.width / rect.width : 1;
  const scaleY = rect.height > 0 ? dest.height / rect.height : 1;

  return {
    ...baseStyle,
    opacity: 0,
    transform: `translate(${dx}px, ${dy}px) scale(${scaleX}, ${scaleY})`,
    transition: `transform ${DURATION_MS}ms cubic-bezier(0.4, 0, 0.2, 1) ${staggerDelay}ms, opacity ${DURATION_MS * 0.5}ms ease-in ${staggerDelay + DURATION_MS * 0.6}ms`,
  };
}

export function HeroTransitionOverlay({ entityId, onAnimatingChange }: HeroTransitionOverlayProps) {
  const store = usePageTransitionStore();
  const [animatingFields, setAnimatingFields] = useState<AnimatingField[] | null>(null);
  const [played, setPlayed] = useState(false);
  const cleanupRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rafRef = useRef<number | null>(null);

  const isActive = store.entityId === entityId && store.fields !== null && !store.isStale();

  const measureDestinations = useCallback((): Map<FieldKey, DOMRect | null> => {
    const map = new Map<FieldKey, DOMRect | null>();
    for (const key of FIELD_ORDER) {
      const el = document.querySelector(`[data-hero-field="${key}"]`);
      map.set(key, el ? el.getBoundingClientRect() : null);
    }
    return map;
  }, []);

  useEffect(() => {
    if (!isActive || !store.fields) return;

    const fields = store.fields;
    const destMap = measureDestinations();

    const fieldsToAnimate: AnimatingField[] = FIELD_ORDER.reduce<AnimatingField[]>((acc, key) => {
      const rect = fields[key];
      if (!rect) return acc;
      acc.push({ key, rect, destRect: destMap.get(key) ?? null });
      return acc;
    }, []);

    if (fieldsToAnimate.length === 0) {
      store.clear();
      return;
    }

    setAnimatingFields(fieldsToAnimate);
    setPlayed(false);
    onAnimatingChange?.(true);

    // Next frame: trigger the PLAY phase
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = requestAnimationFrame(() => {
        setPlayed(true);
      });
    });

    // After animation completes, clean up
    const totalDuration = DURATION_MS + STAGGER_MS * (fieldsToAnimate.length - 1) + 100;
    cleanupRef.current = setTimeout(() => {
      setAnimatingFields(null);
      setPlayed(false);
      onAnimatingChange?.(false);
      store.clear();
    }, totalDuration);

    return () => {
      if (cleanupRef.current !== null) clearTimeout(cleanupRef.current);
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
    // isActive is derived from store fields — only re-run when it truly changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive]);

  if (!animatingFields) return null;

  return (
    <div
      aria-hidden="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        pointerEvents: "none",
      }}
    >
      {animatingFields.map((field, idx) => {
        const staggerDelay = idx * STAGGER_MS;
        const style = getFieldStyle(field, played, staggerDelay);

        return (
          <span
            key={field.key}
            style={{
              position: "absolute",
              left: style.left,
              top: style.top,
              width: style.width,
              height: style.height,
              opacity: style.opacity,
              transform: style.transform,
              transition: style.transition,
              transformOrigin: "top left",
              display: "flex",
              alignItems: "center",
              overflow: "hidden",
              whiteSpace: "nowrap",
              fontSize: field.key === "name" ? "1.5rem" : "0.75rem",
              fontWeight: field.key === "name" ? "700" : field.key === "badge" ? "500" : "400",
              color:
                field.key === "name"
                  ? "rgb(9 9 11)"
                  : field.key === "badge"
                    ? "rgb(15 118 110)"
                    : "rgb(113 113 122)",
              lineHeight: "1.25",
              willChange: "transform, opacity",
            }}
          >
            {field.rect.text}
          </span>
        );
      })}
    </div>
  );
}
