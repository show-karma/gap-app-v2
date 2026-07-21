"use client";

import React, { Component, type ReactNode } from "react";
import { attemptChunkReload, isChunkLoadError } from "@/utilities/isChunkLoadError";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  // True while a one-time hard reload is in flight to recover from a
  // stale-deploy chunk failure. Renders a minimal "updating" state instead of
  // the error fallback so the user doesn't see a flash of the failure UI.
  recoveringChunk: boolean;
}

/**
 * Error Boundary component to catch and handle React errors gracefully
 * Prevents white screen of death and provides fallback UI
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, recoveringChunk: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error, recoveringChunk: isChunkLoadError(error) };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    // Stale-deploy recovery: a ChunkLoadError means hashed chunks were rotated
    // by a deploy. Force a one-time hard reload to fetch the fresh manifest
    // instead of showing a dead-end fallback. If the reload was already
    // attempted this session, fall back to the normal error UI (no loop).
    if (isChunkLoadError(error)) {
      if (attemptChunkReload()) {
        return;
      }
      this.setState({ recoveringChunk: false });
    }

    // Expose error on window for E2E test debugging
    if (typeof window !== "undefined") {
      (
        window as Window & { __LAST_ERROR_BOUNDARY__?: { message: string; stack?: string } }
      ).__LAST_ERROR_BOUNDARY__ = {
        message: error.message,
        stack: error.stack,
      };
    }

    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  render(): ReactNode {
    if (this.state.hasError) {
      // A stale-deploy chunk reload is in flight — render a minimal updating
      // state rather than the error fallback while the navigation happens.
      if (this.state.recoveringChunk) {
        return (
          <div
            className="p-4 rounded-lg bg-muted/50 border border-border text-sm text-muted-foreground"
            data-testid="error-boundary-chunk-recovering"
          >
            Updating to the latest version…
          </div>
        );
      }

      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI
      return (
        <div
          className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800"
          data-testid="error-boundary-fallback"
          data-error-message={this.state.error?.message}
        >
          <h3 className="text-sm font-medium text-red-800 dark:text-red-400 mb-2">
            Something went wrong
          </h3>
          <p className="text-sm text-red-700 dark:text-red-300">
            {this.state.error?.message || "An unexpected error occurred"}
          </p>
          <button
            type="button"
            onClick={() => this.setState({ hasError: false, error: null, recoveringChunk: false })}
            className="mt-3 text-sm text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200 underline"
          >
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
