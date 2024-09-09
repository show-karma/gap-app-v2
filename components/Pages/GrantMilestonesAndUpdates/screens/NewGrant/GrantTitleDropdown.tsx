/* eslint-disable @next/next/no-img-element */
import { FC, useEffect, useState } from "react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "cmdk";
import { CheckIcon, ChevronUpDownIcon } from "@heroicons/react/24/solid";
import * as Popover from "@radix-ui/react-popover";
import { cn } from "@/utilities/tailwind";
import { ChevronDown } from "@/components/Icons/ChevronDown";
import pluralize from "pluralize";
import Image from "next/image";
import { GrantProgram } from "@/components/Pages/ProgramRegistry/ProgramList";
import { useAccount } from "wagmi";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";
import { IGrantResponse } from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";
import { registryHelper } from "@/components/Pages/ProgramRegistry/helper";
import { errorManager } from "@/components/Utilities/errorManager";

export const GrantTitleDropdown: FC<{
  setValue: (
    field: string,
    value: string | undefined,
    options?: {
      shouldValidate: boolean;
    }
  ) => void;
  selectedProgram: GrantProgram | null;
  grantToEdit: IGrantResponse | undefined;
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
  list,
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
  const { address: owner } = useAccount();
  const [title, setTitle] = useState("");
  const [search, setSearch] = useState("");

  const addCustom = async (custom: string) => {
    if (!custom) {
      return;
    }
    try {
      const [request, error] = await fetchData(
        INDEXER.REGISTRY.CREATE,
        "POST",
        {
          owner,
          chainId: registryHelper.supportedNetworks,
          metadata: {
            title: custom,
            description: custom,
            socialLinks: {
              grantsSite: "https://gap.showkarma.xyz",
            },
          },
        },
        {},
        {},
        true
      );

      if (error) {
        throw new Error("Error creating program");
      } else {
        list.push(request);
        console.log("Program created successfully");
        setValue("programId", undefined);
        setValue("title", request?.metadata?.title, {
          shouldValidate: true,
        });
        setAdding(false);
        setSelectedProgram(request);
        setOpen(false);
        setSearch("");
        setTitle("");
      }
    } catch (error) {
      errorManager("Error creating program", error, {
        title: custom,
        owner,
      });
    }
  };

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
              : grantToEdit
              ? grantToEdit?.details?.data?.title
              : `${prefixUnselected} ${type}`}
          </p>
          <span>
            <ChevronDown className="h-5 w-5 text-black dark:text-white" />
          </span>
        </div>
      </Popover.Trigger>
      <Popover.Content className="mt-4 w-[400px] z-10 bg-white border border-zinc-200 dark:border-zinc-700 rounded-md dark:text-white dark:bg-zinc-800  max-h-60 overflow-y-auto overflow-x-hidden py-2">
        <Command>
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
          <CommandEmpty className="px-4 py-2">No {type} found.</CommandEmpty>

          <CommandGroup>
            {cleanFunction ? (
              <CommandItem>
                <div
                  onClick={() => {
                    cleanFunction();
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
                      className={cn(
                        "mr-2 h-4 w-4 min-w-4 min-h-4 text-black dark:text-white"
                      )}
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
                    setSelectedProgram(item);
                    setValue(
                      "programId",
                      !item?.programId
                        ? undefined
                        : `${item.programId}_${item.chainID}`
                    );
                    setValue("title", item?.metadata?.title, {
                      shouldValidate: true,
                    });
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
                    className={cn(
                      "mr-2 h-4 w-4 min-w-4 min-h-4 text-black dark:text-white"
                    )}
                    style={{
                      display:
                        grantToEdit && !selectedProgram
                          ? grantToEdit?.details?.data?.title ==
                            item?.metadata?.title
                            ? "block"
                            : "none"
                          : selectedProgram?.metadata?.title ==
                            item?.metadata?.title
                          ? "block"
                          : "none",
                    }}
                  />
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
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
                  className="px-3 py-2 text-sm rounded-md bg-zinc-600 dark:bg-zinc-900 text-white dark:text-white w-full"
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
                  {`Add ${pluralize(type, 1).toLowerCase()}`}
                </button>
              </div>
            )
          ) : null}
        </Command>
      </Popover.Content>
    </Popover.Root>
  );
};
