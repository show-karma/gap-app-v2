import { createElement, forwardRef, type ReactNode } from "react";

/**
 * A `motion/react` (Framer Motion) test double for the v3 dashboard tests.
 *
 * Component tests should assert on rendered content, not animation timing.
 * AnimatePresence's exit/enter sequencing and shared layoutId/layout projection
 * measurements are real-browser concerns — jsdom has no layout engine, so those
 * animations never resolve deterministically in a test run. This double renders
 * `motion.<tag>` as the plain DOM element (stripping animation-only props) and
 * renders AnimatePresence's children immediately with no exit delay, so
 * fireEvent + synchronous expect() work like any other conditional render.
 *
 * Applied per-file via `vi.mock("motion/react", () => import("...motion-mock"))`
 * — NOT globally — so it can't mask animation behavior in non-dashboard suites.
 */
const MOTION_ONLY_PROPS = new Set([
  "initial",
  "animate",
  "exit",
  "transition",
  "variants",
  "layout",
  "layoutId",
  "layoutDependency",
  "whileHover",
  "whileTap",
  "whileFocus",
  "whileDrag",
  "whileInView",
  "drag",
  "dragConstraints",
  "dragElastic",
  "dragMomentum",
  "onAnimationStart",
  "onAnimationComplete",
  "onLayoutAnimationStart",
  "onLayoutAnimationComplete",
  "onUpdate",
  "onDrag",
  "onDragStart",
  "onDragEnd",
  "onViewportEnter",
  "onViewportLeave",
  "custom",
  "viewport",
]);

function stripMotionProps(props: Record<string, unknown>) {
  const domProps: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(props)) {
    if (!MOTION_ONLY_PROPS.has(key)) domProps[key] = value;
  }
  return domProps;
}

// Memoize one component per tag so reading `motion.div` twice yields a stable
// type (a fresh type each access would remount the subtree, dropping state).
const cache = new Map<string, ReturnType<typeof forwardRef>>();

function motionComponentFor(tag: string) {
  const existing = cache.get(tag);
  if (existing) return existing;
  const component = forwardRef((props: Record<string, unknown>, ref: unknown) =>
    createElement(tag, { ...stripMotionProps(props), ref })
  );
  cache.set(tag, component);
  return component;
}

export const motion = new Proxy(
  {},
  {
    get: (_target, tag: string) => motionComponentFor(tag),
  }
);

export function AnimatePresence({ children }: { children?: ReactNode }) {
  return children ?? null;
}
