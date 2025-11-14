"use client"
import { CheckIcon, ChevronUpDownIcon } from "@heroicons/react/24/solid"
import * as Popover from "@radix-ui/react-popover"
import { Command, CommandGroup, CommandItem } from "cmdk"
/* eslint-disable @next/next/no-img-element */
import { type FC, useState } from "react"
import type { Chain } from "viem"
import { chainImgDictionary } from "@/utilities/chainImgDictionary"
import { cn } from "@/utilities/tailwind"

interface NetworkDropdownProps {
  onSelectFunction: (value: number) => void
  previousValue?: number
  networks: Chain[]
  onNetworkChange?: (value: number) => Promise<void>
  isChangingNetwork?: boolean
}

export const NetworkDropdown: FC<NetworkDropdownProps> = ({
  onSelectFunction,
  previousValue,
  networks,
  onNetworkChange,
  isChangingNetwork = false,
}) => {
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState<number | undefined>(previousValue)
  const [isProcessing, setIsProcessing] = useState(false)

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger
        className="min-w-[240px] max-w-full w-max  justify-between text-black dark:text-white dark:bg-zinc-800 flex flex-row gap-2 px-4 py-2 items-center bg-gray-100 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
        disabled={isProcessing || isChangingNetwork}
      >
        {value ? (
          <div className="flex flex-row gap-2 items-center">
            <img src={chainImgDictionary(value)} alt={""} className="w-5 h-5" />
            <p>{networks.find((network) => network.id === value)?.name} </p>
          </div>
        ) : (
          "Select network"
        )}
        {isProcessing || isChangingNetwork ? (
          <div className="ml-2 h-4 w-4 border-2 border-gray-500 border-t-transparent rounded-full animate-spin" />
        ) : (
          <ChevronUpDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        )}
      </Popover.Trigger>
      <Popover.Content
        align="start"
        className="popover-content mt-4 w-max min-w-[240px] max-w-[320px] z-10 bg-white border border-zinc-200 dark:border-zinc-700 rounded-md dark:text-white dark:bg-zinc-800 max-h-80 overflow-y-auto overflow-x-hidden py-2"
        style={{
          scrollbarWidth: "thin",
          scrollbarColor: "rgb(156 163 175) rgb(243 244 246)",
        }}
      >
        <Command>
          <CommandGroup>
            {networks.map((network) => (
              <CommandItem
                key={network.id}
                onSelect={async () => {
                  setIsProcessing(true)
                  setValue(network.id)
                  setOpen(false)

                  // If onNetworkChange is provided, call it first (for chain switching)
                  if (onNetworkChange) {
                    try {
                      await onNetworkChange(network.id)
                    } catch (error) {
                      console.error("Failed to change network:", error)
                      // Revert the value if chain switch failed
                      setValue(previousValue)
                      setIsProcessing(false)
                      return
                    }
                  }

                  // Call the original onSelectFunction to update form value
                  onSelectFunction(network.id)
                  setIsProcessing(false)
                }}
                className="my-1 cursor-pointer hover:opacity-75 text-sm flex flex-row items-center justify-start py-2 px-4 hover:bg-zinc-200 dark:hover:bg-zinc-900"
                disabled={isProcessing || isChangingNetwork}
              >
                <CheckIcon
                  className={cn(
                    "mr-2 h-4 w-4 min-w-4 min-h-4 text-black dark:text-white",
                    value === network.id ? "opacity-100" : "opacity-0"
                  )}
                />
                <div className="flex flex-row gap-2 items-center justify-start w-full">
                  <div className="min-w-5 min-h-5 w-5 h-5 m-0">
                    <img
                      src={chainImgDictionary(network.id)}
                      alt={""}
                      className="min-w-5 min-h-5 w-5 h-5 m-0 rounded-full"
                    />
                  </div>
                  <div className="flex flex-row gap-1  items-center justify-start  flex-1">
                    <p className="line-clamp-2 text-sm max-w-full break-normal">{network.name}</p>
                  </div>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </Popover.Content>
    </Popover.Root>
  )
}
