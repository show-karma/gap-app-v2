"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { PAGES } from "@/utilities/pages";
import { useSubmitScan } from "../hooks/use-submit-scan";
import { RateLimitModal } from "./rate-limit-modal";

interface RateLimitState {
  readonly mode: "login_required" | "contact_for_more";
  readonly message?: string;
}

export function ScannerSubmitForm() {
  const router = useRouter();
  const { authenticated, ready, login } = useAuth();
  const [url, setUrl] = useState("");
  const [urlError, setUrlError] = useState<string | null>(null);
  const [rateLimit, setRateLimit] = useState<RateLimitState | null>(null);

  const { mutate, isPending } = useSubmitScan({
    onSuccess: (response) => {
      toast.success("Scan started");
      router.push(PAGES.SCANNER.PUBLIC_SCORECARD(response.slug));
    },
    onError: (error) => {
      // fetchData collapses the structured {error:{code,...}} body down to a
      // plain axios message string, so we cannot reliably read the backend
      // code here. Branch on status + identity instead: 429 on an unauthed
      // session is the anonymous cap; 429 on an authed session is the
      // logged-in cap (the only two 429 paths POST /scans returns).
      if (error.status === 429) {
        if (!authenticated) {
          setRateLimit({ mode: "login_required" });
        } else {
          setRateLimit({ mode: "contact_for_more" });
        }
        return;
      }
      toast.error(error.message || "Could not start the scan. Please try again.");
    },
  });

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setUrlError(null);
    const trimmed = url.trim();
    if (!trimmed) {
      setUrlError("Enter a URL to scan.");
      return;
    }
    let parsed: URL;
    try {
      parsed = new URL(trimmed);
    } catch {
      setUrlError("Enter a full URL starting with https://");
      return;
    }
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      setUrlError("URL must use http:// or https://");
      return;
    }
    mutate({ url: parsed.toString() });
  }

  const disabled = isPending || !ready;

  return (
    <>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <div className="flex flex-1 flex-col gap-1">
          <Label htmlFor="scanner-url" className="sr-only">
            Nonprofit URL
          </Label>
          <Input
            id="scanner-url"
            type="url"
            inputMode="url"
            placeholder="https://example.org"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            disabled={disabled}
            aria-invalid={urlError ? "true" : undefined}
            aria-describedby={urlError ? "scanner-url-error" : undefined}
          />
          {urlError ? (
            <p
              id="scanner-url-error"
              role="alert"
              className="text-sm text-rose-600 dark:text-rose-400"
            >
              {urlError}
            </p>
          ) : null}
        </div>
        <Button type="submit" disabled={disabled} className="sm:self-stretch">
          {isPending ? "Starting..." : "Scan"}
        </Button>
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
