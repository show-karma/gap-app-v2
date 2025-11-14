import { Listbox, Transition } from "@headlessui/react"
import { CheckIcon, ChevronUpDownIcon, XMarkIcon } from "@heroicons/react/20/solid"
import { Fragment } from "react"
import { cn } from "@/utilities/tailwind"

interface ProgramFilterProps {
  programs: {
    programId: string
    title: string
  }[]
  selectedProgramId: string | null
  onChange: (programId: string | null) => void
}

export const ProgramFilter = ({
  programs = [],
  selectedProgramId,
  onChange,
}: ProgramFilterProps) => {
  // Filter and sort programs
  const uniquePrograms = programs
    .filter((program) => program.programId) // Filter out empty values
    .filter(
      (program, index, self) => index === self.findIndex((p) => p.programId === program.programId)
    )
    .sort((a, b) => a.title.localeCompare(b.title)) // Sort alphabetically by title

  return (
    <div className="relative w-64">
      <Listbox
        value={selectedProgramId}
        onChange={(value) => {
          // Allow deselecting by clicking the same item
          if (value === selectedProgramId) {
            onChange(null)
          } else {
            onChange(value)
          }
        }}
      >
        <div className="relative">
          <Listbox.Button className="dark:bg-zinc-800 dark:text-white relative w-full cursor-default rounded-md bg-white py-1.5 pl-3 pr-10 text-left text-gray-900 ring-1 ring-inset ring-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-600 sm:text-sm sm:leading-6">
            <span className="block truncate">
              {selectedProgramId
                ? uniquePrograms.find((program) => program.programId === selectedProgramId)
                    ?.title || "Filter by Grant Program"
                : "Filter by Grant Program"}
            </span>
            <span className="absolute inset-y-0 right-0 flex items-center pr-2">
              {selectedProgramId ? (
                <XMarkIcon
                  className="h-5 w-5 text-gray-400 hover:text-gray-700 cursor-pointer"
                  aria-hidden="true"
                  onClick={(e) => {
                    e.stopPropagation()
                    onChange(null)
                  }}
                />
              ) : (
                <ChevronUpDownIcon
                  className="h-5 w-5 text-gray-400 pointer-events-none"
                  aria-hidden="true"
                />
              )}
            </span>
          </Listbox.Button>
          <Transition
            as={Fragment}
            leave="transition ease-in duration-100"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <Listbox.Options className="dark:bg-zinc-800 dark:text-white absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
              {uniquePrograms.map((program) => (
                <Listbox.Option
                  key={program.programId}
                  value={program.programId}
                  className={({ active }) =>
                    cn(
                      active
                        ? "bg-gray-100 text-black dark:text-gray-300 dark:bg-zinc-900"
                        : "text-gray-900 dark:text-gray-200",
                      "relative cursor-default select-none py-2 pl-3 pr-9 transition-all ease-in-out duration-200"
                    )
                  }
                >
                  {({ selected, active }) => (
                    <>
                      <span
                        className={cn(selected ? "font-semibold" : "font-normal", "block truncate")}
                      >
                        {program.title}
                      </span>
                      {selected && (
                        <span
                          className={cn(
                            "absolute inset-y-0 right-0 flex items-center pr-4",
                            active ? "text-black" : "text-primary-600"
                          )}
                        >
                          <CheckIcon className="h-5 w-5" aria-hidden="true" />
                        </span>
                      )}
                    </>
                  )}
                </Listbox.Option>
              ))}
            </Listbox.Options>
          </Transition>
        </div>
      </Listbox>
    </div>
  )
}
