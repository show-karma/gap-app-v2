"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";

export interface TimelineEntry {
  year: number;
  month: number;
  key: string; // YYYY-MM
  hasReport: boolean;
}

interface Props {
  entries: TimelineEntry[];
  activeKey: string | null;
  onJumpTo: (key: string) => void;
}

const MONTH_ABBR = [
  "JAN",
  "FEB",
  "MAR",
  "APR",
  "MAY",
  "JUN",
  "JUL",
  "AUG",
  "SEP",
  "OCT",
  "NOV",
  "DEC",
];

const useIsomorphicLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

export function ReportTimelineScrubber({ entries, activeKey, onJumpTo }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const dotRefs = useRef<Map<string, HTMLSpanElement>>(new Map());
  const [fillHeight, setFillHeight] = useState(0);

  useIsomorphicLayoutEffect(() => {
    const container = containerRef.current;
    if (!container || !activeKey) {
      setFillHeight(0);
      return;
    }
    const dot = dotRefs.current.get(activeKey);
    if (!dot) {
      setFillHeight(0);
      return;
    }
    const containerRect = container.getBoundingClientRect();
    const dotRect = dot.getBoundingClientRect();
    const offset = dotRect.top + dotRect.height / 2 - containerRect.top;
    setFillHeight(Math.max(0, offset));
  }, [activeKey, entries.length]);

  if (entries.length === 0) return null;

  // Group by year (entries already sorted newest → oldest)
  const groups: Array<{ year: number; entries: TimelineEntry[] }> = [];
  for (const e of entries) {
    const last = groups[groups.length - 1];
    if (!last || last.year !== e.year) groups.push({ year: e.year, entries: [e] });
    else last.entries.push(e);
  }

  return (
    <nav
      aria-label="Reports timeline"
      className="sticky top-24 hidden max-h-[calc(100vh-8rem)] overflow-auto pr-4 lg:block"
    >
      <p className="mb-3 font-mono text-[11px] uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
        Timeline
      </p>
      <div ref={containerRef} className="relative">
        {/* Background spine */}
        <div
          aria-hidden="true"
          className="absolute left-[7px] top-0 bottom-0 w-px bg-zinc-200 dark:bg-zinc-800"
        />
        {/* Active fill — grows to the active dot */}
        <div
          aria-hidden="true"
          className="absolute left-[7px] top-0 w-px bg-blue-500 dark:bg-blue-400"
          style={{
            height: `${fillHeight}px`,
            transition: "height 250ms cubic-bezier(0.22, 1, 0.36, 1)",
          }}
        />
        <div className="space-y-5">
          {groups.map((group) => (
            <div key={group.year}>
              <p className="mb-2 ml-6 font-mono text-[11px] font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                {group.year}
              </p>
              <ul className="space-y-1.5">
                {group.entries.map((e) => {
                  const isActive = e.key === activeKey;
                  return (
                    <li key={e.key} className="flex items-center gap-3">
                      <span
                        ref={(node) => {
                          if (node) dotRefs.current.set(e.key, node);
                          else dotRefs.current.delete(e.key);
                        }}
                        aria-hidden="true"
                        className={`relative z-10 inline-flex h-[15px] w-[15px] flex-shrink-0 items-center justify-center rounded-full transition-all duration-200 ${
                          isActive
                            ? "bg-blue-500 dark:bg-blue-400"
                            : e.hasReport
                              ? "border border-zinc-300 bg-background dark:border-zinc-600"
                              : "bg-transparent"
                        }`}
                      >
                        {!e.hasReport && (
                          <span className="block h-1 w-1 rounded-full bg-zinc-300 dark:bg-zinc-700" />
                        )}
                      </span>
                      {e.hasReport ? (
                        <button
                          type="button"
                          onClick={() => onJumpTo(e.key)}
                          className={`text-left font-mono text-[11px] uppercase tracking-wider transition-colors ${
                            isActive
                              ? "font-semibold text-zinc-900 dark:text-zinc-100"
                              : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
                          }`}
                        >
                          {MONTH_ABBR[e.month - 1]}
                        </button>
                      ) : (
                        <span className="font-mono text-[11px] uppercase tracking-wider text-zinc-300 dark:text-zinc-700">
                          {MONTH_ABBR[e.month - 1]}
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </nav>
  );
}
