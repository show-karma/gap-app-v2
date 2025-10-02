"use client";
import React, { Component, ErrorInfo, ReactNode } from "react";
import { useDonationCart } from "@/store/donationCart";
import { getDetailedErrorInfo } from "@/utilities/donations/errorMessages";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Error boundary for donation flow
 * Catches React errors, preserves cart state, and provides recovery options
 *
 * Note: Error boundaries must be class components as of React 18
 */
class DonationErrorBoundaryClass extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error to console (prepare for Sentry integration later)
    console.error("DonationErrorBoundary caught an error:", error, errorInfo);

    // Store error info in state
    this.setState({
      error,
      errorInfo,
    });

    // Preserve cart state in localStorage (it's already persisted by Zustand)
    try {
      localStorage.getItem("donation-cart-storage");
    } catch (e) {
      console.error("Failed to preserve cart state:", e);
    }
  }

  handleTryAgain = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleClearCart = () => {
    // Clear cart state
    try {
      localStorage.removeItem("donation-cart-storage");
    } catch (e) {
      console.error("Failed to clear cart:", e);
    }

    // Reset error state and reload
    window.location.href = window.location.pathname;
  };

  render() {
    if (this.state.hasError && this.state.error) {
      const parsedError = getDetailedErrorInfo(this.state.error);

      return (
        <div className="mx-auto max-w-3xl px-4 py-12">
          <div className="rounded-2xl border-2 border-red-200 bg-white p-8 shadow-lg dark:border-red-900/40 dark:bg-zinc-950">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
                <svg
                  className="h-6 w-6 text-red-600 dark:text-red-400"
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
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  Something went wrong
                </h1>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                  Don't worry - your donation cart has been saved
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-xl bg-red-50 p-4 dark:bg-red-900/20">
                <h2 className="mb-2 text-sm font-semibold text-red-900 dark:text-red-200">
                  Error Details
                </h2>
                <p className="text-sm text-red-800 dark:text-red-300">
                  {parsedError.message}
                </p>
              </div>

              {parsedError.actionableSteps.length > 0 && (
                <div className="rounded-xl bg-blue-50 p-4 dark:bg-blue-900/20">
                  <h2 className="mb-2 text-sm font-semibold text-blue-900 dark:text-blue-200">
                    What you can do
                  </h2>
                  <ul className="space-y-1 text-sm text-blue-800 dark:text-blue-300">
                    {parsedError.actionableSteps.map((step, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <span className="mt-0.5 text-blue-500">•</span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {parsedError.technicalMessage && (
                <details className="rounded-xl bg-gray-50 p-4 dark:bg-gray-900/50">
                  <summary className="cursor-pointer text-sm font-medium text-gray-700 dark:text-gray-300">
                    Technical Details
                  </summary>
                  <pre className="mt-2 overflow-x-auto text-xs text-gray-600 dark:text-gray-400">
                    {parsedError.technicalMessage}
                  </pre>
                  {this.state.errorInfo && (
                    <pre className="mt-2 overflow-x-auto text-xs text-gray-600 dark:text-gray-400">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  )}
                </details>
              )}
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button
                onClick={this.handleTryAgain}
                className="flex-1 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
              >
                Try Again
              </button>
              <button
                onClick={this.handleClearCart}
                className="flex-1 rounded-xl border-2 border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-zinc-900 dark:text-gray-300 dark:hover:bg-zinc-800"
              >
                Clear Cart and Start Over
              </button>
            </div>

            <div className="mt-4 text-center">
              <a
                href="/"
                className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
              >
                Return to Home
              </a>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Wrapper component to provide access to Zustand store
 * Error boundaries can't use hooks, so we wrap it
 */
export function DonationErrorBoundary({ children }: Props) {
  return <DonationErrorBoundaryClass>{children}</DonationErrorBoundaryClass>;
}
