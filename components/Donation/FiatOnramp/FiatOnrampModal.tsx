'use client';

import React, { useCallback, useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { useCreateOnrampUrl } from '@/hooks/donation/useCreateOnrampUrl';
import type { FiatOnrampModalProps } from './types';

export const FiatOnrampModal = React.memo<FiatOnrampModalProps>(
  ({ isOpen, onClose, project, fiatAmount }) => {
    const { mutateAsync: createOnrampUrl, isPending } = useCreateOnrampUrl();
    const [onrampUrl, setOnrampUrl] = useState<string | null>(null);

    useEffect(() => {
      if (isOpen && !onrampUrl) {
        const initOnramp = async () => {
          try {
            const result = await createOnrampUrl({
              projectId: project.uid,
              payoutAddress: project.payoutAddress,
              fiatAmount,
              fiatCurrency: 'USD',
              targetToken: 'USDC',
              network: 1,
              redirectUrl: window.location.href
            });
            setOnrampUrl(result.url);
          } catch (error) {
            console.error('Failed to create onramp URL:', error);
          }
        };
        initOnramp();
      }
    }, [isOpen, onrampUrl, createOnrampUrl, project, fiatAmount]);

    const handleClose = useCallback(() => {
      setOnrampUrl(null);
      onClose();
    }, [onClose]);

    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-2xl h-[80vh]">
          <DialogHeader>
            <DialogTitle>Complete Your Donation to {project.title}</DialogTitle>
          </DialogHeader>

          {isPending && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                <p>Loading payment gateway...</p>
              </div>
            </div>
          )}

          {onrampUrl && !isPending && (
            <iframe
              src={onrampUrl}
              allow="accelerometer; autoplay; camera; gyroscope; payment"
              className="w-full h-full border-0 rounded-lg"
              title="Stripe Onramp"
            />
          )}
        </DialogContent>
      </Dialog>
    );
  }
);

FiatOnrampModal.displayName = 'FiatOnrampModal';
