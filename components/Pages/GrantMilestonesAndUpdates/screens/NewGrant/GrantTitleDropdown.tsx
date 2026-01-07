/* eslint-disable @next/next/no-img-element */

import { CheckIcon, ChevronDownIcon } from "@heroicons/react/24/solid";
import * as Popover from "@radix-ui/react-popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "cmdk";
import pluralize from "pluralize";
import { type FC, useEffect, useRef, useState } from "react";
import type { GrantProgram } from "@/components/Pages/ProgramRegistry/ProgramList";
import type { Grant } from "@/types/v2/grant";
import { cn } from "@/utilities/tailwind";

export const GrantTitleDropdown: FC<{
  setValue: (
    field: string,
    value: string | undefined,
    options?: {
      shouldValidate: boolean;
    }
  ) => void;
  selectedProgram: GrantProgram | null;
  grantToEdit: Grant | undefined;
  list: GrantProgram[];
  type: string;
  chainId: number;
  cleanFunction?: () => void;
  prefixUnselected?: string;
  buttonClassname?: string;
  canAdd?: boolean;
  canSearch?: boolean;
  setSelectedProgram: (program: GrantProgram) => void;
}> = ({
  setValue,
  selectedProgram,
  list: listProp,
  grantToEdit,
  type,
  chainId,
  cleanFunction,
  prefixUnselected = "Any",
  buttonClassname,
  canAdd = false,
  canSearch = true,
  setSelectedProgram,
}) => {
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [search, setSearch] = useState("");
  const [list, setList] = useState(listProp);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [triggerWidth, setTriggerWidth] = useState<number | null>(null);

  useEffect(() => {
    if (triggerRef.current) {
      setTriggerWidth(triggerRef.current.offsetWidth);
    }
  }, []);

  const addCustom = async (custom: string) => {
    const trimmedCustom = custom.trim();

    if (!trimmedCustom) {
      return;
    }

    const programAlreadyExists = list.find(
      (item) => item.metadata?.title?.toLowerCase() === trimmedCustom.toLowerCase()
    );

    let requestProgram: GrantProgram;

    if (programAlreadyExists) {
      requestProgram = programAlreadyExists;

      // Use just programId (no chainId suffix) - service layer normalizes if needed
      setValue("programId", programAlreadyExists.programId || undefined);

      setValue("title", programAlreadyExists.metadata?.title, {
        shouldValidate: true,
      });
    } else {
      const timestamp = Date.now().toString();

      requestProgram = {
        metadata: {
          title: trimmedCustom,
          status: "active",
          description: "",
          website: "",
          tags: [],
        },
        programId: custom,
        chainID: chainId,
        _id: { $oid: custom },
        createdAt: timestamp,
        updatedAt: timestamp,
      };

      setList((prevList) => [...prevList, requestProgram]);

      setValue("programId", undefined);
      setValue("title", trimmedCustom, {
        shouldValidate: true,
      });
    }

    setSelectedProgram(requestProgram);

    setAdding(false);

    if (search.length) {
      setSearch("");
      setTimeout(() => {
        setSearch(trimmedCustom);
      }, 100);
    }

    setTitle("");
  };

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger
        ref={triggerRef}
        className={cn(
          "min-w-40 w-full max-w-max max-md:max-w-full justify-between flex flex-row cursor-default rounded-md bg-white dark:bg-zinc-800 dark:text-zinc-100 py-3 px-4 text-left text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6",
          buttonClassname
        )}
      >
        <div className="flex flex-row gap-4 w-full justify-between items-center">
          <p className="block w-max">
            {selectedProgram?.metadata?.title
              ? selectedProgram.metadata.title
              : grantToEdit
                ? grantToEdit?.details?.title
                : `${prefixUnselected} ${type}`}
          </p>
          <ChevronDownIcon className="h-4 w-4" />
        </div>
      </Popover.Trigger>
      <Popover.Content
        className="mt-4 z-10 bg-white border border-zinc-200 dark:border-zinc-700 rounded-md dark:text-white dark:bg-zinc-800 max-h-60 overflow-y-auto overflow-x-hidden py-2"
        style={{ width: triggerWidth ? `${triggerWidth}px` : "auto" }}
      >
        <Command
          filter={(value, search) => {
            if (value.includes(search)) return 1;
            return 0;
          }}
        >
          {canSearch ? (
            <div className="w-full px-2">
              <CommandInput
                className="rounded-md px-2 w-full dark:text-white dark:bg-zinc-800"
                placeholder={`Search ${type}...`}
                value={search}
                onValueChange={(value) => {
                  setSearch(value);
                }}
              />
            </div>
          ) : null}
          <div className="w-full justify-between items-center flex flex-row px-2 mt-2">
            <p className="text-sm text-slate-700 font-bold">
              {`${pluralize(type, 1)} (${list.length})`}
            </p>
            {canAdd ? (
              adding ? (
                <div className="my-2 px-2">
                  <input
                    className="rounded-md py-1 px-2 w-full dark:text-white dark:bg-zinc-800 border-zinc-200"
                    placeholder={`${pluralize(type, 1)} name...`}
                    value={title}
                    onChange={(e) => {
                      setTitle(e.target.value);
                    }}
                    // on enter key press, add the network
                    onKeyDown={(e: any) => {
                      if (e.key === "Enter") {
                        addCustom(title);
                      }
                    }}
                  />
                </div>
              ) : (
                <div className="my-2 px-2">
                  <button
                    className="text-brand-blue dark:text-blue-200 font-semibold text-sm"
                    onClick={(e) => {
                      e?.preventDefault?.();
                      if (search.length >= 3) {
                        addCustom(search);
                      } else if (search.length) {
                        setTitle(search);
                        setAdding(true);
                      } else {
                        setAdding(true);
                      }
                    }}
                  >
                    Add new
                  </button>
                </div>
              )
            ) : null}
          </div>
          <CommandEmpty className="px-4 py-2">No {type} found.</CommandEmpty>

          <CommandGroup>
            {cleanFunction ? (
              <CommandItem>
                <button
                  type="button"
                  onClick={() => {
                    cleanFunction();
                  }}
                  className="w-full my-1 cursor-pointer hover:opacity-75 text-sm flex flex-row items-center justify-start py-2 px-4 hover:bg-zinc-200 dark:hover:bg-zinc-900 bg-transparent border-none text-left"
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
                </button>
              </CommandItem>
            ) : null}
            {list.map((item, index) => (
              <CommandItem key={index}>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedProgram(item);
                    // Use just programId (no chainId suffix) - service layer normalizes if needed
                    setValue("programId", item?.programId || undefined);
                    setValue("title", item?.metadata?.title, {
                      shouldValidate: true,
                    });
                  }}
                  className="w-full my-1 cursor-pointer hover:opacity-75 text-sm flex flex-row items-center justify-start py-2 px-4 hover:bg-zinc-200 dark:hover:bg-zinc-900 bg-transparent border-none text-left"
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
                        grantToEdit && !selectedProgram
                          ? grantToEdit?.details?.title === item?.metadata?.title
                            ? "block"
                            : "none"
                          : selectedProgram?.metadata?.title === item?.metadata?.title
                            ? "block"
                            : "none",
                    }}
                  />
                </button>
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </Popover.Content>
    </Popover.Root>
  );
};
