/* eslint-disable @next/next/no-img-element */
"use client";
import React, { Dispatch, FC, useMemo } from "react";
import { NextSeo } from "next-seo";
import { defaultMetadata } from "@/utilities/meta";
import { useState, useEffect } from "react";
import { MagnifyingGlassIcon } from "@heroicons/react/20/solid";
import { CheckIcon } from "@heroicons/react/24/solid";
import { Spinner } from "@/components/Utilities/Spinner";
import Link from "next/link";
import { PAGES } from "@/utilities/pages";
import debounce from "lodash.debounce";
import { GrantSizeSlider } from "@/components/GrantSizeSlider";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";
import InfiniteScroll from "react-infinite-scroll-component";
import {
  GrantProgram,
  ProgramList,
} from "@/components/Pages/ProgramRegistry/ProgramList";
import { registryHelper } from "@/components/Pages/ProgramRegistry/helper";
import { SearchDropdown } from "@/components/Pages/ProgramRegistry/SearchDropdown";
import { useQueryState } from "nuqs";
import { GetServerSidePropsContext, InferGetServerSidePropsType } from "next";

const statuses = ["Active", "Inactive"];

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const { query } = context;
  const defaultNetworks = ((query.networks as string) || "")
    .split(",")
    .filter((category) => category.trim());
  const defaultEcosystems = ((query.ecosystems as string) || "")
    .split(",")
    .filter((ecosystem) => ecosystem.trim());
  const defaultGrantTypes = ((query.grantTypes as string) || "")
    .split(",")
    .filter((grantType) => grantType.trim());
  const defaultGrantSize = query.grantSize
    ? ((query.grantSize as string) || "")
        .split(",")
        .filter((grantType) => grantType.trim())
        .map((item) => (isNaN(Number(item)) ? 0 : +item))
        .slice(0, 2)
    : registryHelper.grantSizes;

  const defaultCategories = ((query.categories as string) || "")
    .split(",")
    .filter((category) => category.trim());
  const defaultStatuses = (query.status as string) || "";
  const defaultName = (query.name as string) || "";

  return {
    props: {
      defaultNetworks,
      defaultEcosystems,
      defaultGrantTypes,
      defaultGrantSize,
      defaultCategories,
      defaultStatuses,
      defaultName,
    },
  };
}

const GrantProgramRegistry = ({
  defaultNetworks,
  defaultEcosystems,
  defaultGrantTypes,
  defaultGrantSize,
  defaultCategories,
  defaultStatuses,
  defaultName,
}: InferGetServerSidePropsType<typeof getServerSideProps>) => {
  const [grantPrograms, setGrantPrograms] = useState<GrantProgram[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);

  const [selectedCategory, setSelectedCategory] = useQueryState("categories", {
    defaultValue: defaultCategories,
    serialize: (value) => (value.length ? value?.join(",") : ""),
    parse: (value) => (value.length > 0 ? value.split(",") : []),
  });
  const [status, setStatus] = useQueryState("status", {
    defaultValue: defaultStatuses,
  });

  const [searchInput, setSearchInput] = useQueryState("name", {
    defaultValue: defaultName,
    throttleMs: 500,
  });
  const [minGrantSize, setMinGrantSize] = useQueryState("minGrantSize", {
    throttleMs: 500,
    defaultValue: defaultGrantSize[0].toString() as any,
    parse: (value) => {
      if (value === defaultGrantSize[0].toString()) {
        return null;
      }
      return value;
    },
    serialize: (value) => {
      if (value === defaultGrantSize[0].toString()) {
        return null;
      }
      return value;
    },
  });
  const [maxGrantSize, setMaxGrantSize] = useQueryState("maxGrantSize", {
    throttleMs: 500,
    defaultValue: defaultGrantSize[1].toString() as any,
    parse: (value) => {
      if (value === defaultGrantSize[1].toString()) {
        return null;
      }
      return value;
    },
    serialize: (value) => {
      if (value === defaultGrantSize[1].toString()) {
        return null;
      }
      return value;
    },
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

  const debouncedSearch = debounce((value: string) => {
    setSearchInput(value);
  }, 500);

  const changeGrantSize = (value: number[]) => {
    setMinGrantSize(value[0].toString());
    setMaxGrantSize(value[1].toString());
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
          `?limit=${pageSize}&offset=${newOffset}${
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
            minGrantSize !== registryHelper.grantSizes[0].toString()
              ? `&minGrantSize=${minGrantSize}`
              : ""
          }${
            maxGrantSize !== registryHelper.grantSizes[1].toString()
              ? `&maxGrantSize=${maxGrantSize}`
              : ""
          }${
            selectedCategory.length
              ? `&categories=${selectedCategory.join(",")}`
              : ""
          }`
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

  useEffect(() => {
    const getGrantPrograms = async () => {
      setLoading(true);
      setOffset(0);
      try {
        await fetchData(
          INDEXER.REGISTRY.GET_ALL +
            `?limit=${pageSize}&offset=0${
              searchInput ? `&name=${searchInput}` : ""
            }${
              selectedGrantTypes.length
                ? `&grantTypes=${selectedGrantTypes}`
                : ""
            }${status ? `&status=${status}` : ""}${
              selectedNetworks.length
                ? `&networks=${selectedNetworks.join(",")}`
                : ""
            }${
              selectedEcosystems.length
                ? `&ecosystems=${selectedEcosystems.join(",")}`
                : ""
            }${
              minGrantSize !== registryHelper.grantSizes[0].toString()
                ? `&minGrantSize=${minGrantSize}`
                : ""
            }${
              maxGrantSize !== registryHelper.grantSizes[1].toString()
                ? `&maxGrantSize=${maxGrantSize}`
                : ""
            }${
              selectedCategory.length
                ? `&categories=${selectedCategory.join(",")}`
                : ""
            }`
        ).then(([res, error]) => {
          if (!error && res) {
            setGrantPrograms(res);
            setHasMore(res.length === pageSize);
          }
        });
      } catch (error: any) {
        console.log(error);
      } finally {
        setLoading(false);
      }
    };

    getGrantPrograms();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    searchInput,
    selectedCategory,
    status,
    minGrantSize,
    maxGrantSize,
    selectedNetworks,
    selectedEcosystems,
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
            {registryHelper.categories.map((type) => (
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
                  defaultValue={searchInput}
                  onChange={(e) => debouncedSearch(e.target.value)}
                />
              </div>
            </div>
            <div className="flex flex-row gap-2 w-max flex-1 max-md:flex-wrap max-md:flex-col justify-end">
              <GrantSizeSlider
                value={[
                  +minGrantSize,
                  maxGrantSize ? +maxGrantSize : registryHelper.grantSizes[1],
                ]}
                onChangeListener={changeGrantSize}
              />

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
                type={"Grant Types"}
                selected={selectedGrantTypes}
                // imageDictionary={}
              />
            </div>
          </div>

          {!loading ? (
            grantPrograms.length ? (
              <div className="mt-8 flow-root">
                <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
                  <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
                    <InfiniteScroll
                      dataLength={grantPrograms.length}
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
                      <ProgramList grantPrograms={grantPrograms} />
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
};

export default GrantProgramRegistry;
