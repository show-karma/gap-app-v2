"use client";

import { usePrivy } from "@privy-io/react-auth";
import React, { useCallback, useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useCreateOnrampUrl } from "@/hooks/donation/useCreateOnrampUrl";
import type { FiatOnrampModalProps } from "./types";

export const FiatOnrampModal = React.memo<FiatOnrampModalProps>(
  ({ isOpen, onClose, project, fiatAmount }) => {
    const { mutateAsync: createOnrampUrl, isPending } = useCreateOnrampUrl();
    const { user } = usePrivy();
    const [onrampUrl, setOnrampUrl] = useState<string | null>(null);

    useEffect(() => {
      if (isOpen && !onrampUrl && user?.wallet?.address) {
        const initOnramp = async () => {
          try {
            const result = await createOnrampUrl({
              projectId: project.uid,
              payoutAddress: project.payoutAddress,
              fiatAmount,
              fiatCurrency: "USD",
              targetToken: "ETH",
              network: 1,
              userEmail: user?.email?.address,
            });

            setOnrampUrl(result.url);
          } catch (error) {
            // Error creating onramp session - modal will remain in loading state
          }
        };
        initOnramp();
      }
    }, [
      isOpen,
      onrampUrl,
      createOnrampUrl,
      project,
      fiatAmount,
      user?.wallet?.address,
      user?.email?.address,
    ]);

    useEffect(() => {
      if (onrampUrl && isOpen) {
        window.open(onrampUrl, '_blank');

        onClose();
      }
    }, [onrampUrl, isOpen, onClose]);

    const handleClose = useCallback(() => {
      setOnrampUrl(null);
      onClose();
    }, [onClose]);

    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-2xl h-[80vh]">
          <DialogHeader>
            <DialogTitle>
              Complete Your Donation to {project.title}
            </DialogTitle>
            <DialogDescription>
              You will be redirected to Stripe to purchase ETH with your credit or debit card
            </DialogDescription>
          </DialogHeader>

          {isPending && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                <p>Setting up your crypto purchase...</p>
              </div>
            </div>
          )}

          {!isPending && onrampUrl && (
            <div className="flex flex-col items-center justify-center h-full space-y-4">
              <div className="text-center">
                <h3 className="text-lg font-semibold mb-2">Redirecting to Stripe...</h3>
                <p className="text-gray-600">
                  You will be redirected to complete your crypto purchase.
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  If the page does not open, please{" "}
                  <a
                    href={onrampUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    click here
                  </a>
                  .
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    );
  },
);

FiatOnrampModal.displayName = "FiatOnrampModal";
