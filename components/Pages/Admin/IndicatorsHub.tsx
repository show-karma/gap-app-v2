"use client";

import { Button } from "@/components/Utilities/Button";
import { errorManager } from "@/components/Utilities/errorManager";
import { useIndicators } from "@/hooks/useIndicators";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";
import { TrashIcon, PencilSquareIcon } from "@heroicons/react/24/outline";
import { useState } from "react";
import toast from "react-hot-toast";
import { DeleteDialog } from "@/components/DeleteDialog";
import {
  IndicatorForm,
  IndicatorFormData,
} from "@/components/Forms/IndicatorForm";
import { Indicator } from "@/utilities/queries/getIndicatorsByCommunity";
import { ProgramCard } from "./ProgramCard";

interface Program {
  programId: string;
  chainID: number;
}


type IndicatorWithPrograms = Indicator & {
  programs?: Program[];
}

export const autosyncedIndicators: IndicatorWithPrograms[] = [
  {
    name: "no_of_txs",
    id: "",
    description: "No. of transactions (*dune)",
    unitOfMeasure: "int"
  },
  {
    name: "parttime_developers",
    id: "",
    description: "No. of part time developers (*oso)",
    unitOfMeasure: "int"
  },
  {
    name: "active_developers",
    id: "",
    description: "No. of active developers (*oso)",
    unitOfMeasure: "int"
  },
  {
    name: "fulltime_developers",
    id: "",
    description: "No. of full time developers (*oso)",
    unitOfMeasure: "int"
  },
  {
    name: 'PULL_REQUEST_MERGED',
    id: "",
    description: "Number of pull requests merged (*oso)",
    unitOfMeasure: "int"
  },
  {
    name: "ISSUE_OPENED",
    id: "",
    description: "Number of issues opened (*oso)",
    unitOfMeasure: "int"
  },
  {
    name: "FORKED",
    id: "",
    description: "Number of repository forks (*oso)",
    unitOfMeasure: "int"
  },
  {
    name: "ISSUE_CLOSED",
    id: "",
    description: "Number of issues closed (*oso)",
    unitOfMeasure: "int"
  },
  {
    name: "ISSUE_COMMENT",
    id: "",
    description: "Number of comments on issues (*oso)",
    unitOfMeasure: "int"
  },
  {
    name: "PULL_REQUEST_REVIEW_COMMENT",
    id: "",
    description: "Number of pull request review comments (*oso)",
    unitOfMeasure: "int"
  },
  {
    name: "STARRED",
    id: "",
    description: "Number of repository stars (*oso)",
    unitOfMeasure: "int"
  },
  {
    name: "COMMIT_CODE",
    id: "",
    description: "Number of code commits (*oso)",
    unitOfMeasure: "int"
  },
  {
    name: 'GitHub Commits',
    id: "",
    description: "Number of code commits (*github)",
    unitOfMeasure: "int"
  },
  {
    name: "PULL_REQUEST_OPENED",
    id: "",
    description: "Number of pull requests opened (*oso)",
    unitOfMeasure: "int"
  },
  {
    name: "PULL_REQUEST_CLOSED",
    id: "",
    description: "Number of pull requests closed (*oso)",
    unitOfMeasure: "int"
  },
  {
    name: 'GitHub Merged PRs',
    id: "",
    description: "Number of pull requests merged (*github)",
    unitOfMeasure: "int"
  },
  {
    name: "PULL_REQUEST_REOPENED",
    id: "",
    description: "Number of pull requests reopened (*oso)",
    unitOfMeasure: "int"
  },
  {
    name: "RELEASE_PUBLISHED",
    id: "",
    description: "Number of releases published (*oso)",
    unitOfMeasure: "int"
  }
]

interface IndicatorsHubProps {
  communitySlug: string;
  communityId: string;
}

