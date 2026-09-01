import { DonationHistorySkeleton } from "./components/DonationHistoryList";

export default function DonationsLoading() {
  return (
    <div className="container mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-semibold dark:text-zinc-100">My Donations</h1>
      <div className="mb-6 flex gap-3">
        <div className="flex items-center gap-2 rounded-md bg-gray-100 px-3 py-1.5 dark:bg-zinc-800">
          <div className="h-4 w-16 animate-pulse rounded bg-gray-200 dark:bg-zinc-700" />
        </div>
        <div className="flex items-center gap-2 rounded-md bg-gray-100 px-3 py-1.5 dark:bg-zinc-800">
          <div className="h-4 w-16 animate-pulse rounded bg-gray-200 dark:bg-zinc-700" />
        </div>
      </div>
      <DonationHistorySkeleton />
    </div>
  );
}
