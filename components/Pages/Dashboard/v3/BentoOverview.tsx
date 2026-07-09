"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { BentoTile } from "./BentoTile";
import type { DashModule } from "./module";
import { SoftIcon } from "./SoftIcon";
import { BENTO_LAYOUT_TRANSITION, bentoLayoutId } from "./soft-classes";

/**
 * Bento overview with drill-in. Renders one summary tile per active module in
 * the design's 6-column grid; clicking a tile opens its full view with a
 * "Back to overview" chip. Deep links (#reviews) auto-open the module.
 *
 * The clicked tile morphs into the drill-in panel in place: it and the
 * drill-in wrapper share a `layoutId` (BentoTile.tsx), so Framer Motion
 * animates the box directly from the tile's own position/size — not a
 * generic center-scale — and the panel's content reveals with a left-to-right
 * wipe once the box has started expanding.
 */
export function BentoOverview({
  modules,
  onFocusChange,
}: {
  modules: DashModule[];
  /** Called with the focused module key, or null when back on the overview. */
  onFocusChange?: (key: string | null) => void;
}) {
  const [focus, setFocus] = useState<string | null>(null);
  const keys = modules.map((m) => m.key);
  const keysJoined = keys.join(",");
  const didAutoOpen = useRef(false);

  useEffect(() => {
    onFocusChange?.(focus);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus]);

  useEffect(() => {
    if (didAutoOpen.current || typeof window === "undefined") return;
    const hash = window.location.hash.slice(1);
    if (hash && keys.includes(hash)) {
      setFocus(hash);
      didAutoOpen.current = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keysJoined]);

  useEffect(() => {
    if (focus && !keys.includes(focus)) setFocus(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keysJoined]);

  // Same-page hash navigation (e.g. an anchor link to #reviews) opens the
  // module without a reload; clearing the hash returns to the overview.
  useEffect(() => {
    const onHashChange = () => {
      const hash = window.location.hash.slice(1);
      setFocus(hash && keys.includes(hash) ? hash : null);
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keysJoined]);

  const openModule = (key: string) => {
    setFocus(key);
    // replaceState keeps the drill-in shareable/refreshable without spamming
    // the history stack or dispatching an App Router navigation.
    window.history.replaceState(null, "", `#${key}`);
  };
  const closeModule = () => {
    setFocus(null);
    window.history.replaceState(null, "", window.location.pathname + window.location.search);
  };

  const focusedModule = focus ? modules.find((m) => m.key === focus) : undefined;
  const n = modules.length;

  return (
    <AnimatePresence mode="popLayout" initial={false}>
      {focusedModule ? (
        <motion.div
          key={`module-${focusedModule.key}`}
          layout
          layoutId={bentoLayoutId(focusedModule.key)}
          transition={BENTO_LAYOUT_TRANSITION}
        >
          <motion.button
            type="button"
            className="mb-4 inline-flex h-9 items-center gap-2 rounded-full border border-sf-line-strong bg-sf-card pl-[11px] pr-[15px] text-[13px] font-semibold text-sf-ink-soft hover:bg-sf-chip"
            onClick={closeModule}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2, delay: 0.1 }}
          >
            <SoftIcon
              name="arrow"
              className="h-[15px] w-[15px]"
              style={{ transform: "rotate(180deg)" }}
            />
            Back to overview
          </motion.button>
          {/* The box grows via the shared layoutId above; once it's under way,
              wipe the (entirely different) drill-in content in left-to-right
              rather than having it just pop in at the end of the resize. */}
          <motion.div
            initial={{ clipPath: "inset(0 100% 0 0)" }}
            animate={{ clipPath: "inset(0 0% 0 0)" }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
          >
            {focusedModule.render()}
          </motion.div>
        </motion.div>
      ) : (
        <motion.div
          key="overview"
          className="grid grid-cols-2 gap-[14px] min-[980px]:grid-cols-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {modules.map((module, i) => (
            <BentoTile
              key={module.key}
              module={module}
              wide={n <= 2 || (i < 2 && n !== 3)}
              onOpen={openModule}
            />
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
