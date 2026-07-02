"use client";

import {
  ArrowLeft,
  ArrowRight,
  Clock,
  ExternalLink,
  FileText,
  Globe,
  Lock,
  MousePointerClick,
  Share2,
  Shield,
  Wrench,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useLoadPrivy } from "@/contexts/privy-bridge-context";
import { setPostLoginRedirect, useAuth } from "@/hooks/useAuth";
import { useCopyToClipboard } from "@/hooks/useCopyToClipboard";
import { PAGES } from "@/utilities/pages";
import { useScorecardBySlug } from "../hooks/use-scorecard-by-slug";
import type { CategoryScore, PublicScorecardPayload } from "../types";
import { hostnameOf, titleFromUrl } from "../utils/site";
import { CategoryBar } from "./category-bar";
import { ErrorState } from "./error-state";
import { MembersAreaCta } from "./members-area-cta";
import { ReportGenerating } from "./report-generating";
import { ScoreHero } from "./score-hero";

interface PublicScorecardProps {
  readonly slug: string;
  readonly initialData?: PublicScorecardPayload;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function fmtDate(iso: string): string {
  const d = new Date(iso);
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
}
function scanDuration(start?: string | null, end?: string | null): string | null {
  if (!start || !end) return null;
  const secs = Math.round((new Date(end).getTime() - new Date(start).getTime()) / 1000);
  return secs > 0 && secs < 3600 ? `${secs}s` : null;
}

const FAVICON_SERVICE = "https://www.google.com/s2/favicons";

// The scanned site's real favicon, falling back to a brand initial on load error.
function SiteFavicon({
  hostname,
  fallback,
}: {
  readonly hostname: string | null;
  readonly fallback: string;
}) {
  const [broken, setBroken] = useState(false);
  if (!hostname || broken) {
    return (
      <span className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-xl bg-brand text-xl font-bold text-brand-950">
        {fallback}
      </span>
    );
  }
  return (
    <span className="flex h-[46px] w-[46px] shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-card">
      <Image
        src={`${FAVICON_SERVICE}?domain=${encodeURIComponent(hostname)}&sz=64`}
        alt=""
        width={28}
        height={28}
        unoptimized
        className="h-7 w-7 object-contain"
        onError={() => setBroken(true)}
      />
    </span>
  );
}

// Top row: back link on the left, scanned-at meta on the right.
function ScorecardTopBar({
  finishedAt,
  duration,
}: {
  readonly finishedAt: string | null;
  readonly duration: string | null;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <Link
        href={PAGES.SCANNER.ROOT}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Back to scanner
      </Link>
      {finishedAt ? (
        <span className="inline-flex items-center gap-1.5 text-[12.5px] text-muted-foreground">
          <Clock className="h-3 w-3" aria-hidden />
          Scanned {fmtDate(finishedAt)}
          {duration ? ` · ${duration}` : ""}
        </span>
      ) : null}
    </div>
  );
}

function CategoryBreakdownCard({ scores }: { readonly scores: readonly CategoryScore[] }) {
  const rawAwarded = scores.reduce((s, c) => s + c.pointsAwarded, 0);
  const rawPossible = scores.reduce((s, c) => s + c.pointsPossible, 0);
  return (
    <section
      className="rounded-2xl border border-border bg-card px-6 pb-4 pt-2"
      aria-label="Category breakdown"
    >
      <div className="flex items-center justify-between py-4">
        <h2 className="text-[17px] font-semibold text-foreground">Category breakdown</h2>
        {rawPossible > 0 ? (
          <span className="text-[12.5px] text-muted-foreground">
            {rawAwarded}/{rawPossible} raw · normalized to 100
          </span>
        ) : null}
      </div>
      {scores.map((category, i) => (
        <CategoryBar key={category.category} score={category} index={i} />
      ))}
    </section>
  );
}

const UPSELL_FEATURES = [
  { icon: Wrench, title: "Prioritized fixes", sub: "Ranked by impact" },
  { icon: FileText, title: "25 checks of evidence", sub: "Pass / partial / fail" },
  {
    icon: MousePointerClick,
    title: "Donate-flow walkthrough",
    sub: "The agent's play-by-play",
  },
] as const;

function MembersUpsell({
  slug,
  scorecard,
}: {
  readonly slug: string;
  readonly scorecard: PublicScorecardPayload;
}) {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-border bg-card">
      <div
        className="absolute inset-0 bg-gradient-to-br from-brand/10 to-transparent"
        aria-hidden
      />
      <div className="relative flex flex-col gap-5 p-7">
        <div className="flex items-center gap-2">
          <span className="flex h-[30px] w-[30px] items-center justify-center rounded-lg bg-brand text-brand-950">
            <Lock className="h-[15px] w-[15px]" aria-hidden />
          </span>
          <span className="text-xs font-bold uppercase tracking-[0.06em] text-brand-emphasis">
            Members area
          </span>
        </div>
        <div>
          <h2 className="max-w-[440px] text-[22px] font-semibold tracking-tight text-foreground">
            {scorecard.totalScore != null && scorecard.totalScore < 100
              ? "You can reach 100. Here's exactly how."
              : "See the full report."}
          </h2>
          <p className="mt-2 max-w-[480px] text-[15px] leading-relaxed text-foreground-alt">
            Sign in free to unlock your prioritized fixes, the raw evidence behind all 25 checks,
            and the full donate-flow walkthrough.
          </p>
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-3">
          {UPSELL_FEATURES.map((feat) => {
            const Icon = feat.icon;
            return (
              <div key={feat.title} className="flex items-start gap-2.5">
                <Icon
                  className="mt-0.5 h-[18px] w-[18px] shrink-0 text-brand-emphasis"
                  aria-hidden
                />
                <div>
                  <div className="text-sm font-semibold text-foreground">{feat.title}</div>
                  <div className="text-[12.5px] text-muted-foreground">{feat.sub}</div>
                </div>
              </div>
            );
          })}
        </div>
        <MembersAreaCta slug={slug} initialData={scorecard} />
      </div>
    </div>
  );
}

