export default function ScanDetailLoading() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-12">
      <output
        className="flex animate-pulse flex-col gap-4 rounded-3xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900"
        aria-busy="true"
        aria-label="Loading scan detail"
      >
        <div className="h-16 w-1/2 rounded-2xl bg-zinc-200 dark:bg-zinc-800" />
        <div className="h-2 w-full rounded-full bg-zinc-200 dark:bg-zinc-800" />
        <div className="h-2 w-full rounded-full bg-zinc-200 dark:bg-zinc-800" />
      </output>
    </main>
  );
}
