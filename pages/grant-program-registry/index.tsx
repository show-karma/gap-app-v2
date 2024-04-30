"use client";
import React from "react";
import { NextSeo } from "next-seo";
import { defaultMetadata } from "@/utilities/meta";
import { useState, useEffect } from "react";
import Dropdown from "@/components/DropDown";
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

const grantTypes = [
  "All Categories",
  "Defi",
  "zk",
  "NFT",
  "Research",
  "Climate",
  "Regen",
];
const statuses = ["All", "Active", "Inactive"];

const EVMs = ["Arbitrum One", "Optimism"];

type GrantProgram = {
  project: {
    chainId: number;
    name: string;
    metadata: any;
  };
  chainId: number;
  id: string;
  roundMetadata: any;
  strategyName: string;
  tags: string[];
  matchAmount: string;
  fundedAmount: string;
  fundedAmountInUsd: string;
  matchAmountInUsd: string;
  applicationsEndTime: string;
  applicationsStartTime: string;
};

export default function GrantProgramRegistry({}) {
  const [grants, setGrants] = useState<GrantProgram[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGrantType, setSelectedGrantType] = useState("All Categories");
  const [status, setStatus] = useState("All");
  const dynamicMetadata = {
    title: `Karma GAP - Grant Program Aggregator`,
    description: `View the list of grant programs issued by various communities.`,
  };

  function getGrantPrograms() {
    axios
      .post(envVars.NEXT_PUBLIC_ALLO_V2_GRAPHQL_URL, {
        query: `
        query Query($first: Int, $filter: RoundFilter) {
          rounds(first: $first, filter: $filter) {
            project {
              name
              metadata
              chainId
            }
            chainId
            id
            roundMetadata
            strategyName
            tags
            matchAmount
            fundedAmount
            fundedAmountInUsd
            matchAmountInUsd
            applicationsEndTime
            applicationsStartTime
          }
        }               
      `,
        variables: {
          filter: {
            chainId: {
              in:
                envVars.NEXT_PUBLIC_ENV === "staging"
                  ? [10, 42161]
                  : [11155111],
            },
            tags: {
              contains: "allo-v2",
            },
            strategyName: {
              notEqualTo: "",
            },
          },
          first: 10,
        },
      })
      .then((response) => {
        setLoading(false);
        setGrants(response.data.data?.rounds);
      })
      .catch((error) => {
        setLoading(false);
        console.log(error);
      });
  }

  useEffect(() => {
    getGrantPrograms();

    if (loading) {
      console.log("Loading...");
    } else {
      console.log("Grants loaded!", grants);
    }
  }, []);

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
            <p className="text-black dark:text-white font-semibold">
              Grant Types
            </p>
            {grantTypes.map((type) => (
              <button
                onClick={() => setSelectedGrantType(type)}
                key={type}
                className={`px-3 py-1 mx-1 my-2 min-w-max flex flex-row items-center gap-1 text-sm font-semibold rounded-full cursor-pointer ${
                  selectedGrantType === type
                    ? "bg-black text-white dark:bg-white dark:text-black"
                    : "border border-black text-black dark:border-white dark:text-white"
                }`}
              >
                {type}
                {selectedGrantType === type ? (
                  <CheckIcon className="w-4 h-4" />
                ) : null}
              </button>
            ))}
          </div>
          <div className="flex flex-row items-center gap-2  flex-wrap">
            <p className="text-black dark:text-white font-semibold">Status</p>
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
          <div className="sm:flex sm:items-center p-3 flex max-sm:flex-col flex-row gap-3 flex-wrap justify-between rounded-[4px] bg-[#F2F4F7] dark:bg-zinc-900">
            <div className="flex items-center justify-center">
              <div className="w-full max-w-lg lg:max-w-xs">
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
                    className="block w-full rounded-md border-0 bg-white dark:bg-zinc-600 py-1.5 pr-10 pl-3 text-black dark:text-white dark:placeholder:text-zinc-100  placeholder:text-zinc-900  sm:text-sm sm:leading-6"
                    placeholder="Search"
                    type="search"
                  />
                </div>
              </div>
            </div>
            <div className="flex flex-wrap flex-row gap-2">
              <Dropdown />
              <Dropdown />
              <Dropdown />
              <Dropdown />
            </div>
          </div>

          {!loading ? (
            <div className="mt-8 flow-root">
              <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
                <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
                  <table className="min-w-full divide-y divide-gray-300">
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
                          Community
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
                      {grants.map((grant) => (
                        <tr key={grant.id}>
                          <td className="">
                            <span className="whitespace-nowrap px-3 py-1 text-sm rounded-full text-blue-700 bg-[#EFF8FF] border border-[#B2DDFF] mr-2">
                              {EVMs.includes(chainNameDictionary(grant.chainId))
                                ? "EVM"
                                : chainNameDictionary(grant.chainId)}
                            </span>
                          </td>
                          <td className="whitespace-nowrap py-5 pl-4 pr-3 text-sm sm:pl-0  max-w-[285px]">
                            <div className="flex items-center gap-4">
                              <div className="h-11 w-11 flex-shrink-0">
                                {grant.project?.metadata?.logoImg ||
                                chainImgDictionary(grant.project?.chainId) ? (
                                  <img
                                    className="h-11 w-11 rounded-full"
                                    src={
                                      grant.project?.metadata?.logoImg
                                        ? `https://${grant.project?.metadata?.logoImg}.ipfs.dweb.link`
                                        : chainImgDictionary(
                                            grant.project?.chainId
                                          )
                                    }
                                    alt={chainNameDictionary(
                                      grant.project?.chainId
                                    )}
                                  />
                                ) : (
                                  <div className="h-11 w-11 rounded-full bg-gray-200" />
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="whitespace-nowrap px-3 py-5 text-sm text-black dark:text-zinc-300 text-wrap max-w-[285px]">
                            <div className="flex flex-col gap-1">
                              <div className="font-semibold text-base text-gray-900 underline dark:text-zinc-100">
                                {grant.roundMetadata.name}
                              </div>
                              <a
                                href={`https://grantname.xyz`}
                                className="font-semibold text-base text-blue-700"
                              >
                                {/* {grant.project?.metadata?.website} */}
                                www.grantname.xyz
                              </a>
                              <img
                                className="w-6 h-6 text-black dark:text-white dark:hidden"
                                src="/icons/globe.svg"
                                alt={grant.project?.name}
                              />
                              <img
                                className="w-6 h-6 text-black dark:text-white hidden dark:block"
                                src="/icons/globe-white.svg"
                                alt={grant.project?.name}
                              />
                            </div>
                          </td>
                          <td className="whitespace-nowrap px-3 py-5 text-sm text-black dark:text-zinc-400 max-w-[285px]">
                            <div className="w-100 text-wrap">
                              {grant.roundMetadata?.eligibility?.description?.slice(
                                0,
                                50
                              )}
                            </div>
                            <button className="font-bold text-blue-600 text-sm">
                              Show full description
                            </button>
                          </td>{" "}
                          <td className="whitespace-nowrap px-3 py-5 text-sm text-black dark:text-zinc-300">
                            ${formatCurrency(+grant?.matchAmountInUsd)}
                          </td>
                          <td className="whitespace-nowrap px-3 py-5 text-sm text-black dark:text-zinc-300">
                            <div className="w-full flex flex-row flex-wrap gap-1">
                              {grant.tags.map((tag, index) => (
                                <span
                                  key={index}
                                  className="mr-1 inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="whitespace-nowrap px-3 py-5 text-sm text-black dark:text-zinc-300">
                            {formatDate(grant?.applicationsStartTime)}
                          </td>
                          <td className="whitespace-nowrap px-3 py-5 text-sm text-black dark:text-zinc-300">
                            {formatDate(grant?.applicationsEndTime)}
                          </td>
                          <td className="whitespace-nowrap px-3 py-5 text-sm text-black dark:text-zinc-300">
                            <img
                              className="w-6 h-6 text-black dark:text-white"
                              src="/icons/crosshair.svg"
                              alt={grant.project?.name}
                            />
                          </td>
                          <td className="whitespace-nowrap px-3 py-5 text-sm text-black dark:text-zinc-300">
                            <CheckCircleIcon className="text-black w-6 h-6 dark:text-zinc-100" />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
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
}
