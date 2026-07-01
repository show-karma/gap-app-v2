import pluralize from "pluralize";
import type { ScanFix } from "../types";

interface TopFixesListProps {
  readonly fixes: readonly ScanFix[];
}

export function TopFixesList({ fixes }: TopFixesListProps) {
  if (fixes.length === 0) {
    return null;
  }
  return (
    <section className="flex flex-col gap-3">
      <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
        Top {fixes.length} {pluralize("fix", fixes.length)}
      </h3>
      <ol className="flex flex-col gap-2">
        {fixes.map((fix, index) => (
          <li
            key={fix.checkId}
            className="flex flex-col gap-1 rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
          >
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                {index + 1}. {fix.title}
              </span>
              <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300">
                {fix.pointsAtStake} {pluralize("point", fix.pointsAtStake)} at stake
              </span>
            </div>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">{fix.howToFix}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
