import { FC, useState } from "react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "cmdk";
import { CheckIcon, ChevronUpDownIcon } from "@heroicons/react/24/solid";
import * as Popover from "@radix-ui/react-popover";
import { Contact } from "@/types";
import { cn } from "@/lib/utils/cn";

interface ContactsDropdownProps {
  onSelectFunction: (value: string) => void;
  value: string;
  contacts?: Contact[];
}

export const ContactsDropdown: FC<ContactsDropdownProps> = ({
  onSelectFunction,
  contacts,
  value,
}) => {
  const [open, setOpen] = useState(false);

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger className="w-full justify-between text-black dark:text-white dark:bg-zinc-800 flex flex-row gap-2 px-4 py-2 items-center bg-gray-100 rounded-md">
        {value
          ? contacts?.find((contact) => contact.id === value)?.name ||
            "Add new contact"
          : "Select a contact"}
        <ChevronUpDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </Popover.Trigger>
      <Popover.Content className="mt-4 w-[280px] bg-white border border-zinc-200 dark:border-zinc-700 rounded-md dark:text-white dark:bg-zinc-800  max-h-60 overflow-y-auto overflow-x-hidden py-2">
        <Command>
          <CommandInput
            className="rounded-md ml-2 mr-4 w-[240px] dark:text-white dark:bg-zinc-800"
            placeholder="Search contact..."
          />
          <CommandEmpty className="px-4 py-2">No contacts found.</CommandEmpty>
          <CommandGroup>
            <CommandItem
              key={"add"}
              onSelect={() => {
                onSelectFunction("0");
                setOpen(false);
              }}
              className="my-1 cursor-pointer hover:opacity-75 text-sm flex flex-row items-center py-2 px-4 hover:bg-zinc-200 dark:hover:bg-zinc-900"
            >
              <CheckIcon
                className={cn(
                  "mr-2 h-4 w-4 text-black dark:text-white",
                  value === "0" ? "opacity-100" : "opacity-0"
                )}
              />
              Add new contact
            </CommandItem>
            {contacts?.map((contact) => (
              <CommandItem
                key={contact.id}
                onSelect={() => {
                  setOpen(false);
                  onSelectFunction(contact.id);
                }}
                className="my-1 cursor-pointer hover:opacity-75 text-sm flex flex-row items-center py-2 px-4 hover:bg-zinc-200 dark:hover:bg-zinc-900"
              >
                <CheckIcon
                  className={cn(
                    "mr-2 h-4 w-4 text-black dark:text-white",
                    value === contact.id ? "opacity-100" : "opacity-0"
                  )}
                />
                {contact.name}
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </Popover.Content>
    </Popover.Root>
  );
};

export default ContactsDropdown;
