"use client";

import type { LucideIcon } from "lucide-react";
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  CircleDotDashed,
  Clock,
  Hourglass,
  Octagon,
  Pause,
  Radio,
} from "lucide-react";
import { memo } from "react";
import type { WorkActivity, WorkActivityEvent } from "@/lib/hermes-client";

interface Props {
  activity?: WorkActivity;
}

// Renders Hermes' run + event stream as human-readable status. Empty UI
// returns null so a never-dispatched task doesn't show "no activity" noise.
export const ActivityPanel = memo(function ActivityPanel({ activity }: Props) {
  if (!activity) return null;
  const { currentRun, latestHeartbeatNote, recentEvents, runCount } = activity;

  if (!currentRun && recentEvents.length === 0) {
    return (
      <p className="flex items-center gap-1.5 text-xs text-gray-400">
        <Hourglass className="h-3 w-3" aria-hidden />
        Waiting for the dispatcher to pick this up.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {currentRun ? <CurrentRunHeader run={currentRun} runCount={runCount} /> : null}
      {latestHeartbeatNote ? (
        <div className="rounded-md border border-sky-200 bg-sky-50 px-3 py-2 text-[12.5px] leading-[1.5] text-sky-900">
          <p className="mb-0.5 text-[10.5px] font-semibold uppercase tracking-wider text-sky-700">
            Worker note
          </p>
          {latestHeartbeatNote}
        </div>
      ) : null}
      {currentRun?.lastError ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[12px] leading-[1.5] text-red-900">
          <p className="mb-0.5 inline-flex items-center gap-1 text-[10.5px] font-semibold uppercase tracking-wider text-red-700">
            <AlertCircle className="h-3 w-3" aria-hidden /> Last error
          </p>
          <pre className="whitespace-pre-wrap break-words font-mono">{currentRun.lastError}</pre>
        </div>
      ) : null}
      {recentEvents.length > 0 ? <EventTimeline events={recentEvents} /> : null}
    </div>
  );
});

