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
    <div className="rounded-xl border border-gray-200 bg-gradient-to-b from-white to-gray-50/60 px-6 py-12 text-center">
      {Icon ? (
        <div className="mx-auto mb-4 grid h-10 w-10 place-items-center rounded-full bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100">
          <Icon className="h-5 w-5" aria-hidden />
        </div>
      ) : null}
      <p className="text-sm font-semibold text-gray-900">{title}</p>
      {body ? <p className="mx-auto mt-1.5 max-w-md text-sm text-gray-600">{body}</p> : null}
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
    <div className="rounded-xl border border-amber-200 bg-amber-50/40 px-5 py-4">
      <p className="text-sm font-semibold text-amber-900">{title}</p>
      {body ? <p className="mt-0.5 text-sm text-amber-800/80">{body}</p> : null}
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-3 rounded-md border border-amber-300 bg-white px-3 py-1.5 text-xs font-medium text-amber-900 transition hover:bg-amber-50"
        >
          Try again
        </button>
      ) : null}
    </div>
  );
}
