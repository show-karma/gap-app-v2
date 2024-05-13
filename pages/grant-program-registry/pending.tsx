/* eslint-disable @next/next/no-img-element */
"use client";
import React, { Dispatch, FC, useMemo } from "react";
import { NextSeo } from "next-seo";
import { defaultMetadata } from "@/utilities/meta";
import { useState, useEffect } from "react";
import { Spinner } from "@/components/Utilities/Spinner";
import Link from "next/link";
import { PAGES } from "@/utilities/pages";
import debounce from "lodash.debounce";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";
import InfiniteScroll from "react-infinite-scroll-component";
import {
  GrantProgram,
  ProgramList,
} from "@/components/Pages/ProgramRegistry/ProgramList";
import { registryHelper } from "@/components/Pages/ProgramRegistry/helper";
import { ProgramListPending } from "@/components/Pages/ProgramRegistry/ProgramListPending";
import toast from "react-hot-toast";

const GrantProgramRegistry = () => {
  const [grantPrograms, setGrantPrograms] = useState<GrantProgram[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);

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
        INDEXER.REGISTRY.GET_ALL_PENDING +
          `?limit=${pageSize}&offset=${newOffset}`
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
      await fetchData(INDEXER.REGISTRY.GET_ALL_PENDING).then(([res, error]) => {
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

  useEffect(() => {
    getGrantPrograms();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const approveOrReject = async (id: string, value: boolean) => {
    try {
      const [request, error] = await fetchData(
        INDEXER.REGISTRY.APPROVE,
        "POST",
        {
          programId: id,
          isValid: value,
        },
        {},
        {},
        true
      );
      if (error) throw new Error("Error approving program");
      toast.success(`Program ${value ? "approved" : "rejected"} successfully`);
      await getGrantPrograms();
    } catch {
      console.log(`Error ${value ? "approving" : "rejecting"}  program ${id}`);
      toast.error(`Error ${value ? "approving" : "rejecting"}  program ${id}`);
    }
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

        <div className="w-full">
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
                      <ProgramListPending
                        approveOrReject={approveOrReject}
                        grantPrograms={grantPrograms}
                      />
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
