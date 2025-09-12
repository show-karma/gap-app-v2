"use client";
import Link from "next/link";
import { useDonationCart } from "@/store";
import { ProfilePicture } from "./Utilities/ProfilePicture";
import { PAGES } from "@/utilities/pages";
import { useRouter } from "next/navigation";

export default function DonationCheckout() {
  const { items, amounts, setAmount, remove, clear } = useDonationCart();
  const router = useRouter();

  if (!items.length) {
    return (
      <div className="flex flex-col items-center gap-6 py-16">
        <div className="bg-gray-50 dark:bg-gray-800 rounded-full p-6">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gray-400 dark:text-gray-500">
            <path d="M3 6h18l-2 13H5L3 6z"/>
            <path d="M8 21h8"/>
          </svg>
        </div>
        <div className="text-center">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">Your cart is empty</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">Add some projects to your donation cart to get started</p>
          <button
            onClick={() => router.back()}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
          >
            Browse Projects
          </button>
        </div>
      </div>
    );
  }

  const totalItems = items.length;
  const hasAmounts = Object.values(amounts).some(amount => amount && parseFloat(amount) > 0);

  return (
    <div className="flex flex-col gap-8 w-full max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Donation Cart</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {totalItems} {totalItems === 1 ? 'project' : 'projects'} selected for donation
          </p>
        </div>
        <button
          onClick={clear}
          className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 font-medium text-sm transition-colors"
        >
          Clear all
        </button>
      </div>

      {/* Cart Items */}
      <div className="space-y-4">
        {items.map((item, index) => (
          <div 
            key={item.uid} 
            className="group relative bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-6 hover:shadow-lg transition-all duration-200"
          >
            <div className="flex items-start gap-4">
              <div className="flex items-center gap-4 flex-1 min-w-0">
                <ProfilePicture
                  imageURL={item.imageURL}
                  name={item.title}
                  size="56"
                  className="h-14 w-14 min-h-14 min-w-14 border border-gray-200 dark:border-gray-700 shadow-sm"
                  alt={item.title}
                />
                <div className="flex-1 min-w-0">
                  <Link
                    href={PAGES.PROJECT.OVERVIEW(item.slug || item.uid)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group inline-block"
                  >
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">
                      {item.title}
                    </h3>
                  </Link>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Project #{index + 1}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex flex-col items-end gap-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Amount (ETH)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.001"
                    value={amounts[item.uid] ?? ""}
                    onChange={(e) => setAmount(item.uid, e.target.value)}
                    placeholder="0.000"
                    className="w-32 text-right rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                <button
                  onClick={() => remove(item.uid)}
                  className="p-2 text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-950 rounded-lg transition-colors"
                  aria-label={`Remove ${item.title} from cart`}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 6h18"/>
                    <path d="m19 6-2 14H7L5 6"/>
                    <path d="m10 11v6"/>
                    <path d="m14 11v6"/>
                  </svg>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between pt-6 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 font-medium transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="m15 18-6-6 6-6"/>
          </svg>
          Continue Shopping
        </button>
        
        <button
          type="button"
          disabled={!hasAmounts}
          className={`px-8 py-3 rounded-lg font-semibold transition-all duration-200 ${
            hasAmounts
              ? "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
              : "bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed"
          }`}
          onClick={() => {
            // No donate logic for now
            console.log("Donate clicked", { items, amounts });
          }}
        >
          {hasAmounts ? "Proceed to Donate" : "Enter donation amounts"}
        </button>
      </div>
    </div>
  );
}
