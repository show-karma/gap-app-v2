"use client";

import { Globe, Scan } from "lucide-react";
import { useRef, useState } from "react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useScanByUrl } from "../hooks/use-scan-by-url";
import { markFreshScanSubmit } from "../hooks/use-scorecard-by-slug";
import { useSubmitScan } from "../hooks/use-submit-scan";
import { domainToScanUrl } from "../utils/site";
import { ErrorState } from "./error-state";
import { LoggedInDetail } from "./logged-in-detail";
import { PublicScorecard } from "./public-scorecard";
import { RateLimitModal } from "./rate-limit-modal";
import { ReportGenerating } from "./report-generating";

interface ScannerSiteReportProps {
  // The raw `[id]` route param, already known to be a domain (not a UUID).
  readonly domain: string;
  readonly userEmail?: string;
}

interface RateLimitState {
  readonly mode: "login_required" | "contact_for_more";
}

// Empty state for a domain that has never been scanned: offer to generate the
// report for free-first (findOrCreateScan). A successful create invalidates the
// scanner queries, so `useScanByUrl` refetches and the page flips to the
// generating view on its own — no redirect needed, we're already on the
// canonical domain URL.
function NoReportForSite({ domain, url }: { readonly domain: string; readonly url: string }) {
  const { authenticated, login } = useAuth();
  const [rateLimit, setRateLimit] = useState<RateLimitState | null>(null);
  const submittingRef = useRef(false);
  const { mutate, isPending } = useSubmitScan({
    onSuccess: (response) => {
      submittingRef.current = false;
      if (response.created) {
        toast.success("Scan started");
        markFreshScanSubmit(response.slug);
      }
    },
    onError: (error) => {
      submittingRef.current = false;
      if (error.status === 429) {
        setRateLimit(authenticated ? { mode: "contact_for_more" } : { mode: "login_required" });
        return;
      }
      const message =
        error.status === 400 || error.status === 422
          ? "We couldn't scan that website. Make sure the URL points to a public, reachable nonprofit site."
          : "Could not start the scan. Please try again.";
      toast.error(message);
    },
  });

  function handleScan() {
    if (submittingRef.current) return;
    submittingRef.current = true;
    mutate({ url });
  }

  return (
    <>
      <div className="mx-auto flex max-w-md flex-col items-center gap-5 px-6 py-20 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand/15 text-brand-emphasis">
          <Globe className="h-7 w-7" aria-hidden />
        </div>
        <div className="flex flex-col gap-2">
          <h1 className="text-xl font-semibold text-foreground">No report yet for {domain}</h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            We haven't scanned this website. Generate its AI-readiness report — your grade is free
            and takes about 40 seconds.
          </p>
        </div>
        <Button type="button" size="lg" onClick={handleScan} isLoading={isPending}>
          {!isPending ? <Scan className="h-[18px] w-[18px]" aria-hidden /> : null}
          Scan this site
        </Button>
      </div>

      <RateLimitModal
        state={rateLimit}
        isAuthenticated={authenticated}
        onClose={() => setRateLimit(null)}
        onLogin={() => {
          setRateLimit(null);
          login();
        }}
      />
    </>
  );
}

// Website-addressable report view (ora.ai model). Resolves the latest report for
// the domain, then delegates rendering to the existing tier components:
// authenticated viewers get the members-only detail, anonymous viewers get the
// free public scorecard. It does NOT build a third report layout.
export function ScannerSiteReport({ domain, userEmail }: ScannerSiteReportProps) {
  const url = domainToScanUrl(domain);
  const { data, isError, isPending, refetch } = useScanByUrl(url);
  const { ready, authenticated } = useAuth();

  if (!url) {
    return (
      <ErrorState
        title="That doesn't look like a valid website"
        message="Enter a domain like waterkeeper.org to see its AI-readiness report."
      />
    );
  }

  // No data yet: keep the query in its pending state readable as motion. Auth
  // must resolve too, since it decides which tier we delegate to below.
  if (!ready || isPending) {
    return <ReportGenerating url={url} />;
  }

  if (isError && !data) {
    return (
      <ErrorState
        title="We couldn't load this report"
        message="Something went wrong resolving this website's report. Please try again."
        onRetry={() => refetch()}
      />
    );
  }

  // Resolved, but the site has never been scanned.
  if (!data) {
    return <NoReportForSite domain={domain} url={url} />;
  }

  // Envelope exists but the scan is still running — show progress until terminal.
  if (data.status && data.status !== "complete" && data.status !== "failed") {
    return (
      <ReportGenerating orgName={data.orgName ?? null} url={data.url ?? url} status={data.status} />
    );
  }

  // Terminal report: reuse the existing tier components. Both re-resolve their
  // own data (by scanId / slug) and own the in-place polling + share affordance.
  if (authenticated) {
    return <LoggedInDetail scanId={data.scanId} userEmail={userEmail} />;
  }
  return <PublicScorecard slug={data.slug} />;
}
