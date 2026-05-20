import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

interface EmptyProps {
  icon?: LucideIcon;
  title: string;
  body?: string;
  action?: ReactNode;
}

export function EmptyState({ icon: Icon, title, body, action }: EmptyProps) {
  return (
    <div className="rounded-xl border border-gray-200 dark:border-zinc-800 bg-gradient-to-b from-white to-gray-50/60 dark:from-zinc-900 dark:to-zinc-800/60 px-6 py-12 text-center">
      {Icon ? (
        <div className="mx-auto mb-4 grid h-10 w-10 place-items-center rounded-full bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100">
          <Icon className="h-5 w-5" aria-hidden />
        </div>
      ) : null}
      <p className="text-sm font-semibold text-gray-900 dark:text-zinc-100">{title}</p>
      {body ? (
        <p className="mx-auto mt-1.5 max-w-md text-sm text-gray-600 dark:text-zinc-400">{body}</p>
      ) : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

interface ErrorProps {
  title?: string;
  body?: string;
  onRetry?: () => void;
}

export function ErrorState({ title = "Something didn't load", body, onRetry }: ErrorProps) {
  return (
    <div className="rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/40 dark:bg-amber-950/30 px-5 py-4">
      <p className="text-sm font-semibold text-amber-900 dark:text-amber-300">{title}</p>
      {body ? (
        <p className="mt-0.5 text-sm text-amber-800/80 dark:text-amber-400/80">{body}</p>
      ) : null}
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-3 rounded-md border border-amber-300 dark:border-amber-700 bg-white dark:bg-zinc-900 px-3 py-1.5 text-xs font-medium text-amber-900 dark:text-amber-300 transition hover:bg-amber-50 dark:hover:bg-amber-950/50"
        >
          Try again
        </button>
      ) : null}
    </div>
  );
}
