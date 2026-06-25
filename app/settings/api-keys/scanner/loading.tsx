export default function ScannerApiKeysLoading() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-12">
      <output
        className="flex animate-pulse flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900"
        aria-busy="true"
        aria-label="Loading API keys"
      >
        <div className="h-5 w-1/3 rounded bg-zinc-200 dark:bg-zinc-800" />
        <div className="h-5 w-2/3 rounded bg-zinc-200 dark:bg-zinc-800" />
      </output>
    </main>
  );
}
