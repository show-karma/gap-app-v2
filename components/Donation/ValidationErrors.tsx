"use client";

interface CartItem {
  uid: string;
  title: string;
}

interface ValidationErrorsProps {
  validationErrors: string[];
  missingPayouts: string[];
  items: CartItem[];
}

/**
 * Enhanced validation errors component with actionable messaging
 * Displays clear error messages with specific guidance for users
 */
export function ValidationErrors({
  validationErrors,
  missingPayouts,
  items,
}: ValidationErrorsProps) {
  if (validationErrors.length === 0 && missingPayouts.length === 0) {
    return null;
  }

  // Parse validation errors to extract actionable information
  const parseValidationError = (error: string) => {
    // Check if it's an insufficient balance error
    if (error.includes("Insufficient") && error.includes("balance")) {
      const match = error.match(/Insufficient (.+?) balance\. Required: (.+?), Available: (.+)/);
      if (match) {
        const [, token, required, available] = match;
        return {
          type: "insufficient_balance",
          token,
          required,
          available,
          message: error,
        };
      }
    }

    // Check if it's a missing balance info error
    if (error.includes("No balance information available")) {
      const match = error.match(/No balance information available for (.+?) on (.+)/);
      if (match) {
        const [, token, chain] = match;
        return {
          type: "missing_balance_info",
          token,
          chain,
          message: error,
        };
      }
    }

    // Check if it's an invalid amount error
    if (error.includes("Invalid amount")) {
      return {
        type: "invalid_amount",
        message: error,
      };
    }

    return {
      type: "unknown",
      message: error,
    };
  };

  return (
    <div className="rounded-2xl border-2 border-red-200 bg-red-50/80 p-5 shadow-sm dark:border-red-900/40 dark:bg-red-900/20">
      <div className="mb-3 flex items-center gap-2">
        <svg
          className="h-5 w-5 text-red-600 dark:text-red-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
        <h3 className="text-sm font-semibold text-red-700 dark:text-red-200">
          Cannot process donation
        </h3>
      </div>

      <div className="space-y-3">
        {/* Missing payout addresses */}
        {missingPayouts.map((projectId) => {
          const project = items.find((item) => item.uid === projectId);
          return (
            <div
              key={`missing-${projectId}`}
              className="rounded-xl border border-red-300 bg-white/70 p-3 dark:border-red-800 dark:bg-red-950/20"
            >
              <div className="mb-1 text-sm font-semibold text-red-800 dark:text-red-200">
                {project?.title || "Project"}: Missing Payout Address
              </div>
              <div className="text-xs text-red-700 dark:text-red-300">
                This project hasn't configured a payout address. Donation is blocked for security.
              </div>
              <div className="mt-2 text-xs font-medium text-blue-700 dark:text-blue-300">
                What you can do:
              </div>
              <ul className="mt-1 space-y-0.5 text-xs text-red-700 dark:text-red-300">
                <li>• Contact the project owner to configure their payout address</li>
                <li>• Remove this project from your cart to proceed with other donations</li>
              </ul>
            </div>
          );
        })}

        {/* Validation errors with enhanced messaging */}
        {validationErrors.map((error, index) => {
          const parsed = parseValidationError(error);

          return (
            <div
              key={`validation-${index}`}
              className="rounded-xl border border-red-300 bg-white/70 p-3 dark:border-red-800 dark:bg-red-950/20"
            >
              <div className="mb-1 text-sm font-semibold text-red-800 dark:text-red-200">
                {parsed.type === "insufficient_balance" && "Insufficient Balance"}
                {parsed.type === "missing_balance_info" && "Balance Unavailable"}
                {parsed.type === "invalid_amount" && "Invalid Amount"}
                {parsed.type === "unknown" && "Validation Error"}
              </div>

              <div className="text-xs text-red-700 dark:text-red-300">{parsed.message}</div>

              {/* Actionable steps based on error type */}
              {parsed.type === "insufficient_balance" && (
                <>
                  <div className="mt-2 text-xs font-medium text-blue-700 dark:text-blue-300">
                    What you can do:
                  </div>
                  <ul className="mt-1 space-y-0.5 text-xs text-red-700 dark:text-red-300">
                    <li>• Add more {parsed.token} to your wallet</li>
                    <li>• Reduce the donation amount</li>
                    <li>• Select a different token</li>
                  </ul>
                </>
              )}

              {parsed.type === "missing_balance_info" && (
                <>
                  <div className="mt-2 text-xs font-medium text-blue-700 dark:text-blue-300">
                    What you can do:
                  </div>
                  <ul className="mt-1 space-y-0.5 text-xs text-red-700 dark:text-red-300">
                    <li>• Check your wallet directly for balance</li>
                    <li>• Refresh the page to retry fetching balances</li>
                    <li>• Ensure you're connected to the correct network</li>
                  </ul>
                </>
              )}

              {parsed.type === "invalid_amount" && (
                <>
                  <div className="mt-2 text-xs font-medium text-blue-700 dark:text-blue-300">
                    What you can do:
                  </div>
                  <ul className="mt-1 space-y-0.5 text-xs text-red-700 dark:text-red-300">
                    <li>• Enter a valid positive number</li>
                    <li>• Ensure the amount is greater than 0</li>
                  </ul>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
