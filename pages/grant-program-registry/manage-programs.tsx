/* eslint-disable @next/next/no-img-element */
"use client";
import React from "react";
import { NextSeo } from "next-seo";
import { defaultMetadata } from "@/utilities/meta";
import { useState, useEffect } from "react";
import { Spinner } from "@/components/Utilities/Spinner";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";
import { GrantProgram } from "@/components/Pages/ProgramRegistry/ProgramList";
import {
  ProgramListPending,
  accountsAllowedManagePrograms,
} from "@/components/Pages/ProgramRegistry/ProgramListPending";
import toast from "react-hot-toast";
import { Button } from "@/components/Utilities/Button";
import { useQueryState } from "nuqs";
import { GetServerSidePropsContext, InferGetServerSidePropsType } from "next";
import AddProgram from "@/components/Pages/ProgramRegistry/AddProgram";
import {
  useAccount,
  useBlockNumber,
  useNetwork,
  useSwitchNetwork,
} from "wagmi";
import { useAuthStore } from "@/store/auth";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { ChevronLeftIcon } from "@heroicons/react/24/solid";
import Link from "next/link";
import { PAGES } from "@/utilities/pages";
import { envVars } from "@/utilities/enviromentVars";
import { NFTStorage } from "nft.storage";
import { getWalletClient } from "@wagmi/core";
import { walletClientToSigner } from "@/utilities/eas-wagmi-utils";
import { AlloBase } from "@show-karma/karma-gap-sdk/core/class/GrantProgramRegistry/Allo";
import {
  Address,
  ApplicationMetadata,
  GrantArgs,
} from "@show-karma/karma-gap-sdk/core/class/types/allo";
import { AlloContracts } from "@show-karma/karma-gap-sdk";

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const { query } = context;
  const defaultTab = (query.tab as string) || "";

  return {
    props: {
      defaultTab,
    },
  };
}

