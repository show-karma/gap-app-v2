"use client";

import { Button } from "@/components/ui/button";

export default function KarmaPanelsErrorBoundary({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="font-bold text-2xl text-foreground">Karma Panels failed to load</h1>
      <p className="mt-4 text-base text-muted-foreground">
        The authoring surface could not start. Nothing you wrote is stored, so reloading is safe.
      </p>
      <Button type="button" onClick={reset} className="mt-6">
        Try again
      </Button>
    </main>
  );
}
