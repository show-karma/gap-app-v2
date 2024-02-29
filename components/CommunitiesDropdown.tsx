import { cn, shortAddress } from "@/utilities";
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

interface CommunitiesDropdownProps {
  onSelectFunction: (value: string, networkId: number) => void;
  previousValue?: string;
}

export const CommunitiesDropdown: FC<CommunitiesDropdownProps> = ({
  onSelectFunction,
  previousValue,
}) => {
  const [communities, setCommunities] = useState<Community[]>([]);
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(previousValue || "");

  const communitiesArray = communities.map((community) => ({
    value: community.uid,
    label: community.details?.name || shortAddress(community.uid),
    networkId: community.chainID,
  }));

  const { gap } = useGap();
  useEffect(() => {
    const fetchCommunities = async () => {
      try {
        if (!gap) throw new Error("Gap not initialized");
        const result = await gap.fetch.communities();
        setCommunities(result);
        return result;
      } catch (error) {
        console.log(error);
        setCommunities([]);
        return undefined;
      }
    };
    fetchCommunities();
  }, []);

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger className="w-[240px]  justify-between text-black dark:text-white dark:bg-zinc-800 flex flex-row gap-2 px-4 py-2 items-center bg-gray-100 rounded-md">
        {value
          ? communitiesArray.find((community) => community.value === value)
              ?.label
          : "Select community"}
        <ChevronUpDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </Popover.Trigger>
      <Popover.Content className="mt-4 w-[280px] z-10 bg-white border border-zinc-200 dark:border-zinc-700 rounded-md dark:text-white dark:bg-zinc-800  max-h-60 overflow-y-auto overflow-x-hidden py-2">
        <Command>
          <CommandInput
            className="rounded-md ml-2 mr-4 w-[240px] dark:text-white dark:bg-zinc-800"
            placeholder="Search community..."
          />
          <CommandEmpty className="px-4 py-2">No community found.</CommandEmpty>
          <CommandGroup>
            {communitiesArray.map((community) => (
              <CommandItem
                key={community.value}
                onSelect={() => {
                  setValue(community.value);
                  setOpen(false);
                  onSelectFunction(community.value, community.networkId);
                }}
                className="my-1 cursor-pointer hover:opacity-75 text-sm flex flex-row items-center py-2 px-4 hover:bg-zinc-200 dark:hover:bg-zinc-900"
              >
                <CheckIcon
                  className={cn(
                    "mr-2 h-4 w-4 text-black dark:text-white",
                    value === community.value ? "opacity-100" : "opacity-0"
                  )}
                />
                {community.label} ({shortAddress(community.value)})
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </Popover.Content>
    </Popover.Root>
  );
};
