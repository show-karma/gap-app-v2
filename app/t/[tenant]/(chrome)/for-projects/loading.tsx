import { LiveFundingOpportunitiesSkeleton } from "@/src/features/homepage/components/live-funding-opportunities-skeleton";

export default function Loading() {
  return (
    <main className="flex w-full flex-col flex-1 items-center bg-background">
      <div className="flex w-full max-w-[1920px] justify-center items-center flex-1 flex-col gap-2 py-24">
        <LiveFundingOpportunitiesSkeleton />
      </div>
    </main>
  );
}
