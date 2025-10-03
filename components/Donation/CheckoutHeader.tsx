"use client";

interface CheckoutHeaderProps {
  communityId?: string;
  totalItems: number;
  onClear: () => void;
}

export function CheckoutHeader({
  communityId,
  totalItems,
  onClear,
}: CheckoutHeaderProps) {
  return (
    <div className="mb-4 -mt-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-bold tracking-tight text-gray-900 dark:text-white ml-2">
            Donation Checkout
          </h1>
        </div>
        <button
          onClick={onClear}
          className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-2.5 py-1.5 text-xs font-medium text-red-600 shadow-sm transition hover:bg-red-50 hover:border-red-300 dark:border-red-800 dark:bg-gray-800 dark:text-red-400 dark:hover:bg-red-900/20"
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M3 6h18l-2 13H5L3 6z" />
            <path d="M8 21h8" />
          </svg>
          Clear cart
        </button>
      </div>
    </div>
  );
}
