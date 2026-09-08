"use client";

import { AskKarmaError } from "@/src/features/ask-karma/components/ask-karma-error";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function CommunityAskKarmaRouteError({ error, reset }: ErrorProps) {
  return <AskKarmaError error={error} reset={reset} errorLabel="Community ask-karma page error" />;
}