const TEASER_ROWS = ["row-1", "row-2", "row-3"];

// Blurred placeholder fixes with an auth-aware unlock/open cue on top.
function FixTeaser({
  authenticated,
  ready,
  disabled,
  onOpenReport,
}: {
  readonly authenticated: boolean;
  readonly ready: boolean;
  readonly disabled: boolean;
  readonly onOpenReport: () => void;
}) {
  // Until auth resolves, use the neutral label so an already-signed-in user
  // never flashes "Sign in to unlock".
  const promptSignIn = ready && !authenticated;
  const Icon = promptSignIn ? Lock : FileText;
  return (
    <div className="relative">
      <div className="pointer-events-none select-none space-y-2 opacity-60 blur-[5px]" aria-hidden>
        {TEASER_ROWS.map((row) => (
          <div
            key={row}
            className="flex items-center gap-3 rounded-lg border border-border bg-card p-3.5"
          >
            <div className="h-7 w-7 rounded-lg bg-secondary" />
            <div className="flex-1">
              <div className="mb-1.5 h-3 w-3/5 rounded bg-secondary" />
              <div className="h-2.5 w-4/5 rounded bg-secondary" />
            </div>
            <div className="h-5 w-12 rounded-full bg-secondary" />
          </div>
        ))}
      </div>
      <div className="absolute inset-0 grid place-items-center">
        <button
          type="button"
          onClick={onOpenReport}
          disabled={disabled}
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-4 py-2 text-[13.5px] font-semibold text-foreground shadow-sm transition-colors hover:border-brand-subtle hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Icon
            className={`h-3.5 w-3.5 ${promptSignIn ? "" : "text-brand-emphasis"}`}
            aria-hidden
          />
          {promptSignIn ? "Sign in to unlock the fixes" : "Fixes hidden: see the full report"}
          <ArrowRight className="h-3.5 w-3.5" aria-hidden />
        </button>
      </div>
    </div>
  );
}

