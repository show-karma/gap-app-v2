"use client";
/* eslint-disable @next/next/no-img-element */
import { registryHelper } from "@/components/Pages/ProgramRegistry/helper";
import { ProgramDetailsDialog } from "@/components/Pages/ProgramRegistry/ProgramDetailsDialog";
import {
  GrantProgram,
  ProgramList,
} from "@/components/Pages/ProgramRegistry/ProgramList";
import { SearchDropdown } from "@/components/Pages/ProgramRegistry/SearchDropdown";
import Pagination from "@/components/Utilities/Pagination";
import { useRegistryStore } from "@/store/registry";
import { isMemberOfProfile } from "@/utilities/allo/isMemberOf";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";
import { checkIsPoolManager } from "@/utilities/registry/checkIsPoolManager";
import { MagnifyingGlassIcon } from "@heroicons/react/20/solid";
import { CheckIcon } from "@heroicons/react/24/solid";
import { useQuery } from "@tanstack/react-query";
import debounce from "lodash.debounce";
import { useSearchParams } from "next/navigation";
import { useQueryState } from "nuqs";
import React, { Dispatch, useEffect, useState } from "react";
import { useAccount } from "wagmi";

import { errorManager } from "@/components/Utilities/errorManager";
import { LoadingProgramTable } from "./Loading/Programs";
import { ProgramHeader } from "./ProgramHeader";

const statuses = ["Active", "Inactive"];

