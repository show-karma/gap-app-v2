export default function DeepResearchLoading() {
  return (
    <main className="flex w-full min-h-screen items-center justify-center bg-background">
      <output className="flex flex-col items-center gap-2">
        <div
          className="h-10 w-10 animate-spin rounded-full border-2 border-border border-t-primary"
          aria-hidden="true"
        />
        <span className="sr-only">Loading deep research page</span>
      </output>
    </main>
  );
}
