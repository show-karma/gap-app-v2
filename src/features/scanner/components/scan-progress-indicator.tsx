import type { ScanStatus } from "../types";

const STATUS_LABELS: Record<ScanStatus, string> = {
  queued: "Queued",
  running_config: "Running config-tier checks",
  config_complete: "Donate-flow check in progress",
  running_agent: "Running donate-flow walkthrough",
  complete: "Complete",
  failed: "Failed",
};

interface ScanProgressIndicatorProps {
  readonly status: ScanStatus;
}

export function ScanProgressIndicator({ status }: ScanProgressIndicatorProps) {
  const isWorking = status !== "complete" && status !== "failed";
  const dotClass = isWorking
    ? "bg-blue-500 animate-pulse"
    : status === "complete"
      ? "bg-emerald-500"
      : "bg-rose-500";
  return (
    <div className="inline-flex items-center gap-2 rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
      <span className={`h-2 w-2 rounded-full ${dotClass}`} aria-hidden />
      <span>{STATUS_LABELS[status]}</span>
    </div>
  );
}