export const ProgramsExplorer = () => {
  const searchParams = useSearchParams();
  const defaultNetworks = ((searchParams.get("networks") as string) || "")
    .split(",")
    .filter((category) => category.trim());
  const defaultEcosystems = ((searchParams.get("ecosystems") as string) || "")
    .split(",")
    .filter((ecosystem) => ecosystem.trim());
  const defaultGrantTypes = ((searchParams.get("grantTypes") as string) || "")
    .split(",")
    .filter((grantType) => grantType.trim());
  const defaultGrantSize = searchParams.get("grantSize")
    ? ((searchParams.get("grantSize") as string) || "")
        .split(",")
        .filter((grantType) => grantType.trim())
        .map((item) => (isNaN(Number(item)) ? 0 : +item))
        .slice(0, 2)
    : registryHelper.grantSizes;

  const defaultCategories = ((searchParams.get("categories") as string) || "")
    .split(",")
    .filter((category) => category.trim());
  const defaultStatuses = (searchParams.get("status") as string) || "";
  const defaultName = (searchParams.get("name") as string) || "";
  const defaultProgramId = (searchParams.get("programId") as string) || "";

  const [loading, setLoading] = useState(true);
  const pageLimit = 10;

  const [selectedCategory, setSelectedCategory] = useQueryState("categories", {
    defaultValue: defaultCategories,
    serialize: (value) => (value.length ? value?.join(",") : ""),
    parse: (value) => (value.length > 0 ? value.split(",") : []),
  });
  const [status, setStatus] = useQueryState("status", {
    defaultValue: defaultStatuses || "Active",
  });
  const [page, setPage] = useQueryState("page", {
    defaultValue: 1,
    serialize: (value) => value.toString(),
    parse: (value) => parseInt(value),
  });

  const [searchInput, setSearchInput] = useQueryState("name", {
    defaultValue: defaultName,
    throttleMs: 500,
  });

  const [selectedNetworks, setSelectedNetworks] = useQueryState("networks", {
    defaultValue: defaultNetworks,
    serialize: (value) => (value.length ? value?.join(",") : ""),
    parse: (value) => (value.length > 0 ? value.split(",") : []),
  });
  const [selectedEcosystems, setSelectedEcosystems] = useQueryState(
    "ecosystems",
    {
      defaultValue: defaultEcosystems,
      serialize: (value) => (value.length ? value?.join(",") : ""),
      parse: (value) => (value.length > 0 ? value.split(",") : []),
    }
  );
  const [selectedGrantTypes, setSelectedGrantTypes] = useQueryState(
    "grantTypes",
    {
      defaultValue: defaultGrantTypes,
      serialize: (value) => (value.length ? value?.join(",") : ""),
      parse: (value) => (value.length > 0 ? value.split(",") : []),
    }
  );

  const [programId, setProgramId] = useQueryState("programId", {
    defaultValue: defaultProgramId,
    throttleMs: 500,
  });

  const [selectedProgram, setSelectedProgram] = useState<GrantProgram | null>(
    null
  );

  const debouncedSearch = debounce((value: string) => {
    setPage(1);
    setSearchInput(value);
  }, 500);

  const onChangeGeneric = (
    value: string,
    setToChange: Dispatch<React.SetStateAction<string[]>>
  ) => {
    setToChange((oldArray) => {
      setPage(1);
      const newArray = [...oldArray];
      if (newArray.includes(value)) {
        const filteredArray = newArray.filter((item) => item !== value);
        return filteredArray;
      } else {
        newArray.push(value);
      }
      return newArray;
    });
  };

  const pageSize = 10;

  const { address, isConnected } = useAccount();

  const { chain } = useAccount();
  const { setIsRegistryAdmin, setIsPoolManager } = useRegistryStore();
  useEffect(() => {
    if (!address || !isConnected) {
      setIsRegistryAdmin(false);
      return;
    }
    const getMemberOf = async () => {
      try {
        const call = await isMemberOfProfile(address);
        setIsRegistryAdmin(call);
        if (!call) {
          const isManager = await checkIsPoolManager(address);
          setIsPoolManager(isManager);
        }
      } catch (error: any) {
        errorManager(
          `Error while checking if ${address} is a registry admin or pool manager`,
          error
        );
        console.log(error);
      }
    };
    getMemberOf();
  }, [address, isConnected, chain]);

  const { data, isLoading } = useQuery({
    queryKey: [
      "grantPrograms",
      page,
      status,
      searchInput,
      selectedCategory,
      selectedNetworks,
      selectedEcosystems,
      selectedGrantTypes,
    ],
    queryFn: async () => {
      const [res, error] = await fetchData(
        INDEXER.REGISTRY.GET_ALL +
          `?limit=${pageSize}&offset=${(page - 1) * pageSize}${
            searchInput ? `&name=${searchInput}` : ""
          }${
            selectedGrantTypes.length ? `&grantTypes=${selectedGrantTypes}` : ""
          }${status ? `&status=${status}` : ""}${
            selectedNetworks.length
              ? `&networks=${selectedNetworks.join(",")}`
              : ""
          }${
            selectedEcosystems.length
              ? `&ecosystems=${selectedEcosystems.join(",")}`
              : ""
          }${
            selectedCategory.length
              ? `&categories=${selectedCategory.join(",")}`
              : ""
          }`
      );
      if (error) {
        throw new Error(error);
      }
      res.programs.forEach((program: GrantProgram) => {
        if (typeof program.metadata?.grantTypes === "string") {
          program.metadata.grantTypes = [program.metadata.grantTypes];
        }
      });
      return res;
    },
  });
  const grantPrograms = data?.programs || [];
  const totalPrograms = data?.count || 0;

  useEffect(() => {
    setLoading(isLoading);
  }, [isLoading]);

  useEffect(() => {
    const searchProgramById = async (id: string) => {
      try {
        const [data, error] = await fetchData(
          INDEXER.REGISTRY.FIND_BY_ID(id, registryHelper.supportedNetworks)
        );
        if (data) {
          setSelectedProgram(data);
          if (typeof data.metadata?.grantTypes === "string") {
            data.metadata.grantTypes = [data.metadata.grantTypes];
          }
        }
      } catch (error: any) {
        errorManager(`Error while searching for program by id`, error);
        console.log(error);
      }
    };
    if (programId) {
      searchProgramById(programId);
    }
  }, [programId]);

  return (
    <>
      {selectedProgram ? (
        <ProgramDetailsDialog
          program={selectedProgram}
          isOpen={selectedProgram !== null}
          closeModal={() => {
            setProgramId(null);
            setSelectedProgram(null);
          }}
        />
      ) : null}
      <section className="my-8 flex w-full max-w-full flex-col justify-between items-center gap-6 px-6 pb-7 max-2xl:px-4 max-md:px-4 max-md:pt-0 max-md:my-4">
        <ProgramHeader />

        <div className="flex flex-row items-center justify-end max-sm:justify-start gap-2.5  flex-wrap w-full">
          <div className="flex flex-row items-center gap-2  flex-wrap">
            <p className="text-black dark:text-white font-semibold">Status</p>
            <button
              onClick={() => setStatus("")}
              id={`status-all`}
              key={"All"}
              className={`px-3 py-1 min-w-max flex flex-row items-center gap-1 text-sm font-semibold rounded-full cursor-pointer ${
                status === ""
                  ? "bg-black text-white dark:bg-white dark:text-black"
                  : "border border-black text-black dark:border-white dark:text-white"
              }`}
            >
              All
            </button>
            {statuses.map((type) => (
              <button
                id={`status-${type.toLowerCase()}`}
                onClick={() => setStatus(type)}
                key={type}
                className={`px-3 py-1 min-w-max flex flex-row items-center gap-1 text-sm font-semibold rounded-full cursor-pointer ${
                  status === type
                    ? "bg-black text-white dark:bg-white dark:text-black"
                    : "border border-black text-black dark:border-white dark:text-white"
                }`}
              >
                {type}
                {status === type ? <CheckIcon className="w-4 h-4" /> : null}
              </button>
            ))}
          </div>
        </div>

        <div className="w-full">
          <div className="sm:items-center p-3 flex max-sm:flex-col flex-row gap-3 flex-wrap justify-between rounded-[4px] bg-[#F2F4F7] dark:bg-zinc-900">
            <div className="w-full max-w-[450px] max-lg:max-w-xs">
              <label htmlFor="search" className="sr-only">
                Search
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                  <MagnifyingGlassIcon
                    className="h-5 w-5 text-black dark:text-white"
                    aria-hidden="true"
                  />
                </div>
                <input
                  id="search-programs"
                  name="search"
                  className="block w-full rounded-full border-0 bg-white dark:bg-zinc-600 py-1.5 pr-10 pl-3 text-black dark:text-white dark:placeholder:text-zinc-100  placeholder:text-zinc-900  sm:text-sm sm:leading-6"
                  placeholder="Search"
                  type="search"
                  defaultValue={searchInput}
                  onChange={(e) => debouncedSearch(e.target.value)}
                />
              </div>
            </div>
            <div className="flex flex-row gap-2 w-max flex-1 max-md:flex-wrap max-md:flex-col justify-end">
              {/* <GrantSizeSlider
                value={[
                  +minGrantSize,
                  maxGrantSize ? +maxGrantSize : registryHelper.grantSizes[1],
                ]}
                onChangeListener={changeGrantSize}
              /> */}

              <SearchDropdown
                list={registryHelper.networks}
                onSelectFunction={(value: string) =>
                  onChangeGeneric(value, setSelectedNetworks)
                }
                cleanFunction={() => {
                  setSelectedNetworks([]);
                }}
                type={"Networks"}
                selected={selectedNetworks}
                imageDictionary={registryHelper.networkImages}
                id="networks-dropdown"
              />
              <SearchDropdown
                list={registryHelper.ecosystems}
                onSelectFunction={(value: string) =>
                  onChangeGeneric(value, setSelectedEcosystems)
                }
                cleanFunction={() => {
                  setSelectedEcosystems([]);
                }}
                type={"Ecosystems"}
                selected={selectedEcosystems}
                // imageDictionary={}
                id="ecosystems-dropdown"
              />
              <SearchDropdown
                list={registryHelper.grantTypes}
                onSelectFunction={(value: string) =>
                  onChangeGeneric(value, setSelectedGrantTypes)
                }
                cleanFunction={() => {
                  setSelectedGrantTypes([]);
                }}
                type={"Funding Mechanisms"}
                selected={selectedGrantTypes}
                // imageDictionary={}
                id="funding-mechanisms-dropdown"
              />
            </div>
          </div>

          {!loading ? (
            <div className="w-full flex flex-col">
              {grantPrograms.length ? (
                <div className="mt-8 flow-root">
                  <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
                    <div
                      className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8"
                      // {...virtualizer.containerProps}
                    >
                      <ProgramList
                        grantPrograms={grantPrograms}
                        selectProgram={(program) => {
                          setSelectedProgram(program);
                          setProgramId(
                            program._id.$oid || program.programId || ""
                          );
                        }}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-10 px-4 justify-center flex items-center">
                  <p className="text-lg font-normal text-black dark:text-zinc-100">
                    No grant program found
                  </p>
                </div>
              )}
              <Pagination
                currentPage={page}
                setCurrentPage={setPage}
                postsPerPage={pageLimit}
                totalPosts={totalPrograms}
              />
            </div>
          ) : (
            <LoadingProgramTable />
          )}
        </div>
      </section>
    </>
  );
};
