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
  readonly domain: string;
}

interface RateLimitState {
  readonly mode: "login_required" | "contact_for_more";
}

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
            We haven't scanned this website. Generate its AI-readiness report: your grade is free
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

export function ScannerSiteReport({ domain }: ScannerSiteReportProps) {
  const url = domainToScanUrl(domain);
  const { data, isError, isPending, refetch } = useScanByUrl(url);
  const { authenticated, user } = useAuth();
  const userEmail = user?.email?.address ?? undefined;

  if (!url) {
    return (
      <ErrorState
        title="That doesn't look like a valid website"
        message="Enter a domain like waterkeeper.org to see its AI-readiness report."
      />
    );
  }

  if (isPending) {
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

  if (!data) {
    return <NoReportForSite domain={domain} url={url} />;
  }

  if (data.status && data.status !== "complete" && data.status !== "failed") {
    return (
      <ReportGenerating orgName={data.orgName ?? null} url={data.url ?? url} status={data.status} />
    );
  }

  if (authenticated) {
    return <LoggedInDetail scanId={data.scanId} userEmail={userEmail} />;
  }
  return <PublicScorecard slug={data.slug} />;
}