const GrantProgramRegistry = ({
  defaultTab,
}: InferGetServerSidePropsType<typeof getServerSideProps>) => {
  const [grantPrograms, setGrantPrograms] = useState<GrantProgram[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [programToEdit, setProgramToEdit] = useState<GrantProgram | null>(null);

  const { address, isConnected } = useAccount();
  const { isAuth } = useAuthStore();
  const isAllowed =
    address &&
    accountsAllowedManagePrograms.includes(address.toLowerCase()) &&
    isAuth;

  const [tab, setTab] = useQueryState("tab", {
    defaultValue: defaultTab || "pending",
  });

  const dynamicMetadata = {
    title: `Karma GAP - Grant Program Aggregator`,
    description: `View the list of grant programs issued by various ecosystems.`,
  };

  const pageSize = 10;
  const [offset, setOffset] = useState(0);

  const fetchMoreData = async () => {
    try {
      const newOffset = offset + pageSize;
      setOffset(newOffset);
      await fetchData(
        INDEXER.REGISTRY.GET_ALL +
          `?limit=${pageSize}&offset=${newOffset}&isValid=${tab}`
      ).then(([res, error]) => {
        if (!error && res) {
          setGrantPrograms((oldArray) => [...oldArray, ...res]);
          setHasMore(res.length === pageSize);
        }
      });
    } catch (error: any) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  const getGrantPrograms = async () => {
    setLoading(true);
    setOffset(0);
    try {
      await fetchData(INDEXER.REGISTRY.GET_ALL + `?isValid=${tab}`).then(
        ([res, error]) => {
          if (!error && res) {
            setGrantPrograms(res);
            setHasMore(res.length === pageSize);
          }
        }
      );
    } catch (error: any) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getGrantPrograms();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const { chain } = useNetwork();
  const { switchNetworkAsync } = useSwitchNetwork();

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
      const { programId, createdAtBlock, chainID, metadata, createdByAddress } =
        program;
      if (value === "accepted" && !programId && !createdAtBlock) {
        if (!isConnected || !isAuth) {
          openConnectModal?.();
          return;
        }
        if (chain && chain.id !== chainID) {
          await switchNetworkAsync?.(chainID);
        }

        const ipfsStorage = new NFTStorage({
          token: envVars.IPFS_TOKEN,
        });

        const walletClient = await getWalletClient({
          chainId: chainID,
        });
        if (!walletClient) return;
        const walletSigner = await walletClientToSigner(walletClient);
        const _currentTimestamp = Math.floor(new Date().getTime() / 1000);
        const matchinFundAmount = 0;

        const allo = new AlloBase(
          walletSigner as any,
          ipfsStorage,
          chainID as number
        );

        const profileId =
          "0x418102f570483423fc7d431e0efd1cc5d49f2b3fe4c85cb7d837bcfa83e7db03"; // Karma Test Program 3

        const applicationMetadata: ApplicationMetadata = {
          version: "1.0.0",
          lastUpdatedOn: new Date().getTime(),
          applicationSchema: {
            questions: [
              {
                id: 0,
                info: "Email Address",
                type: "email",
                title: "Email Address",
                hidden: false,
                required: false,
                encrypted: false,
              },
            ],
            requirements: {
              github: {
                required: false,
                verification: false,
              },
              twitter: {
                required: false,
                verification: false,
              },
            },
          },
        };

        const args: any = {
          profileId,
          roundMetadata: metadata,
          applicationStart: _currentTimestamp + 3600, // 1 hour later   registrationStartTime
          applicationEnd: _currentTimestamp + 432000, // 5 days later   registrationEndTime
          roundStart: _currentTimestamp + 7200, // 2 hours later  allocationStartTime
          roundEnd: _currentTimestamp + 864000, // 10 days later  allocaitonEndTime
          matchingFundAmt: matchinFundAmount,
          applicationMetadata,
          managers: [program.createdByAddress as Address], // managers
          strategy: AlloContracts.strategy
            .DonationVotingMerkleDistributionDirectTransferStrategy as Address, // strategy
          payoutToken: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", // Eg. ETH
        };

        const hasRegistry = await allo
          .createGrant(args)
          .then((res) => {
            return res;
          })
          .catch((error) => {
            throw new Error(error);
          });
        console.log(hasRegistry);
        if (!hasRegistry) {
          throw new Error("No registry found");
        }
        const { txHash } = hasRegistry;
        const [request, error] = await fetchData(
          INDEXER.REGISTRY.APPROVE,
          "POST",
          {
            txHash,
            id,
            isValid: value,
          },
          {},
          {},
          true
        );
        if (error) throw new Error("Error approving program");
      } else {
        const [request, error] = await fetchData(
          INDEXER.REGISTRY.APPROVE,
          "POST",
          {
            id,
            isValid: value,
          },
          {},
          {},
          true
        );
        if (error) throw new Error(`Program failed when updating to ${value}`);
      }
      toast.success(`Program ${value} successfully`);
      await getGrantPrograms();
    } catch {
      console.log(`Error ${messageDict[value]} program ${program._id.$oid}`);
      toast.error(`Error ${messageDict[value]} program ${program._id.$oid}`);
    }
  };

  const { openConnectModal } = useConnectModal();

  const NotAllowedCases = () => {
    if (!address || !isAuth || !isConnected) {
      <div>
        <p>You need to login to access this page</p>
        <Button
          onClick={() => {
            openConnectModal?.();
          }}
        >
          Login
        </Button>
      </div>;
    }
    return <p>Only admins are allowed to use this page</p>;
  };

  return (
    <>
      <NextSeo
        title={dynamicMetadata.title || defaultMetadata.title}
        description={dynamicMetadata.description || defaultMetadata.description}
        twitter={{
          handle: defaultMetadata.twitter.creator,
          site: defaultMetadata.twitter.site,
          cardType: "summary_large_image",
        }}
        openGraph={{
          url: defaultMetadata.openGraph.url,
          title: dynamicMetadata.title || defaultMetadata.title,
          description:
            dynamicMetadata.description || defaultMetadata.description,
          images: defaultMetadata.openGraph.images.map((image) => ({
            url: image,
            alt: dynamicMetadata.title || defaultMetadata.title,
          })),
          site_name: defaultMetadata.openGraph.siteName,
        }}
        additionalLinkTags={[
          {
            rel: "icon",
            href: "/images/favicon.png",
          },
        ]}
      />
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
                refreshPrograms={getGrantPrograms}
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
              <p className="text-[#101828] dark:text-white font-body font-semibold text-xl">
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
                <div className="flex flex-wrap w-max gap-2 rounded bg-[#F2F4F7] dark:bg-zinc-800 px-2 py-1">
                  <Button
                    className="bg-transparent text-black"
                    onClick={() => {
                      setTab("pending");
                    }}
                    style={{
                      backgroundColor:
                        tab === "pending" ? "white" : "transparent",
                      color: tab === "pending" ? "black" : "gray",
                    }}
                  >
                    Pending
                  </Button>
                  <Button
                    className="bg-transparent text-black"
                    onClick={() => {
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
                {!loading ? (
                  grantPrograms.length ? (
                    <div className="mt-8 flow-root">
                      <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
                        <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
                          <ProgramListPending
                            approveOrReject={approveOrReject}
                            grantPrograms={grantPrograms}
                            hasMore={hasMore}
                            nextFunc={() => {
                              fetchMoreData();
                            }}
                            tab={tab as "pending" | "accepted" | "rejected"}
                            editFn={(program: GrantProgram) => {
                              setIsEditing(true);
                              setProgramToEdit(program);
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

export default GrantProgramRegistry;
