"use client";

import { RouteErrorFallback } from "@/components/Utilities/RouteErrorFallback";

export default function DashboardModuleError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <RouteErrorFallback error={error} reset={reset} sectionName="this dashboard section" />;
}
