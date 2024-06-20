import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";
import { useState, useEffect } from "react";
import { Button } from "@/components/Utilities/Button";
import { ArrowPathIcon } from "@heroicons/react/24/solid";
import { Card, LineChart, Title } from "@tremor/react";

export function GlobalCount() {
  const [stats, setStats] = useState<any>([]);
  const [error, setError] = useState<any>("");
  const [loading, setLoading] = useState<boolean>(true);

  async function fetchStats() {
    setLoading(true);
    try {
      const [data, error]: any = await fetchData(INDEXER.GAP.GLOBAL_COUNT);
      if (error) {
        console.error("Error fetching data:", error);
      } else {
        if (data) {
          const total = data.reduce((acc: number, item: any) => {
            return acc + item.count;
          }, 0);
          setStats([
            ...data.sort((a: any, b: any) => b.count - a.count),
            { _id: "Total", count: total },
          ]);
          setError("");
        } else {
          console.error("No stats found");
          setError("No stats found");
        }
      }
    } catch (error) {
      console.error("Error fetching stats:", error);
      setError(error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchStats();
  }, []);

  return (
    <div className="container mx-auto sm:px-0 lg:px-20 w-full flex-col items-center justify-center">
      <Card className="min-w-[400px]">
        <div className="flex justify-between items-center mb-2 pb-2 border-b-2 border-zinc-300">
          <Title className="flex flex-row flex-wrap items-center gap-2">
            Global Attestations Stats
          </Title>
          <Button onClick={fetchStats} className="bg-zinc-400">
            <ArrowPathIcon className="h-5 w-5" />
          </Button>
        </div>
        {loading && !stats ? (
          <div>Loading stats...</div>
        ) : error && !stats ? (
          <div className="font-bold">Error fetching stats</div>
        ) : (
          <div className="grid grid-cols-6 gap-4">
            {stats.map((item: any) => (
              <div className="mx-1" key={item._id as any}>
                <p>{item._id}</p>
                <p className="text-blue-500 font-bold text-xl">
                  {item.count as any}
                </p>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
