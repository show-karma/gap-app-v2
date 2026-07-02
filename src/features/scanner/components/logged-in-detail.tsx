"use client";

import {
  ArrowLeft,
  Bot,
  Clock,
  FileText,
  MousePointerClick,
  RefreshCw,
  Share2,
  Shield,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import pluralize from "pluralize";
import { useState } from "react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { useCopyToClipboard } from "@/hooks/useCopyToClipboard";
import { PAGES } from "@/utilities/pages";
import { useScan } from "../hooks/use-scan";
import { useSubmitScan } from "../hooks/use-submit-scan";
import { GRADE_LABEL, gradeBand } from "../utils/labels";
import { titleFromUrl } from "../utils/site";
import { CategoryBar } from "./category-bar";
import { ContactCta } from "./contact-cta";
import { ErrorState } from "./error-state";
import { EvidenceList } from "./evidence-list";
import { GradeBadge } from "./grade-badge";
import { ReportGenerating } from "./report-generating";
import { ScannerViewTracker } from "./scanner-view-tracker";
import { ScoreGauge } from "./score-gauge";
import { TopFixesList } from "./top-fixes-list";

interface LoggedInDetailProps {
  readonly scanId: string;
  readonly userEmail?: string;
}

type ReportTab = "path" | "evidence" | "flow";

// A/B read on the brand ink, C amber, D/F rose — same spine as the gauge.
const LABEL_TONE: Record<string, string> = {
  strong: "text-brand-emphasis",
  ok: "text-amber-700",
  weak: "text-orange-700",
  critical: "text-rose-600",
};

function fmtScannedAt(iso?: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  const date = d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  return `${date} · ${time}`;
}

function scanDuration(start?: string | null, end?: string | null): string | null {
  if (!start || !end) return null;
  const secs = Math.round((new Date(end).getTime() - new Date(start).getTime()) / 1000);
  return secs > 0 && secs < 3600 ? `${secs}s` : null;
}

export function LoggedInDetail({ scanId, userEmail }: LoggedInDetailProps) {
  const { data, isError, refetch } = useScan(scanId);
  const { push } = useRouter();
  const [tab, setTab] = useState<ReportTab>("path");
  const [copied, setCopied] = useState(false);
  const [, copyToClipboard] = useCopyToClipboard();
  const { mutate: resubmit, isPending: isRescanning } = useSubmitScan({
    onSuccess: (response) => {
      toast.success("Re-scan started");
      push(PAGES.SCANNER.PUBLIC_SCORECARD(response.slug));
    },
    onError: () => toast.error("Couldn't start a re-scan. Please try again."),
  });

  // No envelope yet. A just-created scan can 404 briefly before its record is
  // queryable; the query stays pending (retrying) through that window, so we
  // show the generating view rather than an error until retries are exhausted.
  if (!data) {
    if (isError) {
      return (
        <ErrorState
          title="We couldn't load this scan"
          message="You may not have access to this scan, or it may have been deleted."
          onRetry={() => refetch()}
        />
      );
    }
    return <ReportGenerating />;
  }

  // Envelope exists but the scan is still running — keep the progress view until
  // it reaches a terminal status.
  if (data.status && data.status !== "complete" && data.status !== "failed") {
    return (
      <ReportGenerating
        orgName={data.orgName ?? null}
        url={data.url ?? null}
        status={data.status}
      />
    );
  }

  const categoryScores = data.categoryScores ?? [];
  const topFixes = data.topFixes ?? [];
  const evidence = data.evidence ?? [];
  const totalScore = data.totalScore ?? 0;
  const grade = data.grade ?? null;
  const url = data.url ?? null;
  const org = data.orgName ?? titleFromUrl(url);
  const urlDisplay = url?.replace(/^https?:\/\//, "").replace(/\/$/, "") ?? null;
  const gradeLabel = grade ? GRADE_LABEL[grade] : null;
  const labelTone = grade ? LABEL_TONE[gradeBand(grade)] : "text-muted-foreground";
  const scannedAt = fmtScannedAt(data.finishedAtComplete ?? null);
  const duration = scanDuration(data.startedAt, data.finishedAtComplete);
  const fixPoints = topFixes.reduce((sum, fix) => sum + (fix.pointsAtStake ?? 0), 0);

  function handleShare() {
    if (typeof window === "undefined") return;
    const href = data?.slug
      ? `${window.location.origin}${PAGES.SCANNER.PUBLIC_SCORECARD(data.slug)}`
      : window.location.href;
    copyToClipboard(href).then((ok) => {
      if (!ok) return;
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  }

  function handleRescan() {
    if (!url || isRescanning) return;
    resubmit({ url });
  }

  const TABS: ReadonlyArray<{
    readonly id: ReportTab;
    readonly label: string;
    readonly icon: typeof Zap;
    readonly count: number | null;
  }> = [
    { id: "path", label: "Path to 100", icon: Zap, count: topFixes.length },
    { id: "evidence", label: "Evidence", icon: FileText, count: evidence.length },
    { id: "flow", label: "Donate-flow", icon: MousePointerClick, count: null },
  ];

  return (
    <div className="flex flex-col gap-6">
      <ScannerViewTracker
        variant="detail"
        scanId={data.scanId}
        slug={data.slug}
        grade={data.grade}
        totalScore={data.totalScore}
        orgName={data.orgName ?? null}
        viewerIsOwner={data.viewerIsOwner}
      />

      <Link
        href={data.slug ? PAGES.SCANNER.PUBLIC_SCORECARD(data.slug) : PAGES.SCANNER.ROOT}
        className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        {data.slug ? "Back to scorecard" : "Back to scanner"}
      </Link>

      {/* report header */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-4 rounded-2xl border border-border bg-card p-5">
        <ScoreGauge score={totalScore} grade={grade} size={78} />
        <div className="min-w-0 flex-1 sm:min-w-[220px]">
          <div className="mb-1 flex flex-wrap items-center gap-2.5">
            <h1 className="text-[19px] font-bold tracking-tight text-foreground">{org}</h1>
            {grade ? <GradeBadge grade={grade} size={24} /> : null}
            {gradeLabel ? (
              <span className={`text-xs font-semibold uppercase tracking-[0.05em] ${labelTone}`}>
                {gradeLabel}
              </span>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px] text-muted-foreground">
            {urlDisplay ? <span className="font-mono">{urlDisplay}</span> : null}
            {scannedAt ? (
              <span className="inline-flex items-center gap-1.5">
                <Clock className="h-3 w-3" aria-hidden />
                {scannedAt}
                {duration ? ` · ${duration}` : ""}
              </span>
            ) : null}
          </div>
        </div>
        <div className="flex items-center gap-5">
          {topFixes.length > 0 ? (
            <div className="text-right">
              <div className="text-xl font-bold leading-none text-foreground tabular-nums">
                {topFixes.length}
              </div>
              <div className="mt-1 text-[11.5px] text-muted-foreground">
                {pluralize("fix", topFixes.length)} · +{fixPoints} pts
              </div>
            </div>
          ) : null}
          <div className="flex flex-col gap-2">
            <Button type="button" variant="outline" size="sm" onClick={handleShare}>
              <Share2 className="h-3.5 w-3.5" aria-hidden />
              {copied ? "Copied" : "Share"}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleRescan}
              disabled={!url || isRescanning}
              isLoading={isRescanning}
            >
              {!isRescanning ? <RefreshCw className="h-3.5 w-3.5" aria-hidden /> : null}
              Re-scan
            </Button>
          </div>
        </div>
      </div>

      {/* tab strip */}
      <div className="sticky top-16 z-20 flex gap-1 overflow-x-auto rounded-xl border border-border bg-card/95 p-1 backdrop-blur [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {TABS.map((entry) => {
          const Icon = entry.icon;
          const active = tab === entry.id;
          return (
            <button
              key={entry.id}
              type="button"
              onClick={() => setTab(entry.id)}
              aria-pressed={active}
              className={`inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-lg px-3.5 py-2 text-sm font-semibold transition-colors ${
                active
                  ? "bg-secondary text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4" aria-hidden />
              {entry.label}
              {entry.count != null ? (
                <span
                  className={`rounded-full px-1.5 text-[11px] font-bold tabular-nums ${
                    active
                      ? "bg-brand/15 text-brand-emphasis"
                      : "bg-secondary text-muted-foreground"
                  }`}
                >
                  {entry.count}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {/* tab panels */}
      {tab === "path" ? (
        <TopFixesList fixes={topFixes} startScore={data.totalScore ?? null} />
      ) : null}

      {tab === "evidence" ? (
        <div className="flex flex-col gap-6">
          {categoryScores.length > 0 ? (
            <section
              className="rounded-2xl border border-border bg-card px-6 py-2"
              aria-label="Category scores"
            >
              {categoryScores.map((category) => (
                <CategoryBar key={category.category} score={category} />
              ))}
            </section>
          ) : null}
          <EvidenceList evidence={evidence} />
        </div>
      ) : null}

      {tab === "flow" ? (
        data.walkthroughNotes ? (
          <section className="flex flex-col gap-3 rounded-2xl border border-brand-muted bg-brand-faint/50 p-6 dark:border-brand/20 dark:bg-brand/5">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-brand text-brand-950">
                <Bot className="h-[18px] w-[18px]" aria-hidden />
              </span>
              <h2 className="text-lg font-bold tracking-tight text-foreground">
                Donate-flow walkthrough
              </h2>
            </div>
            <p className="whitespace-pre-line text-sm leading-relaxed text-foreground-alt">
              {data.walkthroughNotes}
            </p>
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Shield className="h-3.5 w-3.5 shrink-0" aria-hidden />
              The agent stops at the payment boundary every time — it never enters card details or
              submits a payment.
            </p>
          </section>
        ) : (
          <div className="rounded-2xl border border-dashed border-border bg-secondary/40 px-6 py-12 text-center text-sm text-muted-foreground">
            No donate-flow walkthrough was captured for this scan.
          </div>
        )
      ) : null}

      {topFixes.length > 0 ? (
        <ContactCta
          sourceTag="fix-help"
          headline="Want help closing these gaps?"
          subline="Our team can implement the fixes and re-scan to verify — or wire the scanner into your own tools."
          defaultEmail={userEmail}
          defaultOrgName={data.orgName ?? undefined}
          scanId={data.scanId}
          buttonLabel="Contact us"
        />
      ) : null}
    </div>
  );
}
