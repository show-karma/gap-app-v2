"use client";

import { Button } from "@/components/Utilities/Button";
import { errorManager } from "@/components/Utilities/errorManager";
import { Spinner } from "@/components/Utilities/Spinner";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";
import { TrashIcon } from "@heroicons/react/24/outline";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { z } from "zod";

const UNIT_TYPES = ["string", "float", "int"] as const;
type UnitType = (typeof UNIT_TYPES)[number];

interface Indicator {
  id: string;
  name: string;
  description: string;
  unitType: UnitType;
}

const indicatorSchema = z.object({
  name: z
    .string()
    .min(3, { message: "Name must be at least 3 characters long" })
    .max(50, { message: "Name must be less than 50 characters" }),
  description: z
    .string()
    .min(10, { message: "Description must be at least 10 characters long" })
    .max(500, { message: "Description must be less than 500 characters" }),
  unitType: z.enum(UNIT_TYPES),
});

type IndicatorFormData = z.infer<typeof indicatorSchema>;

interface IndicatorsHubProps {
  communityId: string;
}

export const IndicatorsHub = ({ communityId }: IndicatorsHubProps) => {
  const [indicators, setIndicators] = useState<Indicator[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<IndicatorFormData>({
    resolver: zodResolver(indicatorSchema),
  });

  useEffect(() => {
    const fetchIndicators = async () => {
      try {
        const [data, error] = await fetchData(
          INDEXER.COMMUNITY.INDICATORS.LIST(communityId)
        );
        if (error) throw error;
        setIndicators(data || []);
      } catch (error) {
        errorManager("Failed to fetch indicators", error);
        toast.error("Failed to fetch indicators");
      } finally {
        setIsFetching(false);
      }
    };

    fetchIndicators();
  }, [communityId]);

  const onSubmit = async (data: IndicatorFormData) => {
    setIsLoading(true);
    try {
      const [response, error] = await fetchData(
        INDEXER.COMMUNITY.INDICATORS.CREATE(communityId),
        "POST",
        data
      );
      if (error) throw error;

      setIndicators((prev) => [...prev, { id: response.id, ...data }]);
      toast.success("Indicator created successfully");
      reset();
    } catch (error) {
      errorManager("Failed to create indicator", error);
      toast.error("Failed to create indicator");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const [, error] = await fetchData(
        INDEXER.COMMUNITY.INDICATORS.DELETE(communityId, id),
        "DELETE"
      );
      if (error) throw error;

      setIndicators((prev) => prev.filter((ind) => ind.id !== id));
      toast.success("Indicator deleted successfully");
    } catch (error) {
      errorManager("Failed to delete indicator", error);
      toast.error("Failed to delete indicator");
    }
  };

  return (
    <div className="w-full">
      <div className="bg-white dark:bg-zinc-800 rounded-lg p-6 mb-8">
        <h3 className="text-lg font-semibold mb-4">Create New Indicator</h3>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Name</label>
            <input
              {...register("name")}
              className="w-full p-2 border rounded-md bg-gray-50 dark:bg-zinc-900 border-gray-200 dark:border-zinc-700"
              placeholder="Enter indicator name"
            />
            {errors.name && (
              <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Description
            </label>
            <textarea
              {...register("description")}
              className="w-full p-2 border rounded-md bg-gray-50 dark:bg-zinc-900 border-gray-200 dark:border-zinc-700"
              placeholder="Enter indicator description"
              rows={3}
            />
            {errors.description && (
              <p className="text-red-500 text-sm mt-1">
                {errors.description.message}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Unit Type</label>
            <select
              {...register("unitType")}
              className="w-full p-2 border rounded-md bg-gray-50 dark:bg-zinc-900 border-gray-200 dark:border-zinc-700"
            >
              {UNIT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </option>
              ))}
            </select>
            {errors.unitType && (
              <p className="text-red-500 text-sm mt-1">
                {errors.unitType.message}
              </p>
            )}
          </div>

          <Button
            type="submit"
            disabled={isLoading}
            isLoading={isLoading}
            className="w-full"
          >
            Create Indicator
          </Button>
        </form>
      </div>

      <div className="bg-white dark:bg-zinc-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Existing Indicators</h3>
        <div className="space-y-4">
          {isFetching ? (
            <div className="flex justify-center py-8">
              <Spinner />
            </div>
          ) : indicators.length ? (
            indicators.map((indicator) => (
              <div
                key={indicator.id}
                className="flex items-center justify-between p-4 bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-md"
              >
                <div className="flex-1">
                  <h3 className="font-medium">{indicator.name}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {indicator.description}
                  </p>
                  <span className="text-xs bg-white dark:bg-zinc-800 px-2 py-1 rounded-full border border-gray-200 dark:border-zinc-700 mt-2 inline-block">
                    {indicator.unitType}
                  </span>
                </div>
                <button
                  onClick={() => handleDelete(indicator.id)}
                  className="text-red-500 hover:text-red-700 transition-colors p-2"
                  aria-label="Delete indicator"
                >
                  <TrashIcon className="h-5 w-5" />
                </button>
              </div>
            ))
          ) : (
            <p className="text-gray-500 dark:text-gray-400 text-center py-4">
              No indicators created yet
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
