"use client";
import AddProgram from "@/components/Pages/ProgramRegistry/AddProgram";
import { ManageProgramList } from "@/components/Pages/ProgramRegistry/ManageProgramList";
import { MyProgramList } from "@/components/Pages/ProgramRegistry/MyProgramList";
import { ProgramDetailsDialog } from "@/components/Pages/ProgramRegistry/ProgramDetailsDialog";
import { GrantProgram } from "@/components/Pages/ProgramRegistry/ProgramList";
import { registryHelper } from "@/components/Pages/ProgramRegistry/helper";
import { Button } from "@/components/Utilities/Button";
import Pagination from "@/components/Utilities/Pagination";

import { useStepper } from "@/store/modals/txStepper";
import { useRegistryStore } from "@/store/registry";
import { isMemberOfProfile } from "@/utilities/allo/isMemberOf";
import { useSigner } from "@/utilities/eas-wagmi-utils";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";
import { PAGES } from "@/utilities/pages";
import { checkIsPoolManager } from "@/utilities/registry/checkIsPoolManager";
import {
  ChevronLeftIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/solid";
import { useDynamicContext } from "@dynamic-labs/sdk-react-core";
import { useQuery } from "@tanstack/react-query";
import debounce from "lodash.debounce";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useQueryState } from "nuqs";
import React, { Dispatch, useEffect, useState } from "react";
import toast from "react-hot-toast";

import { errorManager } from "@/components/Utilities/errorManager";
import { LoadingProgramTable } from "./Loading/Programs";
import { SearchDropdown } from "./SearchDropdown";
import { useWallet } from "@/hooks/useWallet";

