"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { ContactCta } from "./contact-cta";

interface RateLimitModalState {
  readonly mode: "login_required" | "contact_for_more";
}

interface RateLimitModalProps {
  readonly state: RateLimitModalState | null;
  readonly isAuthenticated: boolean;
  readonly onClose: () => void;
  readonly onLogin: () => void;
}

// Spent-quota pips: `used` filled, the rest empty.
function QuotaPips({ used, cap }: { readonly used: number; readonly cap: number }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex gap-1.5" aria-hidden>
        {Array.from({ length: cap }, (_, i) => (
          <span
            // biome-ignore lint/suspicious/noArrayIndexKey: fixed-length decorative pips
            key={i}
            className={`h-2 w-6 rounded-full ${i < used ? "bg-brand" : "bg-secondary"}`}
          />
        ))}
      </div>
      <span className="text-[13px] font-semibold text-muted-foreground">
        {used} / {cap} free {cap === 1 ? "scan" : "scans"} used
      </span>
    </div>
  );
}

export function RateLimitModal({ state, isAuthenticated, onClose, onLogin }: RateLimitModalProps) {
  const isOpen = state !== null;
  const loginRequired = state?.mode === "login_required";

  return (
    <Dialog open={isOpen} onOpenChange={(open) => (!open ? onClose() : undefined)}>
      <DialogContent className="max-w-[430px] gap-0 overflow-hidden p-0">
        {/* branded persona header */}
        <div className="flex items-center gap-3 border-b border-border bg-brand-faint px-6 py-5 dark:bg-brand/10">
          <DialogTitle className="text-[19px] font-bold tracking-tight text-foreground">
            {loginRequired ? "Scan limit reached" : "You've used your free scans"}
          </DialogTitle>
        </div>

        {/* body */}
        <div className="flex flex-col gap-4 px-6 py-6">
          <QuotaPips used={loginRequired ? 1 : 3} cap={loginRequired ? 1 : 3} />

          {loginRequired ? (
            <>
              <p className="text-[14.5px] leading-relaxed text-foreground-alt">
                We rate-limit anonymous scans so the crawler stays a good citizen of the sites it
                visits. Sign in to scan up to three nonprofit URLs.
              </p>
              <Button type="button" size="lg" onClick={onLogin}>
                {isAuthenticated ? "Reload" : "Sign in to keep scanning"}
              </Button>
            </>
          ) : (
            <>
              <p className="text-[14.5px] leading-relaxed text-foreground-alt">
                Logged-in users get three free nonprofit scans. Contact us for higher-volume access
                and we'll set you up with an API key.
              </p>
              <ContactCta
                sourceTag="more-scans"
                headline="Need more scans?"
                subline="Tell us your use case and we'll respond within one business day."
                buttonLabel="Contact us about bulk access"
              />
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
