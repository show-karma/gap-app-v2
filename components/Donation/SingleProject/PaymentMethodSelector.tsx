'use client';

import React, { useCallback } from 'react';
import type { PaymentMethodSelectorProps } from './types';
import { PaymentMethod } from '@/types/donations';

export const PaymentMethodSelector = React.memo<PaymentMethodSelectorProps>(
  ({ selected, onSelect }) => {
    const handleCryptoSelect = useCallback(() => {
      onSelect(PaymentMethod.CRYPTO);
    }, [onSelect]);

    const handleFiatSelect = useCallback(() => {
      onSelect(PaymentMethod.FIAT);
    }, [onSelect]);

    return (
      <div className="flex gap-4">
        <button
          type="button"
          onClick={handleCryptoSelect}
          className={`flex-1 p-4 rounded-lg border-2 transition-colors ${
            selected === PaymentMethod.CRYPTO
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-200'
          }`}
        >
          <div className="font-semibold">Pay with Crypto</div>
          <div className="text-sm text-gray-600">Use your wallet</div>
        </button>
        <button
          type="button"
          onClick={handleFiatSelect}
          className={`flex-1 p-4 rounded-lg border-2 transition-colors ${
            selected === PaymentMethod.FIAT
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-200'
          }`}
        >
          <div className="font-semibold">Pay with Card</div>
          <div className="text-sm text-gray-600">Credit or debit card</div>
        </button>
      </div>
    );
  }
);

PaymentMethodSelector.displayName = 'PaymentMethodSelector';
