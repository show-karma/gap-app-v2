"use client";

import { DonorResearchError } from "@/src/features/donor-research/components/common/DonorResearchError";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <DonorResearchError error={error} reset={reset} />;
}
