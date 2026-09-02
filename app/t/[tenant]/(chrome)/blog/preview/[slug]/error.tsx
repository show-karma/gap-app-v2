"use client";

import { RouteErrorFallback } from "@/components/Utilities/RouteErrorFallback";

export default function BlogPreviewError({
  error,
  reset,
}: {
  readonly error: Error & { digest?: string };
  readonly reset: () => void;
}) {
  return <RouteErrorFallback error={error} reset={reset} sectionName="blog preview" />;
}
