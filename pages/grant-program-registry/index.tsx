/* eslint-disable @next/next/no-img-element */
"use client";
import React, { Dispatch } from "react";
import { NextSeo } from "next-seo";
import { defaultMetadata } from "@/utilities/meta";
import { useState, useEffect } from "react";
import { MagnifyingGlassIcon } from "@heroicons/react/20/solid";
import axios from "axios";
import { envVars } from "@/utilities/enviromentVars";
import { chainNameDictionary } from "@/utilities/chainNameDictionary";
import { chainImgDictionary } from "@/utilities/chainImgDictionary";
import { CheckCircleIcon, CheckIcon } from "@heroicons/react/24/solid";
import { formatDate } from "@/utilities/formatDate";
import formatCurrency from "@/utilities/formatCurrency";
import { Spinner } from "@/components/Utilities/Spinner";
import Link from "next/link";
import { PAGES } from "@/utilities/pages";
import debounce from "lodash.debounce";
import { Dropdown } from "@/components/Utilities/Dropdown";
import { GrantSizeSlider } from "@/components/GrantSizeSlider";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";
import { ReadMore } from "@/utilities/ReadMore";
import InfiniteScroll from "react-infinite-scroll-component";

type GrantProgram = {
  _id: {
    $oid: string;
  };
  name?: string;
  createdAtBlock?: string;
  createdByAddress?: string;
  metadata?: {
    tags?: string[];
    type?: string;
    title?: string;
    discord?: string;
    endDate?: string;
    logoImg?: string;
    website?: string;
    bounties?: string[];
    bannerImg?: string;
    createdAt?: number;
    grantSize?: string;
    startDate?: string;
    categories?: string[];
    ecosystems?: string[];
    credentials?: {};
    description?: string;
    logoImgData?: string;
    grantsIssued?: number;
    bannerImgData?: string;
    linkToDetails?: string;
    programBudget?: string;
    projectTwitter?: string;
    applicantsNumber?: number;
    amountDistributedToDate?: string;
  };
  tags?: string[];
  updatedAtBlock?: string;
  projectNumber?: null;
  projectType?: string;
  registryAddress?: string;
  anchorAddress?: string;
  programId?: string;
  chainID?: number;
  isValid?: boolean;
  createdAt: {
    $timestamp: {
      t: number;
      i: number;
    };
  };
  updatedAt: {
    $timestamp: {
      t: number;
      i: number;
    };
  };
};

export const categories = ["DEX", "DeFi"];
const statuses = ["Active", "Inactive"];
export const ecosystems = ["EVM", "Solana", "Cosmos", "NEAR"];
export const communities = ["Arbitrum", "Optimism", "Gitcoin"];
export const grantTypes = ["Retroactive", "Proactive", "Bounty"];

