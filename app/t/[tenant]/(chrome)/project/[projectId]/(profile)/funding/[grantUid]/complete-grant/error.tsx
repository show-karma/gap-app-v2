"use client";

import { RouteErrorFallback } from "@/components/Utilities/RouteErrorFallback";

export default function CompleteGrantError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <RouteErrorFallback error={error} reset={reset} sectionName="grant completion" />;
}
