"use client";

import { useEffect, useRef, useState } from "react";
import { BentoTile } from "./BentoTile";
import type { DashModule } from "./module";
import { SoftIcon } from "./SoftIcon";

/**
 * Bento overview with drill-in. Renders one summary tile per active module in
 * the design's 6-column grid; clicking a tile opens its full view with a
 * "Back to overview" chip. Deep links (#reviews) auto-open the module.
 */
export function BentoOverview({ modules }: { modules: DashModule[] }) {
  const [focus, setFocus] = useState<string | null>(null);
  const keys = modules.map((m) => m.key);
  const keysJoined = keys.join(",");
  const didAutoOpen = useRef(false);

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

  if (focus) {
    const module = modules.find((m) => m.key === focus);
    if (module) {
      return (
        <div>
          <button
            type="button"
            className="mb-4 inline-flex h-9 items-center gap-2 rounded-full border border-sf-line-strong bg-sf-card pl-[11px] pr-[15px] text-[13px] font-semibold text-sf-ink-soft hover:bg-sf-chip"
            onClick={closeModule}
          >
            <SoftIcon
              name="arrow"
              className="h-[15px] w-[15px]"
              style={{ transform: "rotate(180deg)" }}
            />
            Back to overview
          </button>
          {module.render()}
        </div>
      );
    }
  }

  const n = modules.length;
  return (
    <div className="grid grid-cols-2 gap-[14px] min-[980px]:grid-cols-6">
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
