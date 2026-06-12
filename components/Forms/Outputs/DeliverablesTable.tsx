"use client";

import { TrashIcon } from "@heroicons/react/24/solid";
import type { FieldErrors, UseFormRegister } from "react-hook-form";
import { InfoTooltip } from "@/components/Utilities/InfoTooltip";
import { Button } from "@/components/ui/button";
import { cn } from "@/utilities/tailwind";

interface DeliverablesTableProps {
  fields: Record<"id", string>[];
  register: UseFormRegister<any>;
  errors: FieldErrors<any>;
  onAdd: () => void;
  onRemove: (index: number) => void;
  labelStyle: string;
}

export const DeliverablesTable = ({
  fields,
  register,
  errors,
  onAdd,
  onRemove,
  labelStyle,
}: DeliverablesTableProps) => {
  return (
    <div
      className={cn(
        "flex w-full flex-col gap-4 p-6 bg-white dark:bg-zinc-800/50 border rounded-md",
        "border-gray-200 dark:border-zinc-700"
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className={cn(labelStyle)}>Deliverables</h3>
          <InfoTooltip content="Deliverables are the specific, tangible results or products achieved by the activity. What key things have been delivered as a result of your activities that you can showcase?" />
        </div>
      </div>

      {fields.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8">
          <p className="text-gray-500 dark:text-zinc-400 mb-4 text-center">Add your deliverables</p>
          <Button
            type="button"
            onClick={onAdd}
            size="xl"
            className="w-full bg-brand-blue text-white hover:bg-brand-blue/90 md:w-auto"
          >
            Add Deliverable
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div
            aria-hidden="true"
            className="hidden md:grid md:grid-cols-[minmax(160px,1fr)_minmax(180px,1.2fr)_minmax(180px,1.4fr)_auto] md:items-end md:gap-4 md:border-b md:border-gray-200 md:pb-2 md:dark:border-zinc-700"
          >
            <div className="text-sm font-bold text-gray-700 dark:text-zinc-300">Name</div>
            <div className="text-sm font-bold text-gray-700 dark:text-zinc-300">Proof/Link</div>
            <div className="text-sm font-bold text-gray-700 dark:text-zinc-300">
              Description/Comment
            </div>
            <div className="text-sm font-bold text-gray-700 dark:text-zinc-300 w-10 text-center">
              <span className="sr-only">Actions</span>
            </div>
          </div>

          <div className="flex flex-col gap-3 md:divide-y md:divide-gray-200 md:gap-0 md:dark:divide-zinc-700">
            {fields.map((field, index) => {
              const nameId = `deliverable-name-${field.id}`;
              const proofId = `deliverable-proof-${field.id}`;
              const descriptionId = `deliverable-description-${field.id}`;
              const nameError = (errors.deliverables as any)?.[index]?.name?.message as
                | string
                | undefined;
              const proofError = (errors.deliverables as any)?.[index]?.proof?.message as
                | string
                | undefined;

              return (
                <div
                  key={field.id}
                  className={cn(
                    "flex flex-col gap-3 rounded-lg border border-gray-200 p-4 dark:border-zinc-700",
                    "md:grid md:grid-cols-[minmax(160px,1fr)_minmax(180px,1.2fr)_minmax(180px,1.4fr)_auto] md:items-start md:gap-4 md:border-0 md:rounded-none md:p-0 md:py-3"
                  )}
                >
                  <div className="flex flex-col gap-1.5">
                    <label
                      htmlFor={nameId}
                      className="text-xs font-medium text-gray-600 dark:text-zinc-400 md:hidden"
                    >
                      Name
                    </label>
                    <input
                      id={nameId}
                      type="text"
                      {...register(`deliverables.${index}.name`, {
                        required: "Name is required",
                      })}
                      placeholder="Enter name"
                      className={cn(
                        "w-full px-3 py-2 bg-white dark:bg-zinc-900 border rounded-md text-sm",
                        nameError
                          ? "border-red-500 dark:border-red-500"
                          : "border-gray-300 dark:border-zinc-700"
                      )}
                    />
                    {nameError && <p className="text-xs text-red-500">{nameError}</p>}
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label
                      htmlFor={proofId}
                      className="text-xs font-medium text-gray-600 dark:text-zinc-400 md:hidden"
                    >
                      Proof / Link
                    </label>
                    <input
                      id={proofId}
                      type="text"
                      {...register(`deliverables.${index}.proof`, {
                        required: "Proof link is required",
                      })}
                      placeholder="Enter proof URL"
                      className={cn(
                        "w-full px-3 py-2 bg-white dark:bg-zinc-900 border rounded-md text-sm",
                        proofError
                          ? "border-red-500 dark:border-red-500"
                          : "border-gray-300 dark:border-zinc-700"
                      )}
                    />
                    {proofError && <p className="text-xs text-red-500">{proofError}</p>}
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label
                      htmlFor={descriptionId}
                      className="text-xs font-medium text-gray-600 dark:text-zinc-400 md:hidden"
                    >
                      Description / Comment
                    </label>
                    <input
                      id={descriptionId}
                      type="text"
                      {...register(`deliverables.${index}.description`)}
                      placeholder="Enter description"
                      className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-gray-300 dark:border-zinc-700 rounded-md text-sm"
                    />
                  </div>

                  <div className="flex md:justify-center md:pt-1">
                    <button
                      onClick={() => onRemove(index)}
                      type="button"
                      aria-label="Remove deliverable"
                      className={cn(
                        "flex w-full min-h-[44px] items-center justify-center gap-2 rounded-md border border-red-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:border-red-900/40 dark:text-red-400 dark:hover:bg-red-900/20",
                        "md:w-10 md:h-10 md:min-h-0 md:border-0 md:p-1 md:rounded-full"
                      )}
                    >
                      <TrashIcon className="h-5 w-5" />
                      <span className="md:hidden">Remove deliverable</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex w-full justify-end">
            <Button
              type="button"
              onClick={onAdd}
              size="xl"
              className="w-full bg-brand-blue text-white hover:bg-brand-blue/90 md:w-auto"
            >
              Add more deliverables
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
