"use client";

import { memo } from "react";
import { Spinner } from "@/components/ui/spinner";

interface LoadingStateProps {
  message: string;
}

export const LoadingState = memo(function LoadingState({ message }: LoadingStateProps) {
  return (
    <output
      className="flex flex-col items-center justify-center gap-4 py-8 md:py-10 min-h-[60vh]"
      aria-live="polite"
      aria-busy="true"
    >
      <Spinner />
      <p className="text-muted-foreground">{message}</p>
    </output>
  );
});
