"use client";

import { Button } from "@/components/Utilities/Button";
import { errorManager } from "@/components/Utilities/errorManager";
import { useIndicators } from "@/hooks/useIndicators";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";
import { TrashIcon } from "@heroicons/react/24/outline";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { z } from "zod";
import { DeleteDialog } from "@/components/DeleteDialog";

const UNIT_TYPES = ["float", "int"] as const;
type UnitType = (typeof UNIT_TYPES)[number];

interface Indicator {
  id: string;
  name: string;
  description: string;
  unitOfMeasure: UnitType;
}

const indicatorSchema = z.object({
  name: z
    .string()
    .min(3, { message: "Name must be at least 3 characters long" })
    .max(50, { message: "Name must be less than 50 characters" }),
  description: z
    .string()
    .min(1, { message: "Description is required" })
    .max(500, { message: "Description must be less than 500 characters" }),
  unitOfMeasure: z.enum(UNIT_TYPES),
});

type IndicatorFormData = z.infer<typeof indicatorSchema>;

interface IndicatorsHubProps {
  communityId: string;
}

export const IndicatorsHub = ({ communityId }: IndicatorsHubProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data: indicators = [], refetch } = useIndicators({
    communityId,
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<IndicatorFormData>({
    resolver: zodResolver(indicatorSchema),
  });

  const onSubmit = async (data: IndicatorFormData) => {
    setIsLoading(true);
    try {
      const [response, error] = await fetchData(
        INDEXER.COMMUNITY.INDICATORS.COMMUNITY.CREATE(communityId),
        "POST",
        data
      );
      if (error) throw error;

      refetch();
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
      setDeletingId(id);
      const [, error] = await fetchData(
        INDEXER.COMMUNITY.INDICATORS.COMMUNITY.DELETE(communityId),
        "DELETE",
        { indicatorId: id }
      );
      if (error) throw error;

      refetch();
      toast.success("Indicator deleted successfully");
    } catch (error) {
      errorManager("Failed to delete indicator", error);
      toast.error("Failed to delete indicator");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="w-full h-max max-h-full flex flex-col">
      <div className="bg-white dark:bg-zinc-800 rounded-lg p-6 mb-6">
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
              rows={2}
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
              {...register("unitOfMeasure")}
              className="w-full p-2 border rounded-md bg-gray-50 dark:bg-zinc-900 border-gray-200 dark:border-zinc-700"
            >
              {UNIT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </option>
              ))}
            </select>
            {errors.unitOfMeasure && (
              <p className="text-red-500 text-sm mt-1">
                {errors.unitOfMeasure.message}
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

      <div className="bg-white dark:bg-zinc-800 rounded-lg p-6 flex-1">
        <h3 className="text-lg font-semibold mb-4">Existing Indicators</h3>
        <div className="space-y-3 overflow-y-auto">
          {indicators.length ? (
            indicators.map((indicator) => (
              <div
                key={indicator.id}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-md"
              >
                <div className="flex-1">
                  <h3 className="font-medium text-sm">{indicator.name}</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                    {indicator.description}
                  </p>
                  <span className="text-xs bg-white dark:bg-zinc-800 px-2 py-0.5 rounded-full border border-gray-200 dark:border-zinc-700 mt-1 inline-block">
                    {indicator.unitOfMeasure}
                  </span>
                </div>
                <DeleteDialog
                  title={`Are you sure you want to delete ${indicator.name}?`}
                  deleteFunction={() => handleDelete(indicator.id)}
                  isLoading={deletingId === indicator.id}
                  buttonElement={{
                    icon: <TrashIcon className="h-4 w-4" />,
                    text: "",
                    styleClass:
                      "text-red-500 hover:text-red-700 transition-colors p-1.5 ml-2 bg-transparent hover:bg-transparent hover:opacity-75",
                  }}
                />
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
