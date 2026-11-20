"use client";

import { RouteErrorFallback } from "@/components/Utilities/RouteErrorFallback";

export default function ProgramFollowUpError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <RouteErrorFallback error={error} reset={reset} sectionName="follow-up activity" />;
}
