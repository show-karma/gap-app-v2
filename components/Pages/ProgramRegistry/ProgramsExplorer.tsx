"use client";
/* eslint-disable @next/next/no-img-element */
import React, { Dispatch } from "react";
import { useState, useEffect } from "react";
import { MagnifyingGlassIcon } from "@heroicons/react/20/solid";
import { CheckIcon } from "@heroicons/react/24/solid";
import { Spinner } from "@/components/Utilities/Spinner";
import debounce from "lodash.debounce";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";
import { GrantProgram, ProgramList } from "@/components/Pages/ProgramRegistry/ProgramList";
import { registryHelper } from "@/components/Pages/ProgramRegistry/helper";
import { SearchDropdown } from "@/components/Pages/ProgramRegistry/SearchDropdown";
import { useQueryState } from "nuqs";
import { useAccount } from "wagmi";
import Pagination from "@/components/Utilities/Pagination";
import { ProgramDetailsDialog } from "@/components/Pages/ProgramRegistry/ProgramDetailsDialog";
import { isMemberOfProfile } from "@/utilities/allo/isMemberOf";
import { checkIsPoolManager } from "@/utilities/registry/checkIsPoolManager";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ExternalLink } from "@/components/Utilities/ExternalLink";
import { useRegistryStore } from "@/store/registry";
import { getGrantProgramAverageScore } from "@/utilities/review/getGrantProgramAverageScore";

const statuses = ["Active", "Inactive"];

