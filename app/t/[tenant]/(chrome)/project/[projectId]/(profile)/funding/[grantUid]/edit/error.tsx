"use client";

import { RouteErrorFallback } from "@/components/Utilities/RouteErrorFallback";

export default function EditGrantError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <RouteErrorFallback error={error} reset={reset} sectionName="grant editing" />;
}