export const ManagePrograms = () => {
  const searchParams = useSearchParams();
  const defaultTab = searchParams.get("tab") || "";
  const defaultName = searchParams.get("name") || "";
  const defaultSort = searchParams.get("sortField") || "updatedAt";
  const defaultSortOrder = searchParams.get("sortOrder") || "desc";

  const defaultProgramId = searchParams.get("programId") || "";
  const defaultNetworks = ((searchParams.get("networks") as string) || "")
    .split(",")
    .filter((category) => category.trim());

  const defaultEcosystems = ((searchParams.get("ecosystems") as string) || "")
    .split(",")
    .filter((ecosystems) => ecosystems.trim());
  const defaultGrantTypes = ((searchParams.get("grantTypes") as string) || "")
    .split(",")
    .filter((grantType) => grantType.trim());

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

  // const [grantPrograms, setGrantPrograms] = useState<GrantProgram[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [programToEdit, setProgramToEdit] = useState<GrantProgram | null>(null);

  const { address, isLoggedIn } = useWallet();

  const signer = useSigner();

  const {
    setIsRegistryAdmin,
    setIsPoolManager,
    isPoolManager,
    isRegistryAdmin,
    setIsRegistryAdminLoading,
    isRegistryAdminLoading,
    isPoolManagerLoading,
    setIsPoolManagerLoading,
  } = useRegistryStore();

  const isAllowed = address && (isRegistryAdmin || isPoolManager) && isLoggedIn;

  useEffect(() => {
    if (!address || !isLoggedIn) {
      setIsRegistryAdmin(false);
      setIsRegistryAdminLoading(false);
      setIsPoolManagerLoading(false);
      return;
    }

    const getMemberOf = async () => {
      setIsRegistryAdminLoading(true);
      setIsPoolManagerLoading(true);
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
      } finally {
        setIsRegistryAdminLoading(false);
        setIsPoolManagerLoading(false);
      }
    };
    getMemberOf();
  }, [address]);

  const [tab, setTab] = useQueryState("tab", {
    defaultValue: defaultTab || "pending",
  });

  const [page, setPage] = useQueryState("page", {
    defaultValue: 1,
    serialize: (value) => value.toString(),
    parse: (value) => parseInt(value),
  });
  const pageSize = 10;

  const [searchInput, setSearchInput] = useQueryState("name", {
    defaultValue: defaultName,
    throttleMs: 500,
  });

  const [programId, setProgramId] = useQueryState("programId", {
    defaultValue: defaultProgramId,
    throttleMs: 500,
  });

  const [sortField, setSortField] = useQueryState("sortField", {
    defaultValue: defaultSort,
  });

  const [sortOrder, setSortOrder] = useQueryState("sortOrder", {
    defaultValue: defaultSortOrder,
  });

  const [selectedProgram, setSelectedProgram] = useState<GrantProgram | null>(
    null
  );

  useEffect(() => {
    const searchProgramById = async (id: string) => {
      try {
        const [data, error] = await fetchData(
          INDEXER.REGISTRY.FIND_BY_ID(id, registryHelper.supportedNetworks)
        );
        if (error) throw Error(error);
        if (data) {
          data.forEach((program: GrantProgram) => {
            if (typeof program.metadata?.grantTypes === "string") {
              program.metadata.grantTypes = [program.metadata.grantTypes];
            }
          });
          setSelectedProgram(data);
        }
      } catch (error: any) {
        errorManager(`Error while searching for program by id`, error);
      }
    };
    if (programId) {
      searchProgramById(programId);
    }
  }, [programId]);

  const debouncedSearch = debounce((value: string) => {
    setPage(1);
    setSearchInput(value);
  }, 500);

  const getGrantPrograms = async () => {
    try {
      const baseUrl = INDEXER.REGISTRY.GET_ALL;
      const queryParams = `?isValid=${tab}&limit=${pageSize}&offset=${
        (page - 1) * pageSize
      }`;
      const searchParam = searchInput ? `&name=${searchInput}` : "";
      const networkParam = selectedNetworks.length
        ? `&networks=${selectedNetworks.join(",")}`
        : "";
      const ecosystemParam = selectedEcosystems.length
        ? `&ecosystems=${selectedEcosystems.join(",")}`
        : "";

      const grantTypeParam = selectedGrantTypes.length
        ? `&grantTypes=${selectedGrantTypes.join(",")}`
        : "";

      const sortParams = `&sortField=${sortField}&sortOrder=${sortOrder}`;
      const filterParams =
        networkParam + ecosystemParam + grantTypeParam + sortParams;
      const ownerParam =
        address && !isRegistryAdmin ? `&owners=${address}` : "";
      const url = isRegistryAdmin
        ? `${baseUrl}${queryParams}${searchParam}${filterParams}`
        : `${baseUrl}${queryParams}${ownerParam}${searchParam}${filterParams}`;

      const [res, error] = await fetchData(url);
      if (!error && res) {
        res.programs.forEach((program: GrantProgram) => {
          if (typeof program.metadata?.grantTypes === "string") {
            program.metadata.grantTypes = [program.metadata.grantTypes];
          }
        });
        return {
          programs: res.programs as GrantProgram[],
          count: res.count as number,
        };
      } else {
        throw Error(error);
      }
    } catch (error: any) {
      errorManager(`Error while fetching grant programs`, error);
      console.log(error);
      return {
        programs: [] as GrantProgram[],
        count: 0,
      };
    }
  };

  const { data, isLoading, refetch } = useQuery<{
    programs: GrantProgram[];
    count: number;
  }>({
    queryKey: [
      "grantPrograms",
      tab,
      page,
      searchInput,
      isRegistryAdminLoading,
      isPoolManagerLoading,
      selectedEcosystems,
      selectedGrantTypes,
      selectedNetworks,
      sortField,
      sortOrder,
    ],
    queryFn: () => getGrantPrograms(),
    enabled: !isRegistryAdminLoading || !isPoolManagerLoading,
  });
  const grantPrograms = data?.programs || [];
  const totalPrograms = data?.count || 0;

  const refreshPrograms = async () => {
    await refetch();
  };

  const approveOrReject = async (
    program: GrantProgram,
    value: "accepted" | "rejected" | "pending"
  ) => {
    const messageDict = {
      accepted: "approving",
      rejected: "rejecting",
      pending: "pending",
    };
    try {
      const id = program._id.$oid;

      const request = fetchData(
        INDEXER.REGISTRY.APPROVE,
        "POST",
        {
          id,
          isValid: value,
        },
        {},
        {},
        true
      ).then(([res, error]) => {
        if (error) throw Error(error);
        return res;
      });
      await toast.promise(request, {
        loading: `Changing program ${program.metadata?.title} to ${value}...`,
        success: `Program changed to ${value} successfully`,
        error: `Error while changing program ${program.metadata?.title} to ${value}.`,
      });

      await refreshPrograms();
    } catch (error: any) {
      errorManager(
        `Error ${messageDict[value]} program ${program._id.$oid}`,
        error,
        {
          program: program._id.$oid,
          isValid: value,
          address,
        }
      );
      console.log(`Error ${messageDict[value]} program ${program._id.$oid}`);
    }
  };

  const { setShowAuthFlow } = useDynamicContext();

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

  const NotAllowedCases = () => {
    if (!address || !isLoggedIn) {
      return (
        <div className="flex flex-col gap-2 justify-center items-center">
          <p>You need to login to access this page</p>
          <Button
            className="w-max"
            onClick={() => {
              setShowAuthFlow?.(true);
            }}
          >
            Login
          </Button>
        </div>
      );
    }
    return <p>Seems like you do not have programs to manage.</p>;
  };

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
      <section className="my-10 flex w-full max-w-full flex-col justify-between items-center gap-6 px-12 pb-7 pt-5 max-2xl:px-8 max-md:px-4">
        {isEditing ? null : (
          <div className="flex flex-row gap-2 justify-start w-full">
            <Link href={PAGES.REGISTRY.ROOT}>
              <Button className="flex flex-row gap-2 bg-transparent hover:bg-transparent text-[#004EEB] text-sm p-0">
                <ChevronLeftIcon className="w-4 h-4" />
                <p className="border-b border-b-[#004EEB]">
                  Back to Programs Explorer
                </p>
              </Button>
            </Link>
          </div>
        )}
        {isAllowed ? (
          isEditing ? (
            <div className="w-full">
              <AddProgram
                programToEdit={programToEdit}
                backTo={() => {
                  setIsEditing(false);
                  setProgramToEdit(null);
                }}
                refreshPrograms={refreshPrograms}
              />
            </div>
          ) : (
            <>
              <div className="flex flex-row max-lg:gap-10  max-md:flex-col gap-32 justify-between w-full">
                <div className="flex flex-1 flex-col gap-3 items-start justify-start text-left">
                  <h1 className="text-2xl tracking-[-0.72px] 2xl:text-3xl font-bold text-start text-black dark:text-white">
                    Manage Grant Programs
                  </h1>
                </div>
                {/* <div className="h-44 w-[1px] bg-[#98A2B3] max-md:w-full max-md:h-[1px]" />
            <div className="flex flex-1 flex-col gap-2 items-center max-sm:items-start">
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
              <div className="w-full">
                <div className="flex flex-wrap w-max gap-2 rounded-t bg-[#F2F4F7] dark:bg-zinc-800 px-2 py-1">
                  <Button
                    className="bg-transparent text-black"
                    onClick={() => {
                      setPage(1);
                      setTab("pending");
                    }}
                    style={{
                      backgroundColor:
                        tab === "pending" ? "white" : "transparent",
                      color: tab === "pending" ? "black" : "gray",
                    }}
                  >
                    {isRegistryAdmin ? "Pending" : "Waiting for approval"}
                  </Button>
                  <Button
                    className="bg-transparent text-black"
                    onClick={() => {
                      setPage(1);
                      setTab("accepted");
                    }}
                    style={{
                      backgroundColor:
                        tab === "accepted" ? "white" : "transparent",
                      color: tab === "accepted" ? "black" : "gray",
                    }}
                  >
                    Approved
                  </Button>
                  <Button
                    className="bg-transparent text-black"
                    onClick={() => {
                      setPage(1);
                      setTab("rejected");
                    }}
                    style={{
                      backgroundColor:
                        tab === "rejected" ? "white" : "transparent",
                      color: tab === "rejected" ? "black" : "gray",
                    }}
                  >
                    Rejected
                  </Button>
                </div>
                <div className="sm:items-center p-3 flex max-sm:flex-col flex-row gap-3 flex-wrap justify-between rounded-b-[4px] bg-[#F2F4F7] dark:bg-zinc-900">
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
                    />
                  </div>
                </div>
                {!isLoading ? (
                  grantPrograms?.length ? (
                    <div className="mt-8 flow-root">
                      <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
                        <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
                          {isRegistryAdmin ? (
                            <ManageProgramList
                              approveOrReject={approveOrReject}
                              grantPrograms={grantPrograms}
                              tab={tab as "pending" | "accepted" | "rejected"}
                              editFn={(program: GrantProgram) => {
                                setIsEditing(true);
                                setProgramToEdit(program);
                              }}
                              selectProgram={(program: GrantProgram) => {
                                setProgramId(
                                  program._id.$oid || program.programId || ""
                                );
                                setSelectedProgram(program);
                              }}
                              isAllowed={isAllowed}
                            />
                          ) : (
                            <MyProgramList
                              grantPrograms={grantPrograms}
                              tab={tab as "pending" | "accepted" | "rejected"}
                              editFn={(program: GrantProgram) => {
                                setIsEditing(true);
                                setProgramToEdit(program);
                              }}
                              selectProgram={(program: GrantProgram) => {
                                setProgramId(
                                  program._id.$oid || program.programId || ""
                                );
                                setSelectedProgram(program);
                              }}
                              isAllowed={isAllowed}
                              setSortField={setSortField}
                              setSortOrder={setSortOrder}
                            />
                          )}
                          <Pagination
                            currentPage={page}
                            setCurrentPage={setPage}
                            postsPerPage={pageSize}
                            totalPosts={totalPrograms}
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
                  )
                ) : (
                  <LoadingProgramTable />
                )}
              </div>
            </>
          )
        ) : (
          <div className="w-full h-full flex flex-row justify-center items-center">
            <NotAllowedCases />
          </div>
        )}
      </section>
    </>
  );
};
