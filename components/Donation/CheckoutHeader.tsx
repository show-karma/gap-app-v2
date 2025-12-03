"use client";

import { useRouter } from "next/navigation";

interface CheckoutHeaderProps {
  communityId?: string;
  totalItems: number;
  onClear: () => void;
}

export function CheckoutHeader({ onClear }: CheckoutHeaderProps) {
  const router = useRouter();
  return (
    <div className="mb-4 -mt-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-bold tracking-tight text-gray-900 dark:text-white ml-2">
            Donation Checkout
          </h1>
        </div>
        <div className="gap-4 flex flex-row flex-wrap">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2.5 rounded font-semibold flex items-center justify-center border border-brand-blue text-sm text-brand-blue"
          >
            Continue exploring
          </button>
          <button
            data-testid="clear-cart"
            onClick={onClear}
            className="px-4 py-2.5 rounded font-semibold flex items-center justify-center border border-red-600 text-sm text-red-600"
          >
            Clear cart
          </button>
        </div>
      </div>
    </div>
  );
}