export const IndicatorsHub = ({ communitySlug, communityId }: IndicatorsHubProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingIndicator, setEditingIndicator] = useState<IndicatorWithPrograms | null>(null);
  const [selectedAutosynced, setSelectedAutosynced] = useState<string>("");
  const [formDefaultValues, setFormDefaultValues] = useState<
    Partial<IndicatorFormData>
  >({
    name: "",
    description: "",
    unitOfMeasure: "int",
    programs: [],
  });
  const { data: rawIndicators = [], refetch } = useIndicators({
    communityId,
  });

  const indicators = rawIndicators as IndicatorWithPrograms[];

  const handleAutosyncedSelect = (name: string) => {
    if (!name) {
      setFormDefaultValues({
        name: "",
        description: "",
        unitOfMeasure: "int",
        programs: [],
      });
      setSelectedAutosynced("");
      return;
    }

    const selectedIndicator = autosyncedIndicators.find((i) => i.name === name);
    if (selectedIndicator) {
      setFormDefaultValues({
        name: selectedIndicator.name,
        description: selectedIndicator.description,
        unitOfMeasure: selectedIndicator.unitOfMeasure as "float" | "int",
        programs: [],
      });
      setSelectedAutosynced(name);
    }
  };

  const handleSuccess = async () => {
    await refetch();
    toast.success("Indicator created successfully");
    setFormDefaultValues({
      name: "",
      description: "",
      unitOfMeasure: "int",
      programs: [],
    });
    setSelectedAutosynced("");
  };

  const handleError = () => {
    toast.error("Failed to create indicator");
  };

  const handleEditSuccess = async () => {
    await refetch();
    toast.success("Indicator updated successfully");
    setEditingIndicator(null);
    setFormDefaultValues({
      name: "",
      description: "",
      unitOfMeasure: "int",
      programs: [],
    });
  };

  const handleEditError = () => {
    toast.error("Failed to update indicator");
  };

  const handleEditClick = (indicator: IndicatorWithPrograms) => {
    setEditingIndicator(indicator);
    setFormDefaultValues({
      name: indicator.name,
      description: indicator.description,
      unitOfMeasure: indicator.unitOfMeasure as "float" | "int",
      programs: indicator.programs || [],
    });
  };

  const handleDelete = async (id: string) => {
    try {
      setDeletingId(id);
      const [, error] = await fetchData(
        INDEXER.INDICATORS.DELETE(id),
        "DELETE"
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
    <div className="w-full h-max max-h-full flex flex-col" >
      <div className="bg-white dark:bg-zinc-800 rounded-lg p-6 mb-6">
        <h3 className="text-lg font-semibold mb-4">
          {editingIndicator ? "Edit Indicator" : "Create New Indicator"}
        </h3>
        <div className="space-y-4">
          {!editingIndicator && (
            <div>
              <label className="block text-sm font-medium mb-1">
                Select Autosynced Indicator (Optional)
              </label>
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
          )}

          <IndicatorForm
            communityId={communitySlug}
            onSuccess={editingIndicator ? handleEditSuccess : handleSuccess}
            onError={editingIndicator ? handleEditError : handleError}
            isLoading={isLoading}
            defaultValues={formDefaultValues}
            indicatorId={editingIndicator?.id}
            readOnlyFields={{
              name: !!selectedAutosynced || (!!editingIndicator && autosyncedIndicators.some(i => i.name === editingIndicator.name)),
              description: !!selectedAutosynced || (!!editingIndicator && autosyncedIndicators.some(i => i.name === editingIndicator.name)),
              unitOfMeasure: !!selectedAutosynced || (!!editingIndicator && autosyncedIndicators.some(i => i.name === editingIndicator.name)),
            }}
          />

          {editingIndicator && (
            <div className="flex justify-end mt-4">
              <Button
                onClick={() => {
                  setEditingIndicator(null);
                  setFormDefaultValues({
                    name: "",
                    description: "",
                    unitOfMeasure: "int",
                    programs: [],
                  });
                }}
                className="bg-gray-100 hover:bg-gray-200 text-gray-900 dark:bg-zinc-700 dark:hover:bg-zinc-600 dark:text-gray-100"
              >
                Cancel Edit
              </Button>
            </div>
          )}
        </div>
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
                  <div className="flex flex-wrap gap-2 mt-1">
                    <span className="text-xs bg-white dark:bg-zinc-800 px-2 py-0.5 rounded-full border border-gray-200 dark:border-zinc-700 inline-block">
                      {indicator.unitOfMeasure}
                    </span>
                    {autosyncedIndicators.find(
                      (i) => i.name === indicator.name
                    ) && (
                        <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300 rounded-full">
                          Autosynced
                        </span>
                      )}
                  </div>
                  {indicator.programs && indicator.programs.length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                        Associated Programs:
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {indicator.programs.map((program: Program) => (
                          <ProgramCard
                            key={`${program.programId}-${program.chainID}`}
                            programId={program.programId}
                            chainID={program.chainID}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleEditClick(indicator)}
                    className="text-blue-500 hover:text-blue-700 transition-colors p-1.5 bg-transparent hover:bg-transparent hover:opacity-75 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={editingIndicator?.id === indicator.id}
                  >
                    <PencilSquareIcon className="h-4 w-4" />
                  </button>
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
              </div>
            ))
          ) : (
            <p className="text-gray-500 dark:text-gray-400 text-center py-4">
              No indicators created yet
            </p>
          )}
        </div>
      </div>
    </div >
  );
};