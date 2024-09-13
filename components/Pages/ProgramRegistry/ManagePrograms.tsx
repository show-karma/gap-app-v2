"use client";
import React, { useMemo } from "react";
import { useState, useEffect } from "react";
import { Spinner } from "@/components/Utilities/Spinner";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";
import { GrantProgram } from "@/components/Pages/ProgramRegistry/ProgramList";
import { ManageProgramList } from "@/components/Pages/ProgramRegistry/ManageProgramList";
import toast from "react-hot-toast";
import { Button } from "@/components/Utilities/Button";
import { useQueryState } from "nuqs";
import AddProgram from "@/components/Pages/ProgramRegistry/AddProgram";
import { useAccount, useSwitchChain } from "wagmi";
import { useAuthStore } from "@/store/auth";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import {
  ChevronLeftIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/solid";
import Link from "next/link";
import { PAGES } from "@/utilities/pages";
import { useSigner } from "@/utilities/eas-wagmi-utils";
import Pagination from "@/components/Utilities/Pagination";
import debounce from "lodash.debounce";
import { ProgramDetailsDialog } from "@/components/Pages/ProgramRegistry/ProgramDetailsDialog";
import { registryHelper } from "@/components/Pages/ProgramRegistry/helper";
import { isMemberOfProfile } from "@/utilities/allo/isMemberOf";
import { checkIsPoolManager } from "@/utilities/registry/checkIsPoolManager";
import { MyProgramList } from "@/components/Pages/ProgramRegistry/MyProgramList";
import { useStepper } from "@/store/modals/txStepper";
import { useSearchParams } from "next/navigation";
import { useRegistryStore } from "@/store/registry";
import { useQuery } from "@tanstack/react-query";

import { errorManager } from "@/components/Utilities/errorManager";
import { sanitizeObject } from "@/utilities/sanitize";

export const ManagePrograms = () => {
  const searchParams = useSearchParams();
  const defaultTab = searchParams.get("tab") || "";
  const defaultName = searchParams.get("name") || "";
  const defaultProgramId = searchParams.get("programId") || "";

  // const [grantPrograms, setGrantPrograms] = useState<GrantProgram[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [programToEdit, setProgramToEdit] = useState<GrantProgram | null>(null);

  const { address, isConnected } = useAccount();
  const { isAuth } = useAuthStore();

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

  const isAllowed = address && (isRegistryAdmin || isPoolManager) && isAuth;

  useEffect(() => {
    if (!address || !isConnected) {
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

  const [selectedProgram, setSelectedProgram] = useState<GrantProgram | null>(
    null
  );

  useEffect(() => {
    const searchProgramById = async (id: string) => {
      try {
        const [data, error] = await fetchData(
          INDEXER.REGISTRY.FIND_BY_ID(id, registryHelper.supportedNetworks)
        );
        if (data) {
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
      const ownerParam =
        address && !isRegistryAdmin ? `&owners=${address}` : "";
      const url = isRegistryAdmin
        ? `${baseUrl}${queryParams}${searchParam}`
        : `${baseUrl}${queryParams}${ownerParam}${searchParam}`;

      const [res, error] = await fetchData(url);
      if (!error && res) {
        return {
          programs: res.programs as GrantProgram[],
          count: res.count as number,
        };
      } else {
        return {
          programs: [] as GrantProgram[],
          count: 0,
        };
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
    ],
    queryFn: () => getGrantPrograms(),
    enabled: !isRegistryAdminLoading || !isPoolManagerLoading,
  });
  const grantPrograms = data?.programs || [];
  const totalPrograms = data?.count || 0;

  const { switchChainAsync } = useSwitchChain();
  const { changeStepperStep, setIsStepper } = useStepper();

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
        if (error)
          throw new Error(
            `Error while changing program ${program.metadata?.title} to ${value}.`
          );
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
        error
      );
      console.log(`Error ${messageDict[value]} program ${program._id.$oid}`);
    }
  };

  const { openConnectModal } = useConnectModal();

  const NotAllowedCases = () => {
    if (!address || !isAuth || !isConnected) {
      return (
        <div className="flex flex-col gap-2 justify-center items-center">
          <p>You need to login to access this page</p>
          <Button
            className="w-max"
            onClick={() => {
              openConnectModal?.();
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
                                setProgramId(program.programId || "");
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
                                setProgramId(program.programId || "");
                                setSelectedProgram(program);
                              }}
                              isAllowed={isAllowed}
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
                  <div className="py-10 px-4 justify-center flex items-center">
                    <Spinner />
                  </div>
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
