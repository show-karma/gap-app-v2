import { Dispatch, FC, Fragment, useState } from "react";
import { Listbox, Transition } from "@headlessui/react";
import { CheckIcon } from "@heroicons/react/20/solid";
import { ChevronDown } from "../Icons/ChevronDown";

function classNames(...classes: any[]) {
  return classes.filter(Boolean).join(" ");
}

interface DropdownProps {
  list: string[];
  onChangeListener: (
    value: string,
    setToChange: Dispatch<React.SetStateAction<string[]>>
  ) => void;
  setToChange: Dispatch<React.SetStateAction<string[]>>;
  unselectedText: string;
  selected: string[];
}

export const Dropdown: FC<DropdownProps> = ({
  list,
  onChangeListener,
  setToChange,
  selected,
  unselectedText,
}) => {
  return (
    <Listbox>
      {({ open }) => (
        <>
          <div className="relative">
            <Listbox.Button className="relative min-w-40 max-w-52 w-full cursor-default rounded-md bg-white dark:bg-zinc-800 dark:text-zinc-100 py-3 pl-4 pr-12 text-left text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6">
              <span className="block truncate">
                {selected.length
                  ? `${selected.length} selected`
                  : unselectedText}
              </span>
              <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                <ChevronDown className="h-5 w-5 text-black dark:text-white" />
              </span>
            </Listbox.Button>

            <Transition
              show={open}
              as={Fragment}
              leave="transition ease-in duration-100"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
            >
              <Listbox.Options className="absolute z-10 mt-1 max-h-60 min-w-[100px] w-max max-w-full overflow-auto rounded-md bg-white dark:bg-zinc-800 py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
                <Listbox.Option
                  key={"All"}
                  className={({ active }) =>
                    classNames(
                      active
                        ? "bg-indigo-600 text-white dark:text-zinc-100"
                        : "text-gray-900 dark:text-zinc-300",
                      "relative cursor-default select-none py-2 pl-3 pr-12 w-full max-w-full"
                    )
                  }
                  value={"All"}
                  onClick={() => {
                    setToChange([]);
                  }}
                >
                  <div className="flex flex-row gap-3">
                    <span
                      className={"block truncate w-max"}
                      style={{
                        fontWeight: !selected.length ? "600" : "400",
                      }}
                    >
                      All
                    </span>

                    {!selected.length ? (
                      <span
                        className={
                          "absolute inset-y-0 right-0 flex items-center pr-4"
                        }
                      >
                        <CheckIcon className="h-5 w-5" aria-hidden="true" />
                      </span>
                    ) : null}
                  </div>
                </Listbox.Option>
                {list.map((item, index) => (
                  <Listbox.Option
                    key={item}
                    className={({ active }) =>
                      classNames(
                        active
                          ? "bg-indigo-600 text-white dark:text-zinc-100"
                          : "text-gray-900 dark:text-zinc-300",
                        "relative cursor-default select-none py-2 pl-3 pr-12 w-full max-w-full"
                      )
                    }
                    value={item}
                    onClick={() => onChangeListener(item, setToChange)}
                  >
                    <div className="flex flex-row gap-3">
                      <span
                        className={"block truncate w-max"}
                        style={{
                          fontWeight: selected.includes(item) ? "600" : "400",
                        }}
                      >
                        {item}
                      </span>

                      {selected.includes(item) ? (
                        <span
                          className={
                            "absolute inset-y-0 right-0 flex items-center pr-4"
                          }
                        >
                          <CheckIcon className="h-5 w-5" aria-hidden="true" />
                        </span>
                      ) : null}
                    </div>
                  </Listbox.Option>
                ))}
              </Listbox.Options>
            </Transition>
          </div>
        </>
      )}
    </Listbox>
  );
};
