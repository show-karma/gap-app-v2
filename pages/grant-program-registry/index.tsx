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

const grantTypes = ["Defi", "zk", "NFT", "Research", "Climate", "Regen"];

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
  const [selectedGrantType, setSelectedGrantType] = useState("All");
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
              in: [10, 11155111, 42161],
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
        <div className="grid grid-cols-1 gap-2">
          <h1 className="text-3xl font-bold text-center">
            The best Grant program list you&apos;ll find out there
          </h1>
          <div className="flex justify-center">
            {" "}
            <p className="text-center text-lg max-w-5xl">
              Explore our handpicked grants for innovators and creators from
              tech pioneers to community leaders, we have a grant to elevate
              your project.
            </p>
          </div>
        </div>

        <div className="text-center">
          <p className="mb-2">Grant Types</p>
          {grantTypes.map((type) => (
            <span
              onClick={() => setSelectedGrantType(type)}
              key={type}
              className={`px-3 py-1 mx-1 my-2 text-sm font-semibold rounded-full cursor-pointer ${
                selectedGrantType === type
                  ? "bg-zinc-700 text-white"
                  : "border border-zinc-800 text-gray-600"
              }`}
            >
              {type}
            </span>
          ))}
        </div>

        <div className="px-10 mx-10">
          <div className="sm:flex sm:items-center p-3 flex justify-between rounded-xl ring-zinc-400 ring-1">
            <div className="flex items-center justify-center">
              <div className="w-full max-w-lg lg:max-w-xs">
                <label htmlFor="search" className="sr-only">
                  Search
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <MagnifyingGlassIcon
                      className="h-5 w-5 text-gray-400"
                      aria-hidden="true"
                    />
                  </div>
                  <input
                    id="search"
                    name="search"
                    className="block w-full rounded-md border-0 bg-white py-1.5 pl-10 pr-3 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                    placeholder="Search"
                    type="search"
                  />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Dropdown />
              <Dropdown />
              <Dropdown />
            </div>
          </div>

          <div className="mt-8 flow-root">
            <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
              <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
                <table className="min-w-full divide-y divide-gray-300">
                  <thead>
                    <tr>
                      <th
                        scope="col"
                        className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-0"
                      >
                        Ecosystem
                      </th>
                      <th
                        scope="col"
                        className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                      >
                        Community
                      </th>
                      <th
                        scope="col"
                        className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                      >
                        Name
                      </th>
                      <th
                        scope="col"
                        className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                      >
                        Description
                      </th>
                      <th
                        scope="col"
                        className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                      >
                        Budget
                      </th>
                      <th
                        scope="col"
                        className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                      >
                        Categories
                      </th>
                      <th
                        scope="col"
                        className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                      >
                        Start date
                      </th>
                      <th
                        scope="col"
                        className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                      >
                        End date
                      </th>
                      <th
                        scope="col"
                        className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                      >
                        Type
                      </th>
                      <th
                        scope="col"
                        className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                      >
                        RPFs
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {grants.map((grant) => (
                      <tr key={grant.id}>
                        <td className="whitespace-nowrap px-3 py-5 text-sm text-gray-500">
                          {chainNameDictionary(grant.chainId)}
                        </td>
                        <td className="whitespace-nowrap py-5 pl-4 pr-3 text-sm sm:pl-0">
                          <div className="flex items-center">
                            <div className="h-11 w-11 flex-shrink-0">
                              <img
                                className="h-11 w-11 rounded-full"
                                src={
                                  grant.project?.metadata?.logoImg
                                    ? `https://${grant.project?.metadata?.logoImg}.ipfs.dweb.link`
                                    : chainImgDictionary(grant.project?.chainId)
                                }
                                alt=""
                              />
                            </div>
                            <div className="ml-4">
                              <div className="font-medium text-gray-900">
                                {grant.project?.name}
                              </div>
                              <div className="mt-1 text-gray-500">
                                {grant.project?.metadata?.website}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-3 py-5 text-sm text-gray-500">
                          {grant.roundMetadata.name}
                        </td>
                        <td className="whitespace-nowrap px-3 py-5 text-sm text-gray-500">
                          <div className="w-100">
                            {grant.roundMetadata?.eligibility?.description?.slice(
                              0,
                              50
                            )}
                          </div>
                          ...{" "}
                          <span className="font-bold ">
                            show full description
                          </span>
                        </td>{" "}
                        <td className="whitespace-nowrap px-3 py-5 text-sm text-gray-500">
                          {parseFloat(grant?.matchAmountInUsd).toFixed(2)} USD
                        </td>
                        <td className="whitespace-nowrap px-3 py-5 text-sm text-gray-500">
                          {grant.tags.map((tag, index) => (
                            <span
                              key={index}
                              className="mr-1 inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20"
                            >
                              {tag}
                            </span>
                          ))}
                        </td>
                        <td className="whitespace-nowrap px-3 py-5 text-sm text-gray-500">
                          {grant?.applicationsStartTime}
                        </td>
                        <td className="whitespace-nowrap px-3 py-5 text-sm text-gray-500">
                          {grant?.applicationsEndTime}
                        </td>
                        <td className="whitespace-nowrap px-3 py-5 text-sm text-gray-500">
                          {grant.strategyName
                            ?.replaceAll("Strategy", "")
                            ?.replaceAll("allov2.", "")}
                        </td>
                        <td className="whitespace-nowrap px-3 py-5 text-sm text-gray-500">
                          ✅
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