export function PublicScorecard({ slug, initialData }: PublicScorecardProps) {
  const { data, isError, refetch } = useScorecardBySlug(slug);
  const { push } = useRouter();
  const { ready, authenticated, login } = useAuth();
  const loadPrivy = useLoadPrivy();
  const [copied, setCopied] = useState(false);
  // A login click that landed before the deferred Privy SDK finished loading.
  // The bridge's pre-load `login` is a silent no-op, so we queue the intent in
  // a ref (it is never read during render), kick the SDK load, and fire the
  // real login once `ready` flips true.
  const queuedLoginRef = useRef(false);
  const [, copyToClipboard] = useCopyToClipboard();
  const scorecard = data ?? initialData ?? null;

  useEffect(() => {
    if (!ready || !queuedLoginRef.current) return;
    queuedLoginRef.current = false;
    if (!authenticated) login();
  }, [ready, authenticated, login]);

  // No payload yet. While the query is still retrying the pre-scored 404
  // window it stays pending (not `isError`), so a just-submitted scan reads as
  // "generating" rather than "not found". Only once retries are exhausted does
  // `isError` flip and we surface the genuine unpublished / wrong-URL error.
  if (!scorecard) {
    if (isError) {
      return (
        <ErrorState
          title="We couldn't load this scorecard"
          message="The scorecard may have been unpublished by the organization, or the URL may be wrong."
          onRetry={() => refetch()}
        />
      );
    }
    return <ReportGenerating />;
  }

  // Scored record exists but the scan is still running its remaining tiers.
  if (scorecard.status && scorecard.status !== "complete" && scorecard.status !== "failed") {
    return (
      <ReportGenerating
        orgName={scorecard.orgName ?? null}
        url={scorecard.url ?? null}
        status={scorecard.status}
      />
    );
  }

  const categoryScores = scorecard.categoryScores ?? [];
  const org = scorecard.orgName ?? null;
  const url = scorecard.url ?? null;
  const favicon = (org ?? url ?? "?")
    .replace(/^https?:\/\//, "")
    .charAt(0)
    .toUpperCase();
  const scanId = scorecard.scanId ?? null;

  // Same open-the-report path as MembersAreaCta: an authed viewer goes straight
  // to the detail report; an anonymous one logs in first and lands there after.
  function openReport() {
    if (!scanId) return;
    const detailHref = PAGES.SCANNER.SCAN_DETAIL(scanId);
    if (authenticated) {
      push(detailHref);
      return;
    }
    setPostLoginRedirect(detailHref);
    if (!ready) {
      // SDK still deferred — request it and queue the login for when it lands.
      loadPrivy();
      queuedLoginRef.current = true;
      return;
    }
    login();
  }

  async function handleShare() {
    if (typeof window === "undefined") return;
    const ok = await copyToClipboard(window.location.href);
    if (!ok) return;
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  return (
    <article className="mx-auto flex max-w-[760px] flex-col gap-4">
      <ScorecardTopBar
        finishedAt={scorecard.finishedAtComplete ?? null}
        duration={scanDuration(scorecard.startedAt, scorecard.finishedAtComplete)}
      />

      {/* hero card: org header + score */}
      <div className="rounded-3xl border border-border bg-card p-7">
        <div className="flex flex-wrap items-center gap-3.5">
          <SiteFavicon hostname={hostnameOf(url)} fallback={favicon} />
          <div className="min-w-[200px] flex-1">
            <h1 className="text-[22px] font-semibold tracking-tight text-foreground">
              {org ?? titleFromUrl(url)}
            </h1>
            {url ? (
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-0.5 inline-flex items-center gap-1.5 text-[13.5px] text-muted-foreground transition-colors hover:text-foreground"
              >
                <Globe className="h-3.5 w-3.5" aria-hidden />
                {url.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                <ExternalLink className="h-3 w-3" aria-hidden />
              </a>
            ) : null}
          </div>
          <button
            type="button"
            onClick={handleShare}
            className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md border border-border bg-background px-3 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
          >
            <Share2 className="h-[15px] w-[15px]" aria-hidden />
            {copied ? "Copied" : "Share"}
          </button>
        </div>
        <div className="my-5 h-px bg-border" />
        <ScoreHero totalScore={scorecard.totalScore} grade={scorecard.grade} />
      </div>

      {categoryScores.length > 0 ? <CategoryBreakdownCard scores={categoryScores} /> : null}

      <MembersUpsell slug={slug} scorecard={scorecard} />

      <FixTeaser
        authenticated={authenticated}
        ready={ready}
        disabled={!scanId}
        onOpenReport={openReport}
      />

      <p className="mt-4 flex items-center justify-center gap-1.5 text-center text-[12.5px] text-muted-foreground">
        <Shield className="h-3.5 w-3.5" aria-hidden />
        Karma's crawler is polite, identifies itself, and never submits payment.
      </p>
    </article>
  );
}
