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
import { Indicator } from "@/utilities/queries/getIndicatorsByCommunity";

const UNIT_TYPES = ["float", "int"] as const;
type UnitType = (typeof UNIT_TYPES)[number];

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


export const autosyncedIndicators: Indicator[] = [
  {
    name: 'no_of_txs',
    id: "",
    description: "No. of transactions",
    unitOfMeasure: "int"
  },
  {
    name: 'parttime_developers',
    id: "",
    description: "No. of part time developers",
    unitOfMeasure: "int"
  },
  {
    name: 'active_developers',
    id: "",
    description: "No. of active developers",
    unitOfMeasure: "int"
  },
  {
    name: 'fulltime_developers',
    id: "",
    description: "No. of full time developers",
    unitOfMeasure: "int"
  },
  {
    name: 'PULL_REQUEST_MERGED',
    id: "",
    description: "Number of pull requests merged",
    unitOfMeasure: "int"
  },
  {
    name: 'ISSUE_OPENED',
    id: "",
    description: "Number of issues opened",
    unitOfMeasure: "int"
  },
  {
    name: 'FORKED',
    id: "",
    description: "Number of repository forks",
    unitOfMeasure: "int"
  },
  {
    name: 'ISSUE_CLOSED',
    id: "",
    description: "Number of issues closed",
    unitOfMeasure: "int"
  },
  {
    name: 'ISSUE_COMMENT',
    id: "",
    description: "Number of comments on issues",
    unitOfMeasure: "int"
  },
  {
    name: 'PULL_REQUEST_REVIEW_COMMENT',
    id: "",
    description: "Number of pull request review comments",
    unitOfMeasure: "int"
  },
  {
    name: 'STARRED',
    id: "",
    description: "Number of repository stars",
    unitOfMeasure: "int"
  },
  {
    name: 'COMMIT_CODE',
    id: "",
    description: "Number of code commits",
    unitOfMeasure: "int"
  },
  {
    name: 'PULL_REQUEST_OPENED',
    id: "",
    description: "Number of pull requests opened",
    unitOfMeasure: "int"
  },
  {
    name: 'PULL_REQUEST_CLOSED',
    id: "",
    description: "Number of pull requests closed",
    unitOfMeasure: "int"
  },
  {
    name: 'PULL_REQUEST_REOPENED',
    id: "",
    description: "Number of pull requests reopened",
    unitOfMeasure: "int"
  },
  {
    name: 'RELEASE_PUBLISHED',
    id: "",
    description: "Number of releases published",
    unitOfMeasure: "int"
  }
]


type IndicatorFormData = z.infer<typeof indicatorSchema>;

interface IndicatorsHubProps {
  communityId: string;
}

export const IndicatorsHub = ({ communityId }: IndicatorsHubProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedAutosynced, setSelectedAutosynced] = useState<string>("");

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

  const handleAutosyncedSelect = (name: string) => {
    if (!name) {
      reset({
        name: "",
        description: "",
        unitOfMeasure: "int"
      });
      setSelectedAutosynced("");
      return;
    }

    const selectedIndicator = autosyncedIndicators.find(i => i.name === name);
    if (selectedIndicator) {
      reset({
        name: selectedIndicator.name,
        description: selectedIndicator.description,
        unitOfMeasure: selectedIndicator.unitOfMeasure as "float" | "int",
      });
      setSelectedAutosynced(name);
    }
  };

  const onSubmit = async (data: IndicatorFormData) => {
    setIsLoading(true);
    try {
      const [response, error] = await fetchData(
        INDEXER.COMMUNITY.INDICATORS.COMMUNITY.CREATE(communityId),
        "POST",
        {
          ...data,
        }
      );
      if (error) throw error;

      refetch();
      toast.success("Indicator created successfully");
      reset();
      setSelectedAutosynced("");
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
            <label className="block text-sm font-medium mb-1">Select Autosynced Indicator (Optional)</label>
            <select
              value={selectedAutosynced}
              onChange={(e) => handleAutosyncedSelect(e.target.value)}
              className="w-full p-2 border rounded-md bg-gray-50 dark:bg-zinc-900 border-gray-200 dark:border-zinc-700"
            >
              <option value="">Create Custom Indicator</option>
              {autosyncedIndicators.map((indicator) => (
                <option key={indicator.name} value={indicator.name}>
                  {indicator.description}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Name</label>
            <input
              {...register("name")}
              className="w-full p-2 border rounded-md bg-gray-50 dark:bg-zinc-900 border-gray-200 dark:border-zinc-700"
              placeholder="Enter indicator name"
              readOnly={!!selectedAutosynced}
            />
            {errors.name && (
              <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea
              {...register("description")}
              className="w-full p-2 border rounded-md bg-gray-50 dark:bg-zinc-900 border-gray-200 dark:border-zinc-700"
              placeholder="Enter indicator description"
              rows={2}
              readOnly={!!selectedAutosynced}
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
              disabled={!!selectedAutosynced}
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
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-sm">{indicator.name}</h3>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                    {indicator.description}
                  </p>
                  <span className="text-xs bg-white dark:bg-zinc-800 px-2 py-0.5 rounded-full border border-gray-200 dark:border-zinc-700 mt-1 inline-block">
                    {indicator.unitOfMeasure}
                  </span>
                  {autosyncedIndicators.find(i => i.name === indicator.name) && (
                    <span className="ml-1 px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300 rounded-full">
                      Autosynced
                    </span>
                  )}
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
