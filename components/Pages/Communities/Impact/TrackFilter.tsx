import { Listbox, Transition } from "@headlessui/react";
import { CheckIcon } from "@heroicons/react/20/solid";
import { ChevronDownIcon } from "@heroicons/react/24/solid";
import { useSearchParams } from "next/navigation";
import pluralize from "pluralize";
import type React from "react";
import { Fragment, useEffect, useState } from "react";
import { useTracksForProgram } from "@/hooks/useTracks";
import type { Track } from "@/services/tracks";
import { cn } from "@/utilities/tailwind";

interface TrackFilterProps {
  onChange: (trackIds: string[] | null) => void;
  selectedTrackIds?: string[];
  communityUid: string;
}

export const TrackFilter: React.FC<TrackFilterProps> = ({ onChange, selectedTrackIds = [] }) => {
  const [initialLoad, setInitialLoad] = useState(true);
  const params = useSearchParams();
  const programIdParam = params.get("programId");
  const { data: tracks = [], isLoading, isError } = useTracksForProgram(programIdParam as string);

  useEffect(() => {
    // Skip the initial change trigger to avoid overriding URL params
    if (initialLoad && tracks.length > 0) {
      setInitialLoad(false);
    }
  }, [tracks, initialLoad]);

  if (isError || (!isLoading && tracks.length === 0)) {
    return null;
  }

  const handleChange = (newTrackIds: string[]) => {
    if (newTrackIds.length === 0) {
      onChange(null);
    } else {
      onChange(newTrackIds);
    }
  };

  return (
    <Listbox value={selectedTrackIds} onChange={handleChange} multiple>
      {({ open }) => (
        <div className="flex items-center gap-x-2 max-sm:w-full max-sm:justify-between">
          <div className="relative flex-1 w-max">
            <Listbox.Button className="cursor-pointer items-center relative w-full rounded-md pr-8 text-left sm:text-sm sm:leading-6 text-black dark:text-white text-base font-normal">
              <div className="flex items-center gap-2">
                {selectedTrackIds.length > 0 ? (
                  <p className="flex flex-row gap-1">
                    {selectedTrackIds.length} {pluralize("track", selectedTrackIds.length)} selected
                  </p>
                ) : (
                  <p>All Tracks</p>
                )}
              </div>
              <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                <ChevronDownIcon className="h-4 w-4 text-gray-400" aria-hidden="true" />
              </span>
            </Listbox.Button>

            <Transition
              show={open}
              as={Fragment}
              leave="transition ease-in duration-100"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
            >
              <Listbox.Options className="absolute z-10 mt-1 max-h-60 w-max overflow-auto rounded-md bg-white py-1 text-base dark:bg-zinc-800 dark:text-zinc-200 ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
                {isLoading ? (
                  <div className="relative cursor-default select-none py-2 pl-3 pr-9">
                    Loading tracks...
                  </div>
                ) : (
                  tracks.map((track: Track) => (
                    <Listbox.Option
                      key={track.id}
                      className={({ active }) =>
                        cn(
                          active
                            ? "bg-gray-100 text-black dark:text-gray-300 dark:bg-zinc-900"
                            : "text-gray-900 dark:text-gray-200",
                          "relative cursor-default select-none py-2 pl-3 pr-9 transition-all ease-in-out duration-200"
                        )
                      }
                      value={track.id}
                    >
                      {({ selected, active }) => (
                        <>
                          <div className="flex items-center">
                            <span
                              className={cn(
                                selected ? "font-semibold" : "font-normal",
                                "block truncate"
                              )}
                            >
                              {track.name}
                            </span>
                          </div>

                          {selected ? (
                            <span
                              className={cn(
                                "text-blue-600 dark:text-blue-400",
                                "absolute inset-y-0 right-0 flex items-center pr-4"
                              )}
                            >
                              <CheckIcon className="h-5 w-5" aria-hidden="true" />
                            </span>
                          ) : null}
                        </>
                      )}
                    </Listbox.Option>
                  ))
                )}
              </Listbox.Options>
            </Transition>
          </div>
        </div>
      )}
    </Listbox>
  );
};
