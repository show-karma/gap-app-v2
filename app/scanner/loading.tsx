export default function ScannerLoading() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-12 sm:py-16">
      <output
        className="flex animate-pulse flex-col gap-4"
        aria-label="Loading scanner"
        aria-busy="true"
      >
        <div className="h-10 w-3/4 rounded-md bg-zinc-200 dark:bg-zinc-800" />
        <div className="h-4 w-full rounded-md bg-zinc-200 dark:bg-zinc-800" />
        <div className="h-4 w-5/6 rounded-md bg-zinc-200 dark:bg-zinc-800" />
        <div className="mt-4 h-32 w-full rounded-3xl bg-zinc-200 dark:bg-zinc-800" />
      </output>
    </main>
  );
}
