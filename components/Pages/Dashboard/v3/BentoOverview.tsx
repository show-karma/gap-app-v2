"use client";

import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import { useEffect, useRef, useState } from "react";
import { BentoTile } from "./BentoTile";
import type { DashModule } from "./module";

/**
 * Bento overview with drill-in. Renders one summary tile per active module in
 * the design's 6-column grid; clicking a tile opens its full view with a
 * "Back to overview" chip. Deep links (#reviews) auto-open the module.
 *
 * Opening a module swaps the overview grid for the drill-in panel directly —
 * no animated box morph/scale between the tile and the panel.
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
    // pushState (not replaceState) adds a history entry for the drill-in, so the
    // browser Back button pops the hash off — the `hashchange` listener above
    // then closes the drill-in and returns to the overview instead of exiting
    // the page. It runs in a click handler, not a useEffect, so it doesn't
    // dispatch an App Router navigation or race in-flight <Link> clicks (#1547).
    window.history.pushState(null, "", `#${key}`);
  };
  const closeModule = () => {
    setFocus(null);
    // Strip the hash in place (no new entry) so the in-app "Back to overview"
    // button and deep-links both land cleanly on the overview.
    window.history.replaceState(null, "", window.location.pathname + window.location.search);
  };

  const focusedModule = focus ? modules.find((m) => m.key === focus) : undefined;
  const n = modules.length;

  if (focusedModule) {
    return (
      <div key={`module-${focusedModule.key}`}>
        <button
          type="button"
          className="mb-4 inline-flex w-fit items-center gap-2 text-sm font-medium text-gray-600 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
          onClick={closeModule}
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Back to overview
        </button>
        {focusedModule.render()}
      </div>
    );
  }

  return (
    <div key="overview" className="grid grid-cols-2 gap-[14px] min-[980px]:grid-cols-6">
      {modules.map((module, i) => (
        <BentoTile
          key={module.key}
          module={module}
          wide={n <= 2 || (i < 2 && n !== 3)}
          onOpen={openModule}
        />
      ))}
    </div>
  );
}
