"use client";
import { ArrowPathIcon } from "@heroicons/react/24/solid";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/Utilities/Button";
import { errorManager } from "@/components/Utilities/errorManager";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";

interface GlobalStat {
  _id: string;
  count: number;
}

export function GlobalCount() {
  const {
    data: stats = [],
    isLoading,
    isError,
    refetch,
    isFetching,
  } = useQuery<GlobalStat[]>({
    queryKey: ["global-stats"],
    queryFn: async () => {
      const [data, error] = await fetchData(INDEXER.GAP.GLOBAL_COUNT);

      if (error) {
        errorManager("Error fetching stats", error);
        throw new Error("Error fetching data");
      }

      if (!data) {
        throw new Error("No stats found");
      }

      const total = data.reduce((acc: number, item: GlobalStat) => acc + item.count, 0);

      return [
        ...data.sort((a: GlobalStat, b: GlobalStat) => b.count - a.count),
        { _id: "Total", count: total },
      ];
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  return (
    <div className="container mx-auto sm:px-0 lg:px-20 w-full flex-col items-center justify-center">
      <div className="min-w-[400px]">
        <div className="flex justify-between items-center mb-2 pb-2 border-b-2 border-zinc-300">
          <h1 className="flex flex-row flex-wrap items-center gap-2">Global Attestations Stats</h1>
          <Button onClick={() => refetch()} className="bg-zinc-400" disabled={isFetching}>
            <ArrowPathIcon className={`h-5 w-5 ${isFetching ? "animate-spin" : ""}`} />
          </Button>
        </div>
        {isLoading ? (
          <div>Loading stats...</div>
        ) : isError ? (
          <div className="font-bold">Error fetching stats</div>
        ) : (
          <div className="grid md:grid-cols-6 gap-4 sm:grid-cols-3">
            {stats.map((item) => (
              <div className="mx-1" key={item._id}>
                <p>{item._id}</p>
                <p className="text-blue-500 font-bold text-xl">{item.count}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