export default function GrantProgramRegistry({}) {
  const [grants, setGrants] = useState<GrantProgram[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);

  const [selectedCategory, setSelectedCategory] = useState<string[]>([]);
  const [status, setStatus] = useState("");

  const [searchInput, setSearchInput] = useState("");
  const [selectedGrantSize, setSelectedGrantSize] = useState([0, 10000000]);
  const [selectedEcosystems, setSelectedEcosystems] = useState<string[]>([]);
  const [selectedCommunities, setSelectedCommunities] = useState<string[]>([]);
  const [selectedGrantTypes, setSelectedGrantTypes] = useState<string[]>([]);

  const debouncedSearch = debounce((value: string) => {
    setSearchInput(value);
  }, 500);

  const changeGrantSize = (value: number[]) => {
    setSelectedGrantSize(value);
  };

  const onChangeGeneric = (
    value: string,
    setToChange: Dispatch<React.SetStateAction<string[]>>
  ) => {
    setToChange((oldArray) => {
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

  const dynamicMetadata = {
    title: `Karma GAP - Grant Program Aggregator`,
    description: `View the list of grant programs issued by various communities.`,
  };

  const pageSize = 10;
  const [offset, setOffset] = useState(0);

  async function getGrantPrograms() {
    setLoading(true);
    setOffset(0);
    try {
      await fetchData(
        INDEXER.REGISTRY.GET_ALL +
          `?limit=${pageSize}&offset=0${
            searchInput ? `&name=${searchInput}` : ""
          }${
            selectedGrantTypes.length ? `&grantTypes=${selectedGrantTypes}` : ""
          }${status ? `&status=${status}` : ""}${
            selectedEcosystems.length
              ? `&ecosystems=${selectedEcosystems.join(",")}`
              : ""
          }${
            selectedCommunities.length
              ? `&communities=${selectedCommunities.join(",")}`
              : ""
          }${
            selectedGrantSize[0] !== 0
              ? `&minGrantSize=${selectedGrantSize[0]}`
              : ""
          }${
            selectedGrantSize[1] !== 10000000
              ? `&maxGrantSize=${selectedGrantSize[1]}`
              : ""
          }${
            selectedCategory.length
              ? `&categories=${selectedCategory.join(",")}`
              : ""
          }`
      ).then(([res, error]) => {
        if (!error && res) {
          setGrants(res);
          setOffset(0);
          setHasMore(res.length === pageSize);
        }
      });
    } catch (error: any) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  }

  const fetchMoreData = async () => {
    try {
      const newOffset = offset + pageSize;
      setOffset(newOffset);
      await fetchData(
        INDEXER.REGISTRY.GET_ALL +
          `?limit=${pageSize}&offset=${newOffset}${
            searchInput ? `&name=${searchInput}` : ""
          }${
            selectedGrantTypes.length ? `&grantTypes=${selectedGrantTypes}` : ""
          }${status ? `&status=${status}` : ""}${
            selectedEcosystems.length
              ? `&ecosystems=${selectedEcosystems.join(",")}`
              : ""
          }${
            selectedCommunities.length
              ? `&communities=${selectedCommunities.join(",")}`
              : ""
          }${
            selectedGrantSize[0] !== 0
              ? `&minGrantSize=${selectedGrantSize[0]}`
              : ""
          }${
            selectedGrantSize[1] !== 10000000
              ? `&maxGrantSize=${selectedGrantSize[1]}`
              : ""
          }${
            selectedCategory.length
              ? `&categories=${selectedCategory.join(",")}`
              : ""
          }`
      ).then(([res, error]) => {
        if (!error && res) {
          setGrants((oldArray) => [...oldArray, ...res]);
          setHasMore(res.length === pageSize);
        }
      });
    } catch (error: any) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getGrantPrograms();
  }, [
    searchInput,
    selectedCategory,
    status,
    selectedGrantSize,
    selectedEcosystems,
    selectedCommunities,
    selectedGrantTypes,
  ]);

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
        <div className="flex flex-row max-lg:gap-10  max-md:flex-col gap-32 justify-between w-full">
          <div className="flex flex-1 flex-col gap-3 items-start justify-start text-left">
            <h1 className="text-2xl tracking-[-0.72px] 2xl:text-4xl font-bold text-start text-black dark:text-white">
              {`The best grant program directory you’ll find`}
            </h1>
            <p className="text-start text-lg max-w-5xl text-black dark:text-white">
              Explore our handpicked grants for innovators and creators: from
              tech pioneers to community leaders, we have a grant to elevate
              your project. Did we miss your program/bounty? Add it{" "}
              <Link
                href={PAGES.REGISTRY.ADD_PROGRAM}
                className="text-blue-700 dark:text-blue-400 underline"
              >
                here.
              </Link>
            </p>
            <Link href={PAGES.REGISTRY.ADD_PROGRAM}>
              <button className="mt-3 bg-[#0E101B] dark:bg-slate-800 text-white px-10 py-2.5 rounded-lg">
                Add your program
              </button>
            </Link>
          </div>
          <div className="h-44 w-[1px] bg-[#98A2B3] max-md:w-full max-md:h-[1px]" />
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
          </div>
        </div>

        <div className="flex flex-row items-center justify-end max-sm:justify-start gap-10  flex-wrap w-full">
          <div className="flex flex-row items-center gap-2 flex-wrap">
            <button
              onClick={() => {
                setSelectedCategory([]);
              }}
              key={"All"}
              className={`px-3 py-1 mx-1 my-2 min-w-max flex flex-row items-center gap-1 text-sm font-semibold rounded-full cursor-pointer ${
                !selectedCategory.length
                  ? "bg-black text-white dark:bg-white dark:text-black"
                  : "border border-black text-black dark:border-white dark:text-white"
              }`}
            >
              All categories
              {!selectedCategory.length ? (
                <CheckIcon className="w-4 h-4" />
              ) : null}
            </button>
            {categories.map((type) => (
              <button
                onClick={() => {
                  onChangeGeneric(type, setSelectedCategory);
                }}
                key={type}
                className={`px-3 py-1 mx-1 my-2 min-w-max flex flex-row items-center gap-1 text-sm font-semibold rounded-full cursor-pointer ${
                  selectedCategory.includes(type)
                    ? "bg-black text-white dark:bg-white dark:text-black"
                    : "border border-black text-black dark:border-white dark:text-white"
                }`}
              >
                {type}
                {selectedCategory.includes(type) ? (
                  <CheckIcon className="w-4 h-4" />
                ) : null}
              </button>
            ))}
          </div>
          <div className="flex flex-row items-center gap-2  flex-wrap">
            <p className="text-black dark:text-white font-semibold">Status</p>
            <button
              onClick={() => setStatus("")}
              key={"All"}
              className={`px-3 py-1 mx-1 my-2 min-w-max flex flex-row items-center gap-1 text-sm font-semibold rounded-full cursor-pointer ${
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
                className={`px-3 py-1 mx-1 my-2 min-w-max flex flex-row items-center gap-1 text-sm font-semibold rounded-full cursor-pointer ${
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
                  onChange={(e) => debouncedSearch(e.target.value)}
                />
              </div>
            </div>
            <div className="flex flex-row gap-2 w-max max-md:flex-wrap">
              <GrantSizeSlider
                value={selectedGrantSize}
                onChangeListener={changeGrantSize}
              />
              <Dropdown
                list={ecosystems}
                onChangeListener={onChangeGeneric}
                setToChange={setSelectedEcosystems}
                unselectedText="All Ecosystems"
                selected={selectedEcosystems}
              />
              <Dropdown
                list={communities}
                onChangeListener={onChangeGeneric}
                setToChange={setSelectedCommunities}
                unselectedText="All Communities"
                selected={selectedCommunities}
              />
              <Dropdown
                list={grantTypes}
                onChangeListener={onChangeGeneric}
                setToChange={setSelectedGrantTypes}
                unselectedText="All Grant Types"
                selected={selectedGrantTypes}
              />
            </div>
          </div>

          {!loading ? (
            grants.length ? (
              <div className="mt-8 flow-root">
                <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
                  <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
                    <InfiniteScroll
                      dataLength={grants.length}
                      next={() => {
                        fetchMoreData();
                      }}
                      hasMore={hasMore}
                      loader={
                        <div className="flex flex-row justify-center items-center w-full">
                          <Spinner />
                        </div>
                      }
                      style={{
                        width: "100%",
                        height: "100%",
                        overflow: "hidden",
                      }}
                    >
                      <table className="min-w-full divide-y divide-gray-300 h-full">
                        <thead>
                          <tr className="">
                            <th
                              scope="col"
                              className="py-3.5 pl-4 pr-3 text-left text-sm font-bold text-gray-900 dark:text-zinc-100 sm:pl-0 font-body"
                            >
                              Ecosystem
                            </th>

                            <th
                              scope="col"
                              className="px-3 py-3.5 text-left text-sm font-bold text-gray-900 dark:text-zinc-100 font-body"
                            >
                              Name
                            </th>
                            <th
                              scope="col"
                              className="px-3 py-3.5 text-left text-sm font-bold text-gray-900 dark:text-zinc-100 font-body"
                            >
                              Description
                            </th>
                            <th
                              scope="col"
                              className="px-3 py-3.5 text-left text-sm font-bold text-gray-900 dark:text-zinc-100 font-body"
                            >
                              Budget
                            </th>
                            <th
                              scope="col"
                              className="px-3 py-3.5 text-left text-sm font-bold text-gray-900 dark:text-zinc-100 font-body"
                            >
                              Categories
                            </th>
                            <th
                              scope="col"
                              className="px-3 py-3.5 text-left text-sm font-bold text-gray-900 dark:text-zinc-100 font-body"
                            >
                              Start date
                            </th>
                            <th
                              scope="col"
                              className="px-3 py-3.5 text-left text-sm font-bold text-gray-900 dark:text-zinc-100 font-body"
                            >
                              End date
                            </th>
                            <th
                              scope="col"
                              className="px-3 py-3.5 text-left text-sm font-bold text-gray-900 dark:text-zinc-100 font-body"
                            >
                              Type
                            </th>
                            <th
                              scope="col"
                              className="px-3 py-3.5 text-left text-sm font-bold text-gray-900 dark:text-zinc-100 font-body"
                            >
                              RPFs
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 ">
                          {grants.map((grant, index) => (
                            <tr key={grant?.programId! + index}>
                              <td className="">
                                {grant.metadata?.ecosystems?.map(
                                  (ecosystem, index) => (
                                    <span
                                      key={index}
                                      className="whitespace-nowrap px-3 py-1 text-sm rounded-full text-blue-700 bg-[#EFF8FF] border border-[#B2DDFF] mr-2"
                                    >
                                      {ecosystem}
                                    </span>
                                  )
                                )}
                              </td>
                              <td className="whitespace-nowrap px-3 py-5 text-sm text-black dark:text-zinc-300 text-wrap max-w-[285px]">
                                <div className="flex flex-row gap-3">
                                  <div className="flex items-center gap-4">
                                    <div className="h-8 w-8 flex-shrink-0">
                                      {grant.metadata?.logoImg ||
                                      chainImgDictionary(grant.chainID!) ? (
                                        <img
                                          className="h-8 w-8 rounded-full"
                                          src={chainImgDictionary(
                                            grant.chainID!
                                          )}
                                          alt={chainNameDictionary(
                                            grant.chainID!
                                          )}
                                        />
                                      ) : (
                                        <div className="h-8 w-8 rounded-full bg-gray-200" />
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex flex-col gap-1">
                                    <div className="font-semibold text-base text-gray-900 underline dark:text-zinc-100">
                                      {grant?.metadata?.title}
                                    </div>
                                    {grant.metadata?.website ? (
                                      <a
                                        href={`https://grantname.xyz`}
                                        className="font-semibold text-base text-blue-700"
                                      >
                                        {grant.metadata?.website}
                                      </a>
                                    ) : null}
                                    {grant.metadata?.website ? (
                                      <>
                                        <img
                                          className="w-5 h-5 text-black dark:text-white dark:hidden"
                                          src="/icons/globe.svg"
                                          alt={grant.metadata?.website}
                                        />
                                        <img
                                          className="w-5 h-5 text-black dark:text-white hidden dark:block"
                                          src="/icons/globe-white.svg"
                                          alt={grant.metadata?.website}
                                        />
                                      </>
                                    ) : null}
                                  </div>
                                </div>
                              </td>
                              <td className="whitespace-nowrap px-3 py-5 text-sm text-black dark:text-zinc-400 max-w-[285px]">
                                <div
                                  className="w-[320px] max-w-[320px] text-wrap"
                                  data-color-mode="light"
                                >
                                  <ReadMore
                                    readLessText="Show less description"
                                    readMoreText="Show full description"
                                    side="left"
                                    words={50}
                                  >
                                    {grant.metadata?.description!}
                                  </ReadMore>
                                </div>
                              </td>{" "}
                              <td className="whitespace-nowrap px-3 py-5 text-sm text-black dark:text-zinc-300">
                                {grant?.metadata?.programBudget
                                  ? formatCurrency(
                                      +grant?.metadata?.programBudget
                                    ) === "NaN"
                                    ? grant?.metadata?.programBudget
                                    : `$${formatCurrency(
                                        +grant?.metadata?.programBudget
                                      )}`
                                  : ""}
                              </td>
                              <td className="whitespace-nowrap px-3 py-5 text-sm text-black dark:text-zinc-300">
                                <div className="w-full flex flex-row flex-wrap gap-1">
                                  {grant.metadata?.categories?.map(
                                    (category, index) => (
                                      <span
                                        key={index}
                                        className="mr-1 inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20"
                                      >
                                        {category}
                                      </span>
                                    )
                                  )}
                                </div>
                              </td>
                              <td className="whitespace-nowrap px-3 py-5 text-sm text-black dark:text-zinc-300">
                                {grant?.metadata?.startDate
                                  ? formatDate(grant?.metadata?.startDate)
                                  : ""}
                              </td>
                              <td className="whitespace-nowrap px-3 py-5 text-sm text-black dark:text-zinc-300">
                                {grant?.metadata?.endDate
                                  ? formatDate(grant?.metadata?.endDate)
                                  : ""}
                              </td>
                              <td className="whitespace-nowrap px-3 py-5 text-sm text-black dark:text-zinc-300">
                                <img
                                  className="w-6 h-6 text-black dark:text-white"
                                  src="/icons/crosshair.svg"
                                  alt={grant.metadata?.title}
                                />
                              </td>
                              <td className="whitespace-nowrap px-3 py-5 text-sm text-black dark:text-zinc-300">
                                <CheckCircleIcon className="text-black w-6 h-6 dark:text-zinc-100" />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </InfiniteScroll>
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
      </section>
    </>
  );
}
