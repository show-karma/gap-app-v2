export default function SafeDisburseLoading() {
  return (
    <div className="mx-auto max-w-4xl py-8">
      <div className="mt-8 space-y-4 rounded-lg border border-gray-200 p-6 dark:border-zinc-700">
        <div className="h-6 w-48 animate-pulse rounded bg-gray-200 dark:bg-zinc-700" />
        <div className="h-10 w-full animate-pulse rounded bg-gray-200 dark:bg-zinc-700" />
        <div className="h-10 w-full animate-pulse rounded bg-gray-200 dark:bg-zinc-700" />
        <div className="h-24 w-full animate-pulse rounded bg-gray-200 dark:bg-zinc-700" />
      </div>
    </div>
  );
}
