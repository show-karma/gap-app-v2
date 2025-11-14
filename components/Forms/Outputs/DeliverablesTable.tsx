"use client"

import { TrashIcon } from "@heroicons/react/24/solid"
import type { FieldErrors, UseFormRegister } from "react-hook-form"
import { Button } from "@/components/Utilities/Button"
import { InfoTooltip } from "@/components/Utilities/InfoTooltip"
import { cn } from "@/utilities/tailwind"

interface DeliverableField {
  id: string
  name?: string
  proof?: string
  description?: string
}

interface DeliverablesTableProps {
  fields: Record<"id", string>[]
  register: UseFormRegister<any>
  errors: FieldErrors<any>
  onAdd: () => void
  onRemove: (index: number) => void
  labelStyle: string
}

const EmptyDiv = () => <div className="h-5 w-1" />

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
          <p className="text-gray-500 dark:text-zinc-400 mb-4">Add your deliverables</p>
          <Button
            type="button"
            onClick={onAdd}
            className="text-sm bg-brand-blue text-white px-3 py-1.5"
          >
            Add Deliverable
          </Button>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-zinc-700">
            <thead>
              <tr>
                <th className="px-4 py-3 text-left text-sm font-bold text-gray-700 dark:text-zinc-300">
                  Name
                </th>
                <th className="px-4 py-3 text-left text-sm font-bold text-gray-700 dark:text-zinc-300">
                  Proof/Link
                </th>
                <th className="px-4 py-3 text-left text-sm font-bold text-gray-700 dark:text-zinc-300">
                  Description/Comment
                </th>
                <th className="px-4 py-3 text-left text-sm font-bold text-gray-700 dark:text-zinc-300 w-16">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-zinc-700">
              {fields.map((field, index) => (
                <tr key={field.id}>
                  <td className="px-4 py-2">
                    <input
                      type="text"
                      {...register(`deliverables.${index}.name`, {
                        required: "Name is required",
                      })}
                      placeholder="Enter name"
                      className="w-full px-3 py-1.5 bg-white dark:bg-zinc-900 border border-gray-300 dark:border-zinc-700 rounded-md"
                    />
                    {(errors.deliverables as any)?.[index]?.name ? (
                      <p className="text-xs text-red-500 h-5">
                        {((errors.deliverables as any)?.[index]?.name as any)?.message}
                      </p>
                    ) : (
                      <EmptyDiv />
                    )}
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="text"
                      {...register(`deliverables.${index}.proof`, {
                        required: "Proof link is required",
                      })}
                      placeholder="Enter proof URL"
                      className="w-full px-3 py-1.5 bg-white dark:bg-zinc-900 border border-gray-300 dark:border-zinc-700 rounded-md"
                    />
                    {(errors.deliverables as any)?.[index]?.proof ? (
                      <p className="text-xs text-red-500 h-5">
                        {((errors.deliverables as any)?.[index]?.proof as any)?.message}
                      </p>
                    ) : (
                      <EmptyDiv />
                    )}
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="text"
                      {...register(`deliverables.${index}.description`)}
                      placeholder="Enter description"
                      className="w-full px-3 py-1.5 bg-white dark:bg-zinc-900 border border-gray-300 dark:border-zinc-700 rounded-md"
                    />
                    <EmptyDiv />
                  </td>
                  <td className="px-4 py-2">
                    <button
                      onClick={() => onRemove(index)}
                      type="button"
                      className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>

                    <EmptyDiv />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {fields.length > 0 && (
            <div className="flex w-full justify-end">
              <Button
                type="button"
                onClick={onAdd}
                className="text-sm bg-brand-blue text-white px-3 py-1.5"
              >
                Add more deliverables
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
