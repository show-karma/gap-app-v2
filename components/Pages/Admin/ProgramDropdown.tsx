/* eslint-disable @next/next/no-img-element */

import { CheckIcon } from "@heroicons/react/24/solid"
import * as Popover from "@radix-ui/react-popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "cmdk"
import { type FC, useState } from "react"
import { useAccount } from "wagmi"
import { ChevronDown } from "@/components/Icons/ChevronDown"
import type { GrantProgram } from "@/components/Pages/ProgramRegistry/ProgramList"
import { cn } from "@/utilities/tailwind"

const ProgramDropdown: FC<{
  selectedProgram: GrantProgram | null

  list: GrantProgram[]

  cleanFunction?: () => void
  prefixUnselected?: string
  buttonClassname?: string

  setSelectedProgram: (program: GrantProgram) => void
}> = ({
  selectedProgram,
  list,

  cleanFunction,
  prefixUnselected = "Any",
  buttonClassname,

  setSelectedProgram,
}) => {
  const [open, setOpen] = useState(false)
  const [_adding, _setAdding] = useState(false)
  const { address: owner } = useAccount()

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger
        className={cn(
          "min-w-40 w-full max-w-max max-md:max-w-full justify-between flex flex-row cursor-default rounded-md bg-white dark:bg-zinc-800 dark:text-zinc-100 py-3 px-4 text-left text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6",
          buttonClassname
        )}
      >
        <div className="flex flex-row gap-4 w-full justify-between">
          <p className="block w-max">
            {selectedProgram?.metadata?.title
              ? selectedProgram.metadata.title
              : `${prefixUnselected} Program`}
          </p>
          <span>
            <ChevronDown className="h-5 w-5 text-black dark:text-white" />
          </span>
        </div>
      </Popover.Trigger>
      <Popover.Content className="mt-4 w-[400px] z-10 bg-white border border-zinc-200 dark:border-zinc-700 rounded-md dark:text-white dark:bg-zinc-800  max-h-60 overflow-y-auto overflow-x-hidden py-2">
        <Command>
          <div className="w-full px-2">
            <CommandInput
              className="rounded-md px-2 w-full dark:text-white dark:bg-zinc-800"
              placeholder={`Select Program`}
            />
          </div>
          <CommandEmpty className="px-4 py-2">No Program found.</CommandEmpty>

          <CommandGroup>
            {cleanFunction ? (
              <CommandItem>
                <div
                  onClick={() => {
                    cleanFunction()
                  }}
                  className="my-1 cursor-pointer hover:opacity-75 text-sm flex flex-row items-center justify-start py-2 px-4 hover:bg-zinc-200 dark:hover:bg-zinc-900"
                >
                  <div className="flex flex-row gap-2 items-center justify-start w-full">
                    <div className="flex flex-row gap-1  items-center justify-start  flex-1">
                      <p className="line-clamp-2 font-semibold text-sm max-w-full break-normal">
                        Any
                      </p>
                    </div>
                    <CheckIcon
                      className={cn("mr-2 h-4 w-4 min-w-4 min-h-4 text-black dark:text-white")}
                      style={{
                        display: selectedProgram ? "none" : "block",
                      }}
                    />
                  </div>
                </div>
              </CommandItem>
            ) : null}
            {list.map((item, index) => (
              <CommandItem key={index}>
                <div
                  onClick={() => {
                    setSelectedProgram(item)
                  }}
                  className="my-1 cursor-pointer hover:opacity-75 text-sm flex flex-row items-center justify-start py-2 px-4 hover:bg-zinc-200 dark:hover:bg-zinc-900"
                >
                  <div className="flex flex-row gap-2 items-center justify-start w-full">
                    <div className="flex flex-row gap-1  items-center justify-start  flex-1">
                      <p className="line-clamp-2 text-sm max-w-full break-normal">
                        {item.metadata?.title}
                      </p>
                    </div>
                  </div>
                  <CheckIcon
                    className={cn("mr-2 h-4 w-4 min-w-4 min-h-4 text-black dark:text-white")}
                    style={{
                      display:
                        selectedProgram?.metadata?.title === item?.metadata?.title
                          ? "block"
                          : "none",
                    }}
                  />
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </Popover.Content>
    </Popover.Root>
  )
}

export default ProgramDropdown
