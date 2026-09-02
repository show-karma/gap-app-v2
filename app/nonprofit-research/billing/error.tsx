"use client";

import { DonorResearchError } from "@/src/features/donor-research/components/common/DonorResearchError";

interface BillingErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function BillingError({ error, reset }: BillingErrorProps) {
  return <DonorResearchError error={error} reset={reset} />;
}
