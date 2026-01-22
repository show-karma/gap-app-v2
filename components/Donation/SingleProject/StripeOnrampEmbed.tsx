"use client";

import type { OnrampSession } from "@stripe/crypto";
import { loadStripeOnramp } from "@stripe/crypto";
import { Loader2, X } from "lucide-react";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { envVars } from "@/utilities/enviromentVars";

interface StripeOnrampEmbedProps {
  clientSecret: string;
  onClose: () => void;
  onSuccess?: () => void;
}

export const StripeOnrampEmbed = React.memo<StripeOnrampEmbedProps>(
  ({ clientSecret, onClose, onSuccess }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const sessionRef = useRef<OnrampSession | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const handleSessionUpdate = useCallback(
      (event: { payload: { session: { status: string } } }) => {
        const status = event.payload.session.status;

        if (status === "fulfillment_complete") {
          onSuccess?.();
        }
      },
      [onSuccess]
    );

    useEffect(() => {
      let mounted = true;

      const initializeOnramp = async () => {
        if (!containerRef.current || !clientSecret) return;

        try {
          const stripeOnramp = await loadStripeOnramp(envVars.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);

          if (!stripeOnramp || !mounted) return;

          const session = stripeOnramp.createSession({
            clientSecret,
            appearance: {
              theme: "dark",
            },
          });

          session.addEventListener("onramp_ui_loaded", () => {
            if (mounted) {
              setIsLoading(false);
            }
          });

          session.addEventListener("onramp_session_updated", handleSessionUpdate);

          session.mount(containerRef.current);
          sessionRef.current = session;
        } catch (error) {
          console.error("Failed to initialize Stripe Onramp:", error);
          setIsLoading(false);
        }
      };

      initializeOnramp();

      return () => {
        mounted = false;
      };
    }, [clientSecret, handleSessionUpdate]);

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="relative w-full max-w-md mx-4 bg-white dark:bg-zinc-900 rounded-xl shadow-2xl overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-zinc-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Complete Purchase
            </h3>
            <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0">
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="relative min-h-[500px]">
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-white dark:bg-zinc-900 z-10">
                <Loader2 className="h-8 w-8 animate-spin text-brand-blue" />
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
