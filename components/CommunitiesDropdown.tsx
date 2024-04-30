/* eslint-disable @next/next/no-img-element */
import { FC, useEffect, useState } from "react";
import { Community } from "@show-karma/karma-gap-sdk";
import { useGap } from "@/hooks";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "cmdk";
import { CheckIcon, ChevronUpDownIcon } from "@heroicons/react/24/solid";
import * as Popover from "@radix-ui/react-popover";
import { shortAddress } from "@/utilities/shortAddress";
import { cn } from "@/utilities/tailwind";
import { chainImgDictionary } from "@/utilities/chainImgDictionary";
import * as Tooltip from "@radix-ui/react-tooltip";
import { chainNameDictionary } from "@/utilities/chainNameDictionary";

interface CommunitiesDropdownProps {
  onSelectFunction: (value: string, networkId: number) => void;
  previousValue?: string;
  communities: Community[];
}
export const CommunitiesDropdown: FC<CommunitiesDropdownProps> = ({
  onSelectFunction,
  previousValue,
  communities,
}) => {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(previousValue || "");

  const communitiesArray = communities.map((community) => ({
    value: community.uid,
    label: community.details?.name || shortAddress(community.uid),
    networkId: community.chainID,
    logo: community.details?.imageURL,
  }));

  // sort communities by name alphabetically
  const sortedCommunities = communitiesArray.sort((a, b) => {
    if (a.label < b.label) {
      return -1;
    }
    if (a.label > b.label) {
      return 1;
    }
    return 0;
  });

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger className="min-w-[240px] max-w-full w-max  justify-between text-black dark:text-white dark:bg-zinc-800 flex flex-row gap-2 px-4 py-2 items-center bg-gray-100 rounded-md">
        {value ? (
          <div className="flex flex-row gap-2 items-center">
            <img
              src={
                communitiesArray.find((community) => community.value === value)
                  ?.logo
              }
              alt={""}
              className="w-5 h-5"
            />
            <p>
              {
                communitiesArray.find((community) => community.value === value)
                  ?.label
              }{" "}
              <span className="ml-1 w-max text-[13px]">
                -{" "}
                {chainNameDictionary(
                  communitiesArray.find(
                    (community) => community.value === value
                  )?.networkId as number
                )}
              </span>
            </p>
          </div>
        ) : (
          "Select community"
        )}
        <ChevronUpDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </Popover.Trigger>
      <Popover.Content className="mt-4 w-[360px] z-10 bg-white border border-zinc-200 dark:border-zinc-700 rounded-md dark:text-white dark:bg-zinc-800  max-h-60 overflow-y-auto overflow-x-hidden py-2">
        <Command>
          <CommandInput
            className="rounded-md ml-2 mr-4 w-[240px] dark:text-white dark:bg-zinc-800"
            placeholder="Search community..."
          />
          <CommandEmpty className="px-4 py-2">No community found.</CommandEmpty>
          <CommandGroup>
            {sortedCommunities.map((community) => (
              <CommandItem
                key={community.value}
                onSelect={() => {
                  setValue(community.value);
                  setOpen(false);
                  onSelectFunction(community.value, community.networkId);
                }}
                className="my-1 cursor-pointer hover:opacity-75 text-sm flex flex-row items-center justify-start py-2 px-4 hover:bg-zinc-200 dark:hover:bg-zinc-900"
              >
                <CheckIcon
                  className={cn(
                    "mr-2 h-4 w-4 min-w-4 min-h-4 text-black dark:text-white",
                    value === community.value ? "opacity-100" : "opacity-0"
                  )}
                />
                <div className="flex flex-row gap-2 items-center justify-start w-full">
                  <div className="min-w-5 min-h-5 w-5 h-5 m-0">
                    <img
                      src={community.logo}
                      alt={""}
                      className="min-w-5 min-h-5 w-5 h-5 m-0 rounded-full"
                    />
                  </div>
                  <div className="flex flex-row gap-3  items-center justify-start  flex-1">
                    <p className="line-clamp-2 text-sm w-full break-normal">
                      {community.label}
                      <span className="ml-1 w-max text-[13px]">
                        - {chainNameDictionary(community.networkId)}
                      </span>
                    </p>
                  </div>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </Popover.Content>
    </Popover.Root>
  );
};
