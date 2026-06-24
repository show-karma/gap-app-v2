import { CardListSkeleton } from "@/components/Pages/Communities/Loading";

export default function Loading() {
  return (
    <div className="flex w-full items-center justify-center px-6 py-2">
      <CardListSkeleton />
    </div>
  );
}
