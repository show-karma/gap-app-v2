"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ClaimFundsErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(_error: Error, _errorInfo: ErrorInfo) {
    // Error is already captured in state
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <section className="flex flex-col items-center justify-center gap-4 py-8 md:py-10 min-h-[60vh]">
          <h1 className="text-2xl font-bold text-destructive">Something went wrong</h1>
          <p className="text-muted-foreground text-center max-w-md">
            An unexpected error occurred while loading the claim funds page.
          </p>
          {this.state.error && (
            <p className="text-sm text-muted-foreground font-mono">
              {this.state.error.message?.slice(0, 200) || "Unknown error"}
            </p>
          )}
          <Button onClick={this.handleRetry} className="mt-4">
            Try Again
          </Button>
        </section>
      );
    }

    return this.props.children;
  }
}
