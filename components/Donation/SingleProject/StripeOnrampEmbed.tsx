"use client";

import type { OnrampSession } from "@stripe/crypto";
import { loadStripeOnramp } from "@stripe/crypto";
import { AlertCircle, Loader2, X } from "lucide-react";
import { useTheme } from "next-themes";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { errorManager } from "@/components/Utilities/errorManager";
import { Button } from "@/components/ui/button";
import type { StripeOnrampSessionData } from "@/hooks/donation/types";
import { envVars } from "@/utilities/enviromentVars";

interface StripeOnrampEmbedProps {
  clientSecret: string;
  onClose: () => void;
  onSuccess?: (sessionData: StripeOnrampSessionData) => void;
}

export const StripeOnrampEmbed = React.memo<StripeOnrampEmbedProps>(
  ({ clientSecret, onClose, onSuccess }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const sessionRef = useRef<OnrampSession | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const hasTriggeredSuccess = useRef(false);
    const { resolvedTheme } = useTheme();

    const handleSessionUpdate = useCallback(
      (event: { payload: { session: StripeOnrampSessionData } }) => {
        const session = event.payload.session;
        const status = session.status;

        // Trigger success on fulfillment_processing (payment complete, crypto delivery in progress)
        // or fulfillment_complete (crypto delivered)
        // Use ref to prevent double-triggering
        if (
          (status === "fulfillment_processing" || status === "fulfillment_complete") &&
          !hasTriggeredSuccess.current
        ) {
          hasTriggeredSuccess.current = true;
          onSuccess?.(session);
        }
      },
      [onSuccess]
    );

    // Reset success trigger when a new session starts
    useEffect(() => {
      hasTriggeredSuccess.current = false;
    }, [clientSecret]);

    useEffect(() => {
      let mounted = true;

      const handleLoaded = () => {
        if (mounted) {
          setIsLoading(false);
        }
      };

      const initializeOnramp = async () => {
        if (!containerRef.current || !clientSecret) return;

        try {
          if (!envVars.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) {
            throw new Error("Stripe publishable key is not configured");
          }

          const stripeOnramp = await loadStripeOnramp(envVars.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);

          if (!stripeOnramp || !mounted) return;

          const session = stripeOnramp.createSession({
            clientSecret,
            appearance: {
              theme: resolvedTheme === "light" ? "light" : "dark",
            },
          });

          session.addEventListener("onramp_ui_loaded", handleLoaded);
          session.addEventListener("onramp_session_updated", handleSessionUpdate);

          session.mount(containerRef.current);
          sessionRef.current = session;
        } catch (err) {
          // Log detailed error for debugging
          console.error("[StripeOnrampEmbed] Initialization failed:", err);
          errorManager(
            "Failed to initialize Stripe Onramp",
            err instanceof Error ? err : new Error(String(err)),
            { component: "StripeOnrampEmbed" }
          );
          if (mounted) {
            setError("Unable to load payment form. Please disable ad blockers or try again.");
            setIsLoading(false);
          }
        }
      };

      initializeOnramp();

      return () => {
        mounted = false;
        const session = sessionRef.current;
        if (session) {
          session.removeEventListener("onramp_ui_loaded", handleLoaded);
          session.removeEventListener("onramp_session_updated", handleSessionUpdate);
        }
      };
      // Note: resolvedTheme intentionally excluded to prevent re-initialization on theme change.
      // Users can close and reopen the modal to get theme updates.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [clientSecret, handleSessionUpdate]);

    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
        role="dialog"
        aria-modal="true"
        aria-labelledby="stripe-onramp-title"
      >
        <div className="relative w-full max-w-md mx-4 bg-white dark:bg-zinc-900 rounded-xl shadow-2xl overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-zinc-700">
            <h3
              id="stripe-onramp-title"
              className="text-lg font-semibold text-gray-900 dark:text-white"
            >
              Complete Purchase
            </h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="relative min-h-[500px]">
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-white dark:bg-zinc-900 z-10">
                <Loader2 className="h-8 w-8 animate-spin text-brand-blue" />
              </div>
            )}

            {error && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-white dark:bg-zinc-900 z-10 p-6 text-center">
                <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
                <p className="text-gray-700 dark:text-gray-300 mb-4">{error}</p>
                <Button onClick={onClose} variant="outline">
                  Close
                </Button>
              </div>
            )}

            <div ref={containerRef} className="w-full h-full min-h-[500px]" />
          </div>
        </div>
      </div>
    );
  }
);

StripeOnrampEmbed.displayName = "StripeOnrampEmbed";