function CurrentRunHeader({
  run,
  runCount,
}: {
  run: NonNullable<WorkActivity["currentRun"]>;
  runCount: number;
}) {
  const meta = runStatusMeta(run.status);
  const startedAgo = run.startedAt ? relativeFromNow(run.startedAt) : null;
  const heartbeatAgo = run.lastHeartbeatAt ? relativeFromNow(run.lastHeartbeatAt) : null;
  const claimRemaining = run.claimExpires ? relativeUntil(run.claimExpires) : null;
  const stale =
    run.status === "running" &&
    run.lastHeartbeatAt &&
    Date.now() / 1000 - run.lastHeartbeatAt > 600;

  return (
    <div className="rounded-md border border-gray-200 bg-white px-3 py-2.5 text-[12.5px]">
      <div className="flex items-center justify-between gap-3">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium ${meta.bg} ${meta.fg}`}
        >
          <meta.Icon className="h-3 w-3" aria-hidden />
          {meta.label}
        </span>
        <span className="text-[10.5px] uppercase tracking-wider text-gray-400">
          Run #{run.id}
          {runCount > 1 ? ` of ${runCount}` : ""}
        </span>
      </div>
      <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[12px] text-gray-600">
        {run.profile ? (
          <Row label="Worker">{run.profile}</Row>
        ) : (
          <Row label="Worker">unassigned</Row>
        )}
        {startedAgo ? <Row label="Started">{startedAgo}</Row> : null}
        {heartbeatAgo ? (
          <Row label="Last heartbeat">
            <span className={stale ? "text-amber-700" : undefined}>{heartbeatAgo}</span>
          </Row>
        ) : null}
        {claimRemaining ? <Row label="Claim expires">{claimRemaining}</Row> : null}
      </dl>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <>
      <dt className="text-gray-500">{label}</dt>
      <dd className="font-medium text-gray-900">{children}</dd>
    </>
  );
}

function EventTimeline({ events }: { events: WorkActivityEvent[] }) {
  return (
    <details className="rounded-md border border-gray-200 bg-white">
      <summary className="cursor-pointer list-none px-3 py-2 text-[11.5px] font-semibold uppercase tracking-wider text-gray-500 marker:hidden">
        <span className="inline-flex items-center gap-1.5">
          <Activity className="h-3 w-3" aria-hidden />
          Activity ({events.length})
        </span>
      </summary>
      <ol className="border-t border-gray-100">
        {events.map((ev) => {
          const meta = eventKindMeta(ev.kind);
          return (
            <li
              key={ev.id}
              className="flex items-start gap-2.5 border-b border-gray-50 px-3 py-2 last:border-b-0"
            >
              <span className={`mt-0.5 inline-grid h-4 w-4 place-items-center ${meta.fg}`}>
                <meta.Icon className="h-3 w-3" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[12px] font-medium text-gray-900">{meta.label}</p>
                {ev.note ? (
                  <p className="mt-0.5 line-clamp-3 text-[11.5px] text-gray-600">{ev.note}</p>
                ) : null}
              </div>
              <span className="shrink-0 text-[10.5px] text-gray-400">
                {relativeFromNow(ev.createdAt)}
              </span>
            </li>
          );
        })}
      </ol>
    </details>
  );
}

interface StatusMeta {
  label: string;
  bg: string;
  fg: string;
  Icon: LucideIcon;
}

function runStatusMeta(status: string): StatusMeta {
  switch (status) {
    case "running":
      return {
        label: "Running",
        bg: "bg-emerald-50",
        fg: "text-emerald-700",
        Icon: Radio,
      };
    case "completed":
    case "done":
      return {
        label: "Completed",
        bg: "bg-emerald-50",
        fg: "text-emerald-700",
        Icon: CheckCircle2,
      };
    case "crashed":
    case "failed":
    case "timed_out":
      return {
        label: status === "timed_out" ? "Timed out" : "Failed",
        bg: "bg-red-50",
        fg: "text-red-700",
        Icon: Octagon,
      };
    case "reclaimed":
    case "blocked":
      return {
        label: status === "reclaimed" ? "Reclaimed" : "Blocked",
        bg: "bg-amber-50",
        fg: "text-amber-700",
        Icon: Pause,
      };
    default:
      return {
        label: status,
        bg: "bg-gray-100",
        fg: "text-gray-700",
        Icon: CircleDotDashed,
      };
  }
}

function eventKindMeta(kind: string): StatusMeta {
  switch (kind) {
    case "created":
      return { label: "Created", bg: "", fg: "text-gray-500", Icon: Clock };
    case "claimed":
      return { label: "Claimed", bg: "", fg: "text-sky-600", Icon: CircleDotDashed };
    case "spawned":
      return { label: "Worker spawned", bg: "", fg: "text-sky-600", Icon: Activity };
    case "heartbeat":
      return { label: "Heartbeat", bg: "", fg: "text-emerald-600", Icon: Radio };
    case "completed":
      return { label: "Completed", bg: "", fg: "text-emerald-600", Icon: CheckCircle2 };
    case "crashed":
    case "failed":
    case "timed_out":
      return {
        label: kind === "timed_out" ? "Timed out" : "Failed",
        bg: "",
        fg: "text-red-600",
        Icon: Octagon,
      };
    case "blocked":
      return { label: "Blocked", bg: "", fg: "text-amber-600", Icon: Pause };
    default:
      return { label: kind, bg: "", fg: "text-gray-400", Icon: CircleDotDashed };
  }
}

function relativeFromNow(unixSeconds: number): string {
  const diff = Math.floor(Date.now() / 1000 - unixSeconds);
  if (diff < 5) return "just now";
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86_400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86_400)}d ago`;
}

function relativeUntil(unixSeconds: number): string {
  const diff = unixSeconds - Math.floor(Date.now() / 1000);
  if (diff <= 0) return "expired";
  if (diff < 60) return `in ${diff}s`;
  if (diff < 3600) return `in ${Math.floor(diff / 60)}m`;
  return `in ${Math.floor(diff / 3600)}h`;
}
