"use client";

import { AlertTriangle, Globe, Lock, Scan } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { PAGES } from "@/utilities/pages";
import { markFreshScanSubmit } from "../hooks/use-scorecard-by-slug";
import { useSubmitScan } from "../hooks/use-submit-scan";
import { hostnameOf } from "../utils/site";
import { RateLimitModal } from "./rate-limit-modal";

interface RateLimitState {
  readonly mode: "login_required" | "contact_for_more";
  readonly message?: string;
}

interface ScannerSubmitFormProps {
  // On the entry hero we show example-domain chips under the field.
  readonly showExamples?: boolean;
}

// Normalizes a pasted domain into a submittable URL. Accepts bare domains
// (yournonprofit.org) by defaulting to https://, matching the field's
// placeholder, then validates the result.
function normalizeUrl(raw: string): { ok: true; value: string } | { ok: false; error: string } {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { ok: false, error: "Enter a nonprofit's website to scan." };
  }
  // Only default to https:// when the input has no scheme of its own —
  // otherwise ftp://x.com or mailto:x@y.com get an https:// prefix and dodge
  // the protocol check below. A colon followed by a digit is a port
  // (example.org:8080), not a scheme.
  const hasScheme = /^[a-z][a-z0-9+.-]*:(?![0-9])/i.test(trimmed);
  const withProtocol = hasScheme ? trimmed : `https://${trimmed}`;
  let parsed: URL;
  try {
    parsed = new URL(withProtocol);
  } catch {
    return {
      ok: false,
      error: "That doesn't look like a valid website. Try a domain like waterkeeper.org.",
    };
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    return { ok: false, error: "The website address must use http or https." };
  }
  if (!parsed.hostname.includes(".")) {
    return {
      ok: false,
      error: "That doesn't look like a valid website. Try a domain like waterkeeper.org.",
    };
  }
  return { ok: true, value: parsed.toString() };
}

const EXAMPLE_DOMAINS = ["waterkeeper.org", "givedirectly.org", "khanacademy.org", "watsi.org"];

export function ScannerSubmitForm({ showExamples = false }: ScannerSubmitFormProps) {
  const { push } = useRouter();
  const { authenticated, ready, login } = useAuth();
  const [url, setUrl] = useState("");
  const [urlError, setUrlError] = useState<string | null>(null);
  const [rateLimit, setRateLimit] = useState<RateLimitState | null>(null);
  // Synchronous in-flight guard: `isPending` only flips on the next render, so
  // two clicks dispatched in the same tick both pass the `disabled` check and
  // fire duplicate POSTs. This ref blocks the second call immediately.
  const submittingRef = useRef(false);
  const submittedUrlRef = useRef<string | null>(null);

  const { mutate, isPending } = useSubmitScan({
    onSuccess: (response) => {
      submittingRef.current = false;
      if (response.created) {
        toast.success("Scan started");
        // Let the scorecard page know this slug was just created, so its
        // pre-scored 404 window polls patiently instead of failing fast.
        markFreshScanSubmit(response.slug);
      } else {
        // A report already existed — viewing it is free (no credit spent).
        toast.success("Generating report for this website");
      }
      const host = hostnameOf(submittedUrlRef.current);
      push(host ? PAGES.SCANNER.SITE(host) : PAGES.SCANNER.PUBLIC_SCORECARD(response.slug));
    },
    onError: (error) => {
      submittingRef.current = false;
      // fetchData collapses the structured {error:{code,...}} body down to a
      // plain axios message string, so we cannot reliably read the backend
      // code here. Branch on status + identity instead: 429 on an unauthed
      // session is the anonymous cap; 429 on an authed session is the
      // logged-in cap (the only two 429 paths POST /scans returns).
      if (error.status === 429) {
        setRateLimit(authenticated ? { mode: "contact_for_more" } : { mode: "login_required" });
        return;
      }
      // Never surface the raw "Request failed with status code N" string that
      // the proxy collapses the error to. Map the status to a human message:
      // 400/422 mean the backend rejected the target (unreachable host, not a
      // real/public site); anything else is an unexpected failure.
      const message =
        error.status === 400 || error.status === 422
          ? "We couldn't scan that website. Make sure the URL points to a public, reachable nonprofit site and try again."
          : "Could not start the scan. Please try again.";
      toast.error(message);
    },
  });

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setUrlError(null);
    const result = normalizeUrl(url);
    if (!result.ok) {
      setUrlError(result.error);
      return;
    }
    if (submittingRef.current) return;
    submittingRef.current = true;
    submittedUrlRef.current = result.value;
    mutate({ url: result.value });
  }

  const disabled = isPending || !ready;

  return (
    <>
      {/* noValidate: run our own validation so the custom inline messages
          below show instead of the browser's native tooltip. */}
      <form onSubmit={handleSubmit} noValidate className="w-full max-w-[620px]">
        <div
          className={`flex h-[60px] items-center gap-2 rounded-xl border-[1.5px] bg-card pl-4 pr-2 shadow-sm transition-colors focus-within:ring-4 ${
            urlError
              ? "border-destructive"
              : "border-border focus-within:border-brand focus-within:ring-brand/15"
          }`}
        >
          <Globe className="h-[18px] w-[18px] shrink-0 text-muted-foreground" aria-hidden />
          <Label htmlFor="scanner-url" className="sr-only">
            Nonprofit URL
          </Label>
          <input
            id="scanner-url"
            aria-label="Nonprofit website URL"
            type="url"
            inputMode="url"
            placeholder="yournonprofit.org"
            value={url}
            spellCheck={false}
            autoComplete="off"
            onChange={(event) => {
              setUrl(event.target.value);
              if (urlError) setUrlError(null);
            }}
            disabled={disabled}
            aria-invalid={urlError ? "true" : undefined}
            aria-describedby="scanner-url-help"
            className="h-full min-w-0 flex-1 appearance-none border-0 bg-transparent px-1 text-[17px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-0 disabled:cursor-not-allowed disabled:opacity-50"
          />
          <Button
            type="submit"
            size="lg"
            disabled={disabled}
            isLoading={isPending}
            className="shrink-0"
          >
            {!isPending ? <Scan className="h-[18px] w-[18px]" aria-hidden /> : null}
            Scan my site
          </Button>
        </div>

        {urlError ? (
          <p
            id="scanner-url-help"
            role="alert"
            className="mt-2.5 flex animate-shake items-center gap-1.5 px-0.5 text-[13.5px] text-destructive motion-reduce:animate-none"
          >
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden />
            {urlError}
          </p>
        ) : (
          <p
            id="scanner-url-help"
            className="mt-2.5 flex items-center gap-1.5 px-0.5 text-[13.5px] text-muted-foreground"
          >
            <Lock className="h-3.5 w-3.5 shrink-0" aria-hidden />
            Free. No login to see your grade.
          </p>
        )}

        {showExamples ? (
          <div className="mt-3.5 flex flex-wrap items-center gap-2">
            <span className="text-[13px] text-muted-foreground">Try:</span>
            {EXAMPLE_DOMAINS.map((domain) => (
              <button
                key={domain}
                type="button"
                onClick={() => {
                  // Prefill with the protocol so the type="url" field validates
                  // cleanly; the chip label stays the bare domain for readability.
                  setUrl(`https://${domain}`);
                  setUrlError(null);
                }}
                className="rounded-full border border-border bg-secondary px-2.5 py-1 font-mono text-[13px] text-foreground-alt transition-all duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5 hover:border-brand-subtle hover:bg-brand-faint active:scale-95 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
              >
                {domain}
              </button>
            ))}
          </div>
        ) : null}
      </form>

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
