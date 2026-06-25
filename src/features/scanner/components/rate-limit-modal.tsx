"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

export function RateLimitModal({ state, isAuthenticated, onClose, onLogin }: RateLimitModalProps) {
  const isOpen = state !== null;
  return (
    <Dialog open={isOpen} onOpenChange={(open) => (!open ? onClose() : undefined)}>
      <DialogContent className="max-w-md">
        {state?.mode === "login_required" ? (
          <>
            <DialogHeader>
              <DialogTitle>Log in to keep scanning</DialogTitle>
              <DialogDescription>
                Anonymous visitors get one free scan per session. Log in to scan up to three
                nonprofit URLs.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Not now
              </Button>
              <Button type="button" onClick={onLogin}>
                {isAuthenticated ? "Reload" : "Log in"}
              </Button>
            </DialogFooter>
          </>
        ) : null}
        {state?.mode === "contact_for_more" ? (
          <>
            <DialogHeader>
              <DialogTitle>You have used your free scans</DialogTitle>
              <DialogDescription>
                Logged-in users get three free nonprofit scans. Contact us for higher volume access
                and we will set you up with an API key.
              </DialogDescription>
            </DialogHeader>
            <ContactCta
              sourceTag="more-scans"
              headline="Need more scans?"
              subline="Tell us your use case and we will respond within one business day."
              buttonLabel="Contact us"
            />
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