const links = {
  funding_block: "https://tally.so/r/w2rJ8M",
  add_program: "/funding-map/add-program",
  cryptographer: "https://sovs.notion.site/Cartographer-Syndicate-a574b48ae162451cb73c17326f471b6a",
  notion: "https://www.notion.so/sovs/Onchain-Grant-Registry-8fde2610cf6c4422a07216d4b2506c73",
};

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
  const [selectedEcosystems, setSelectedEcosystems] = useQueryState("ecosystems", {
    defaultValue: defaultEcosystems,
    serialize: (value) => (value.length ? value?.join(",") : ""),
    parse: (value) => (value.length > 0 ? value.split(",") : []),
  });
  const [selectedGrantTypes, setSelectedGrantTypes] = useQueryState("grantTypes", {
    defaultValue: defaultGrantTypes,
    serialize: (value) => (value.length ? value?.join(",") : ""),
    parse: (value) => (value.length > 0 ? value.split(",") : []),
  });

  const [programId, setProgramId] = useQueryState("programId", {
    defaultValue: defaultProgramId,
    throttleMs: 500,
  });

  const [selectedProgram, setSelectedProgram] = useState<GrantProgram | null>(null);

  const debouncedSearch = debounce((value: string) => {
    setPage(1);
    setSearchInput(value);
  }, 500);

  const onChangeGeneric = (
    value: string,
    setToChange: Dispatch<React.SetStateAction<string[]>>,
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
      } catch (error) {
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
          }${selectedGrantTypes.length ? `&grantTypes=${selectedGrantTypes}` : ""}${
            status ? `&status=${status}` : ""
          }${selectedNetworks.length ? `&networks=${selectedNetworks.join(",")}` : ""}${
            selectedEcosystems.length ? `&ecosystems=${selectedEcosystems.join(",")}` : ""
          }${selectedCategory.length ? `&categories=${selectedCategory.join(",")}` : ""}`,
      );
      if (error) {
        throw new Error(error);
      }
      return res;
    },
  });
  const grantPrograms = data?.programs || [];
  const totalPrograms = data?.count || 0;

  const [grantProgramsWithScore, setGrantProgramsWithScore] = useState<GrantProgram[] | undefined>(
    undefined,
  );
  useEffect(() => {
    setLoading(true);

    const programsWithScore = (grantPrograms as GrantProgram[]).map(
      async (program: GrantProgram) => {
        let programScore: undefined | number;
        if (program?.programId) {
          try {
            /**
             * Refer to getGrantProgramAverageScore.ts to identify the cases when the score is undefined.
             */
            programScore =
              (await getGrantProgramAverageScore(Number(program.programId))) || undefined;
          } catch {
            programScore = undefined;
          }
        }

        return { ...program, programScore };
      },
    );

    Promise.allSettled(programsWithScore)
      .then((scoredPrograms) => {
        const grantProgramsWithScore: GrantProgram[] = [];

        scoredPrograms.forEach((program, idx) => {
          if (program.status === "fulfilled") {
            grantProgramsWithScore.push(program.value);
          } else {
            grantProgramsWithScore.push(grantPrograms[idx]);
          }
        });

        setGrantProgramsWithScore(grantProgramsWithScore);
      })
      .catch((error) => {
        setGrantProgramsWithScore([...grantPrograms]);
      });

    setLoading(false);
  }, [grantPrograms]);

  useEffect(() => {
    setLoading(isLoading);
  }, [isLoading]);

  useEffect(() => {
    const searchProgramById = async (id: string) => {
      try {
        const [data, error] = await fetchData(
          INDEXER.REGISTRY.FIND_BY_ID(id, registryHelper.supportedNetworks),
        );
        if (data) {
          setSelectedProgram(data);
        }
      } catch (error) {
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
        <div className="flex flex-col w-full gap-3">
          <div className="flex flex-[3] flex-col gap-3 items-start justify-start text-left max-lg:gap-1">
            <h1 className="text-2xl tracking-[-0.72px] 2xl:text-4xl font-bold text-start text-black dark:text-white max-lg:tracking-normal">
              {`The best grant program directory you’ll find`}
            </h1>
            <p className="text-start text-lg max-lg:text-base max-w-5xl text-black dark:text-white">
              Explore our curated list of grant programs for innovators and creators: from tech
              pioneers to community leaders, there is a grant program to elevate your project. Find
              and apply for a grant now!
            </p>
          </div>
          <div className="flex flex-row gap-4 flex-wrap">
            <div className="bg-[#DBFFC5] flex flex-row gap-3 px-3 py-4 rounded-lg w-full max-w-[312px] h-[96px] max-md:h-full max-sm:max-w-full">
              <img src="/icons/funding.png" alt="Funding" className="w-6 h-6 mt-1" />
              <div className="flex flex-col gap-1">
                <p className="text-black text-sm font-semibold">Looking for funding?</p>
                <p className="text-[#344054] text-sm font-normal">
                  <ExternalLink
                    href={links.funding_block}
                    className="text-[#155EEF] underline font-semibold"
                  >
                    Get notified
                  </ExternalLink>{" "}
                  when we add a new grant or bounty
                </p>
              </div>
            </div>
            <div className="bg-[#DDF9F2] flex flex-row gap-3 px-3 py-4 rounded-lg w-full max-w-[312px] h-[96px] max-md:h-full max-sm:max-w-full">
              <img src="/icons/reward.png" alt="Reward" className="w-6 h-6 mt-1" />
              <div className="flex flex-col gap-1">
                <p className="text-black text-sm font-semibold">Are we missing a grant program?</p>
                <p className="text-[#344054] text-sm font-normal">
                  <ExternalLink
                    href={links.add_program}
                    className="text-[#155EEF] underline font-semibold"
                  >
                    Submit a program
                  </ExternalLink>{" "}
                  and get rewarded
                </p>
              </div>
            </div>
            <div className="bg-[#E0EAFF] flex flex-row gap-3 px-3 py-4 rounded-lg w-full max-w-[312px] h-[96px] max-md:h-full max-sm:max-w-full">
              <img
                src="/icons/karma-program-registry-syndicate.png"
                alt="Cartographer Syndicate"
                className="w-6 h-6 mt-1"
              />
              <div className="flex flex-col gap-1">
                <p className="text-black text-sm font-semibold">
                  This registry is maintained by the Cartographer Syndicate.
                </p>
                <p className="text-[#344054] text-sm font-normal">
                  <ExternalLink
                    href={links.cryptographer}
                    className="text-[#155EEF] underline font-semibold"
                  >
                    Learn more
                  </ExternalLink>{" "}
                  about it
                </p>
              </div>
            </div>
            <div className="bg-[#ECE9FE] flex flex-row gap-3 px-3 py-4 rounded-lg w-full max-w-[312px] h-[96px] max-md:h-full max-sm:max-w-full">
              <img src="/icons/karma-logo-rounded.png" alt="Karma Logo" className="w-6 h-6 mt-1" />
              <div className="flex flex-col gap-1">
                <p className="text-black text-sm font-semibold">
                  Our vision and roadmap for the funding map.
                </p>
                <p className="text-[#344054] text-sm font-normal">
                  <ExternalLink
                    href={links.notion}
                    className="text-[#155EEF] underline font-semibold"
                  >
                    Learn more
                  </ExternalLink>{" "}
                  about it.
                </p>
              </div>
            </div>
          </div>
          {/* <div className="flex flex-1 flex-col gap-2 items-center max-sm:items-start">
            <div className="flex flex-1 flex-col gap-2 items-start">
              <p className="text-brand-darkblue dark:text-white font-body font-semibold text-xl">
                Be the first to know a new program launches
              </p>
              <div className="flex flex-row gap-4 max-sm:flex-col max-sm:w-full">
                <input
                  className="border rounded-lg w-full max-w-96 text-base px-3.5 py-3 border-black  max-sm:w-full dark:border-white bg-transparent dark:text-white text-black placeholder:dark:text-zinc-500 placeholder:text-zinc-800"
                  placeholder="Enter your e-mail"
                />
                <button className="bg-[#0E101B] w-max text-base dark:bg-slate-800 max-sm:w-full text-white px-10 py-2.5 rounded-lg">
                  Subscribe
                </button>
              </div>
            </div>
          </div> */}
        </div>

        <div className="flex flex-row items-center justify-end max-sm:justify-start gap-2.5  flex-wrap w-full">
          <div className="flex flex-row items-center gap-2 flex-wrap">
            <button
              onClick={() => {
                setSelectedCategory([]);
              }}
              key={"All"}
              className={`px-3 py-1 min-w-max flex flex-row items-center gap-1 text-sm font-semibold rounded-full cursor-pointer ${
                !selectedCategory.length
                  ? "bg-black text-white dark:bg-white dark:text-black"
                  : "border border-black text-black dark:border-white dark:text-white"
              }`}
            >
              All categories
              {!selectedCategory.length ? <CheckIcon className="w-4 h-4" /> : null}
            </button>
            {registryHelper.categories.map((type) => (
              <button
                onClick={() => {
                  onChangeGeneric(type, setSelectedCategory);
                }}
                key={type}
                className={`px-3 py-1 min-w-max flex flex-row items-center gap-1 text-sm font-semibold rounded-full cursor-pointer ${
                  selectedCategory.includes(type)
                    ? "bg-black text-white dark:bg-white dark:text-black"
                    : "border border-black text-black dark:border-white dark:text-white"
                }`}
              >
                {type}
                {selectedCategory.includes(type) ? <CheckIcon className="w-4 h-4" /> : null}
              </button>
            ))}
          </div>
          <div className="flex flex-row items-center gap-2  flex-wrap">
            <p className="text-black dark:text-white font-semibold">Status</p>
            <button
              onClick={() => setStatus("")}
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
                  id="search"
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
                onSelectFunction={(value: string) => onChangeGeneric(value, setSelectedNetworks)}
                cleanFunction={() => {
                  setSelectedNetworks([]);
                }}
                type={"Networks"}
                selected={selectedNetworks}
                imageDictionary={registryHelper.networkImages}
              />
              <SearchDropdown
                list={registryHelper.ecosystems}
                onSelectFunction={(value: string) => onChangeGeneric(value, setSelectedEcosystems)}
                cleanFunction={() => {
                  setSelectedEcosystems([]);
                }}
                type={"Ecosystems"}
                selected={selectedEcosystems}
                // imageDictionary={}
              />
              <SearchDropdown
                list={registryHelper.grantTypes}
                onSelectFunction={(value: string) => onChangeGeneric(value, setSelectedGrantTypes)}
                cleanFunction={() => {
                  setSelectedGrantTypes([]);
                }}
                type={"Funding Mechanisms"}
                selected={selectedGrantTypes}
                // imageDictionary={}
              />
            </div>
          </div>

          {!loading && typeof grantProgramsWithScore !== "undefined" ? (
            <div className="w-full flex flex-col">
              {grantPrograms.length ? (
                <div className="mt-8 flow-root">
                  <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-6">
                    <div
                      className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8"
                      // {...virtualizer.containerProps}
                    >
                      <ProgramList
                        grantPrograms={grantProgramsWithScore}
                        selectProgram={(program) => {
                          setSelectedProgram(program);
                          setProgramId(program.programId || "");
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
            <div className="py-10 px-4 justify-center flex items-center">
              <Spinner />
            </div>
          )}
        </div>
      </section>
    </>
  );
};
