import { Button } from "@/components/Utilities/Button";
import { errorManager } from "@/components/Utilities/errorManager";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";
import { MESSAGES } from "@/utilities/messages";
import { PAGES } from "@/utilities/pages";
import { TrashIcon } from "@heroicons/react/24/outline";
import { ICommunityResponse } from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";
import Link from "next/link";
import { useState } from "react";
import toast from "react-hot-toast";

const OUTPUT_TYPES = ["output", "outcome", "impact"] as const;
type OutputType = (typeof OUTPUT_TYPES)[number];

interface Output {
  id: string;
  name: string;
  categoryId: string;
  type: OutputType;
}

interface Category {
  id: string;
  name: string;
  category: string;
  outputs: Output[];
}

interface ManageCategoriesOutputsProps {
  categories: Category[];
  setCategories: (categories: Category[]) => void;
  community: ICommunityResponse | undefined;
}

export const ManageCategoriesOutputs = ({
  categories,
  setCategories,
  community,
}: ManageCategoriesOutputsProps) => {
  const [newOutputs, setNewOutputs] = useState<Record<string, string>>({});
  const [newOutputTypes, setNewOutputTypes] = useState<
    Record<string, OutputType>
  >({});
  const [hasOutputChanges, setHasOutputChanges] = useState<
    Record<string, boolean>
  >({});
  const [isSavingOutputs, setIsSavingOutputs] = useState<
    Record<string, boolean>
  >({});

  const handleAddOutput = (categoryId: string) => {
    if (!newOutputs[categoryId]?.trim()) return;

    const categoryIndex = categories.findIndex((cat) => cat.id === categoryId);
    if (categoryIndex === -1) return;

    const updatedCategories = [...categories];
    updatedCategories[categoryIndex] = {
      ...updatedCategories[categoryIndex],
      outputs: [
        ...updatedCategories[categoryIndex].outputs,
        {
          id: `temp-${Date.now()}`,
          name: newOutputs[categoryId].trim(),
          categoryId,
          type: newOutputTypes[categoryId] || "output",
        },
      ],
    };

    setCategories(updatedCategories);
    setNewOutputs((prev) => ({ ...prev, [categoryId]: "" }));
    setNewOutputTypes((prev) => ({ ...prev, [categoryId]: "output" }));
    setHasOutputChanges((prev) => ({ ...prev, [categoryId]: true }));
  };

  const handleRemoveOutput = (categoryId: string, outputId: string) => {
    const categoryIndex = categories.findIndex((cat) => cat.id === categoryId);
    if (categoryIndex === -1) return;

    const updatedCategories = [...categories];
    updatedCategories[categoryIndex] = {
      ...updatedCategories[categoryIndex],
      outputs: updatedCategories[categoryIndex].outputs.filter(
        (output) => output.id !== outputId
      ),
    };

    setCategories(updatedCategories);
    setHasOutputChanges((prev) => ({ ...prev, [categoryId]: true }));
  };

  const saveOutputs = async (category: Category) => {
    setIsSavingOutputs({ ...isSavingOutputs, [category.id]: true });
    try {
      const [, error] = await fetchData(
        INDEXER.CATEGORIES.OUTPUTS.UPDATE(category.id),
        "PUT",
        {
          idOrSlug: community?.uid,
          outputs: category.outputs?.map((output) => ({
            name: output.name,
            type: output.type,
          })) as {
            name: string;
            type: string;
          }[],
        }
      );
      if (error) throw new Error("Error saving outputs");
      toast.success(MESSAGES.CATEGORIES.OUTPUTS.SUCCESS(category.name));
      setHasOutputChanges((prev) => ({ ...prev, [category.id]: false }));
    } catch (error: any) {
      toast.error(MESSAGES.CATEGORIES.OUTPUTS.ERROR.GENERIC(category.name));
      errorManager(
        `Error saving outputs of community ${community?.uid}`,
        error,
        {
          community: community?.uid,
          idOrSlug: community?.uid,
          outputs: category.outputs?.map((output) => output?.name),
        }
      );
    } finally {
      setIsSavingOutputs({ ...isSavingOutputs, [category.id]: false });
    }
  };

  return (
    <div className="bg-white dark:bg-zinc-800 rounded-lg p-8 border border-gray-100 dark:border-zinc-700 w-full">
      <h2 className="text-2xl font-bold mb-6">
        Manage Categories & Outputs/Outcomes
      </h2>
      {categories.length ? (
        categories.map((category, index) => {
          return (
            <div
              key={category.id}
              className="flex w-full flex-col items-start justify-start gap-4"
              style={{
                borderBottomWidth: index === categories.length - 1 ? 0 : 1,
                borderBottomColor: "#E4E7EB",
              }}
            >
              <div className="flex w-full flex-1 flex-col items-start justify-start">
                <h3 className="text-xl font-bold">{category.name}</h3>
              </div>

              <div className="w-full pb-6 mb-6">
                <h5 className="text-md font-semibold mb-4">Modify outputs</h5>
                <div className="flex flex-col gap-2">
                  {category.outputs.map((output) => (
                    <div
                      key={output.id}
                      className="flex items-center justify-between gap-2 p-3 border border-gray-200 dark:border-gray-700 rounded-lg"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          {output.name}
                        </span>
                        <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-full">
                          {output.type}
                        </span>
                      </div>
                      <button
                        onClick={() =>
                          handleRemoveOutput(category.id, output.id)
                        }
                        className="text-secondary-500 hover:text-secondary-700 transition-colors"
                        aria-label="Remove output"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  ))}

                  <div className="flex flex-col gap-2 mt-4">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={newOutputs[category.id] || ""}
                        onChange={(e) =>
                          setNewOutputs((prev) => ({
                            ...prev,
                            [category.id]: e.target.value,
                          }))
                        }
                        placeholder="Enter new output name"
                        className="text-sm flex-1 p-2 border border-gray-200 dark:border-gray-700 rounded-md 
                          focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                      />
                      <select
                        value={newOutputTypes[category.id] || "output"}
                        onChange={(e) =>
                          setNewOutputTypes((prev) => ({
                            ...prev,
                            [category.id]: e.target.value as OutputType,
                          }))
                        }
                        className="w-32 text-sm p-2 border border-gray-200 dark:border-gray-700 rounded-md 
                          focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                      >
                        {OUTPUT_TYPES.map((type) => (
                          <option key={type} value={type}>
                            {type.charAt(0).toUpperCase() + type.slice(1)}
                          </option>
                        ))}
                      </select>
                      <Button
                        onClick={() => handleAddOutput(category.id)}
                        disabled={!newOutputs[category.id]?.trim()}
                        className="px-4 py-2 bg-primary-500 text-white rounded-md hover:bg-primary-600 
                          transition-colors disabled:opacity-50"
                      >
                        Add Output
                      </Button>
                    </div>
                  </div>

                  {hasOutputChanges[category.id] && (
                    <Button
                      isLoading={isSavingOutputs[category.id]}
                      disabled={isSavingOutputs[category.id]}
                      onClick={() => saveOutputs(category)}
                      className="mt-4 text-center mx-auto bg-primary-500 px-4 py-2 rounded-md text-white hover:bg-primary-600 
                        dark:bg-primary-900 transition-colors"
                    >
                      Save changes
                    </Button>
                  )}
                </div>
              </div>
            </div>
          );
        })
      ) : (
        <div className="flex w-full flex-1 flex-col items-center justify-center gap-3">
          <p>{MESSAGES.CATEGORIES.OUTPUTS.EMPTY}</p>
          <div className="flex flex-row gap-10 items-center">
            <Link
              href={PAGES.ADMIN.MANAGE_INDICATORS(
                community?.details?.data?.slug || (community?.uid as string)
              )}
            >
              <Button className="px-10 py-8 bg-brand-blue hover:bg-brand-blue rounded-md transition-all ease-in-out duration-200">
                Edit categories
              </Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};
