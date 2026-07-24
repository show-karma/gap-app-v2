"use client";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorBoundary({ error, reset }: ErrorProps) {
  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-4 px-4 py-12 text-center">
      <h1 className="text-2xl font-semibold text-foreground">Couldn't load agent actions</h1>
      <p className="text-sm text-muted-foreground">
        Something went wrong while loading this page. Please try again.
      </p>
      {error.digest ? (
        <p className="text-xs text-muted-foreground">Error ID: {error.digest}</p>
      ) : null}
      <div>
        <button
          type="button"
          onClick={reset}
          className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
        >
          Try again
        </button>
      </div>
    </main>
  );
}
