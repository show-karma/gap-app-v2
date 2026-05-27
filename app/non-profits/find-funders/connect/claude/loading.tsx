export default function ConnectClaudeLoading() {
  return (
    <main className="flex w-full min-h-[60vh] items-center justify-center">
      <output aria-live="polite" aria-busy="true" className="flex items-center justify-center">
        <span
          className="h-10 w-10 animate-spin rounded-full border-2 border-border border-t-primary"
          aria-hidden="true"
        />
        <span className="sr-only">Loading Claude setup guide...</span>
      </output>
    </main>
  );
}
