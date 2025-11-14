/* eslint-disable @next/next/no-img-element */

import * as Popover from "@radix-ui/react-popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "cmdk"
import { type FC, useState } from "react"
import { ChevronDown } from "@/components/Icons/ChevronDown"

interface StatusDropdownProps {
  onSelectFunction: (value: string) => void
  previousValue?: string
  list: string[]
}
export const StatusDropdown: FC<StatusDropdownProps> = ({
  onSelectFunction,
  previousValue,
  list,
}) => {
  const [open, setOpen] = useState(false)

  const sortedList = list

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger className="min-w-40 w-full max-w-full max-md:max-w-full justify-between flex flex-row cursor-default rounded-md bg-white dark:bg-zinc-800 dark:text-zinc-100 py-3 px-4 text-left text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6">
        {previousValue ? (
          <div className="flex flex-row gap-2 items-center">
            <p>{previousValue}</p>
          </div>
        ) : (
          "Status"
        )}
        <ChevronDown className="h-5 w-5 text-black dark:text-white" />
      </Popover.Trigger>
      <Popover.Content className="mt-4 w-full z-10 bg-white border border-zinc-200 dark:border-zinc-700 rounded-md dark:text-white dark:bg-zinc-800  max-h-60 overflow-y-auto overflow-x-hidden py-2">
        <Command>
          <CommandInput
            className="rounded-md mr-2 ml-2 mb-2 w-[calc(100%-24px)] dark:text-white dark:bg-zinc-800"
            placeholder="Search network..."
          />
          <CommandEmpty className="px-4 py-2">No network found.</CommandEmpty>
          <CommandGroup>
            {sortedList.map((item) => (
              <CommandItem
                key={item}
                onSelect={() => {
                  setOpen(false)
                  onSelectFunction(item)
                }}
                className="my-1 cursor-pointer hover:opacity-75 text-sm flex flex-row items-center justify-start py-2 px-4 hover:bg-zinc-200 dark:hover:bg-zinc-900"
              >
                <div className="flex flex-row gap-2 items-center justify-start w-full">
                  <div className="min-w-5 min-h-5 w-5 h-5 m-0"></div>
                  <p className="line-clamp-2 text-sm max-w-full break-normal">{item}</p>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </Popover.Content>
    </Popover.Root>
  )
}
