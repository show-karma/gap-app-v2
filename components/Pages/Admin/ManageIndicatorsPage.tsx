"use client";
import { Button } from "@/components/Utilities/Button";
import { Spinner } from "@/components/Utilities/Spinner";
import { zeroUID } from "@/utilities/commons";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";
import { MESSAGES } from "@/utilities/messages";
import { defaultMetadata } from "@/utilities/meta";
import { PAGES } from "@/utilities/pages";
import { useIsCommunityAdmin } from "@/hooks/useIsCommunityAdmin";
import {
  ChevronLeftIcon,
  TrashIcon,
  PlusIcon,
  ChevronUpIcon,
  ChevronDownIcon,
} from "@heroicons/react/24/outline";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { Disclosure } from "@headlessui/react";

import { IndicatorsHub } from "@/components/Pages/Admin/IndicatorsHub";
import { ManageCategoriesOutputs } from "@/components/Pages/Admin/ManageCategoriesOutputs";
import { errorManager } from "@/components/Utilities/errorManager";

import { Category, ImpactSegment } from "@/types/impactMeasurement";
import { gapIndexerApi } from "@/utilities/gapIndexerApi";
import { ICommunityResponse } from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";
import { cn } from "@/utilities/tailwind";
import pluralize from "pluralize";
import Image from "next/image";
import { pickColor } from "@/components/GrantCard";
import { CategoryView } from "./CategoryView";
import { IndicatorsView } from "./IndicatorsView";
import { useWallet } from "@/hooks/useWallet";

export const metadata = defaultMetadata;

export default function ManageIndicatorsPage() {
  const router = useRouter();
  const { isLoggedIn, address } = useWallet();
  const params = useParams();
  const communityId = params.communityId as string;
  // Call API
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(
    null
  );
  const [viewMode, setViewMode] = useState<"category" | "indicators">(
    "category"
  );
  const [viewType, setViewType] = useState<"all" | "output" | "outcome">("all");
  const [indicatorViewType, setIndicatorViewType] = useState<
    "all" | "automated" | "manual"
  >("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const [loading, setLoading] = useState<boolean>(true); // Loading state of the API call
  const [community, setCommunity] = useState<ICommunityResponse | undefined>(
    undefined
  ); // Data returned from the API

  // Check if user is admin of this community
  const { isCommunityAdmin: isAdmin, isLoading: adminLoading } =
    useIsCommunityAdmin(community?.uid, address);

  useEffect(() => {
    const fetchDetails = async () => {
      if (!communityId) return;
      setLoading(true);
      try {
        const { data: result } = await gapIndexerApi.communityBySlug(
          communityId
        );
        if (!result || result.uid === zeroUID)
          throw new Error("Community not found");
        setCommunity(result);
      } catch (error: any) {
        errorManager(`Error fetching community ${communityId}`, error, {
          community: communityId,
        });
        console.error("Error fetching data:", error);
        if (
          error.message === "Community not found" ||
          error.message.includes("422")
        ) {
          router.push(PAGES.NOT_FOUND);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [communityId]);

  const getCategories = async (isSilent: boolean = false) => {
    if (!isSilent) {
      setLoading(true);
    }

    try {
      const [data] = await fetchData(
        INDEXER.COMMUNITY.CATEGORIES(
          (community?.details?.data?.slug || community?.uid) as string
        )
      );
      if (data) {
        const categoriesWithoutOutputs = data.map((category: Category) => {
          const outputsNotDuplicated = category.outputs?.filter(
            (output) =>
              !category.impact_segments?.some(
                (segment) =>
                  segment.id === output.id || segment.name === output.name
              )
          );
          return {
            ...category,
            impact_segments: [
              ...(category.impact_segments || []),
              ...(outputsNotDuplicated || []).map((output: any) => {
                return {
                  id: output.id,
                  name: output.name,
                  description: output.description,
                  impact_indicators: [],
                  type: output.type,
                };
              }),
            ],
          };
        });
        return categoriesWithoutOutputs;
      }
    } catch (error: any) {
      errorManager(
        `Error fetching categories of community ${communityId}`,
        error,
        {
          community: communityId,
        }
      );
      console.error(error);
      return [];
    } finally {
      if (!isSilent) {
        setLoading(false);
      }
    }
  };

  useMemo(() => {
    if (community?.uid) {
      setLoading(true);
      getCategories()
        .then((res) => {
          setCategories(res);
          if (res && res.length > 0) {
            setSelectedCategory(res[0]);
          }
        })
        .catch(() => {
          setCategories([]);
        });
    }
  }, [community?.uid]);

  return (
    <div className="mt-4 flex gap-8 flex-row max-lg:flex-col w-full mb-10">
      {loading || adminLoading ? (
        <div className="flex w-full min-h-screen h-full items-center justify-center">
          <Spinner />
        </div>
      ) : isAdmin ? (
        <div className="flex w-full flex-1 flex-col items-center gap-8">
          <div className="w-full flex flex-row items-center justify-between max-w-7xl">
            <Link
              href={PAGES.ADMIN.ROOT(
                community?.details?.data?.slug || (community?.uid as string)
              )}
            >
              <Button className="flex flex-row items-center gap-2 px-4 py-2 font-semibold text-base  bg-transparent text-black dark:text-white dark:bg-transparent hover:bg-transparent rounded-md transition-all ease-in-out duration-200">
                <ChevronLeftIcon className="h-5 w-5" />
                Return to admin page
              </Button>
            </Link>
          </div>

          <div className="flex flex-row w-full max-md:flex-col gap-8 max-md:gap-4 max-w-7xl">
            {/* Left Column - Navigation (1/5 width) - Desktop and Mobile */}
            <div className="w-1/5 max-md:w-full flex flex-col gap-6">
              {/* Desktop Categories */}
              <div className="p-6 w-full hidden md:block">
                <p className="text-xs font-bold font-body uppercase text-black dark:text-white mb-3">
                  Categories
                </p>
                <div className="flex flex-col gap-1">
                  {categories.map((category) => (
                    <button
                      key={category.id}
                      onClick={() => {
                        setSelectedCategory(category);
                        setViewMode("category");
                      }}
                      className={`text-left p-3 rounded-md transition-all ${
                        selectedCategory?.id === category.id &&
                        viewMode === "category"
                          ? "bg-blue-100 dark:bg-blue-900"
                          : "hover:bg-gray-100 dark:hover:bg-zinc-800"
                      }`}
                    >
                      {category.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Mobile Accordion Categories */}
              <div className="md:hidden w-full">
                <Disclosure defaultOpen={true}>
                  {({ open }) => (
                    <>
                      <Disclosure.Button className="w-full p-4 flex justify-between items-center bg-gray-50 dark:bg-zinc-800 rounded-lg">
                        <span className="text-sm font-bold font-body uppercase text-black dark:text-white">
                          Categories
                        </span>
                        {open ? (
                          <ChevronUpIcon className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                        ) : (
                          <ChevronDownIcon className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                        )}
                      </Disclosure.Button>
                      <Disclosure.Panel className="px-2 pt-2 pb-4">
                        <div className="flex flex-col gap-1 rounded-md overflow-hidden bg-white dark:bg-zinc-900 shadow-sm">
                          {categories.map((category) => (
                            <button
                              key={category.id}
                              onClick={() => {
                                setSelectedCategory(category);
                                setViewMode("category");
                              }}
                              className={`text-left p-3 transition-all ${
                                selectedCategory?.id === category.id &&
                                viewMode === "category"
                                  ? "bg-blue-100 dark:bg-blue-900 font-medium"
                                  : "hover:bg-gray-100 dark:hover:bg-zinc-800"
                              }`}
                            >
                              {category.name}
                            </button>
                          ))}
                        </div>
                      </Disclosure.Panel>
                    </>
                  )}
                </Disclosure>
              </div>

              {/* Desktop Indicators */}
              <div className=" flex-col gap-0 p-6 w-full mb-4 hidden md:flex">
                <p className="text-xs font-body uppercase font-bold text-black dark:text-white mb-3">
                  Indicators
                </p>
                <button
                  className={cn(
                    `text-left p-3 rounded-md transition-all`,
                    viewMode === "indicators"
                      ? "bg-blue-100 dark:bg-blue-900"
                      : "hover:bg-gray-100 dark:hover:bg-zinc-800"
                  )}
                  onClick={() => setViewMode("indicators")}
                >
                  View all
                </button>
              </div>

              {/* Mobile Accordion Indicators */}
              <div className="md:hidden w-full mb-4">
                <Disclosure defaultOpen={true}>
                  {({ open }) => (
                    <>
                      <Disclosure.Button className="w-full p-4 flex justify-between items-center bg-gray-50 dark:bg-zinc-800 rounded-lg">
                        <span className="text-sm font-bold font-body uppercase text-black dark:text-white">
                          Indicators
                        </span>
                        {open ? (
                          <ChevronUpIcon className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                        ) : (
                          <ChevronDownIcon className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                        )}
                      </Disclosure.Button>
                      <Disclosure.Panel className="px-2 pt-2 pb-4">
                        <div className="flex flex-col gap-1 rounded-md overflow-hidden bg-white dark:bg-zinc-900 shadow-sm">
                          <button
                            className={cn(
                              `text-left p-3 transition-all`,
                              viewMode === "indicators"
                                ? "bg-blue-100 dark:bg-blue-900 font-medium"
                                : "hover:bg-gray-100 dark:hover:bg-zinc-800"
                            )}
                            onClick={() => setViewMode("indicators")}
                          >
                            View all
                          </button>
                        </div>
                      </Disclosure.Panel>
                    </>
                  )}
                </Disclosure>
              </div>
            </div>

            {/* Right Column - Content (4/5 width) */}
            <div className="w-4/5 flex max-md:w-full px-4">
              {viewMode === "category" && selectedCategory ? (
                <CategoryView
                  selectedCategory={selectedCategory}
                  viewType={viewType}
                  setViewType={setViewType}
                  onRefreshCategory={() => {
                    setLoading(true);
                    getCategories()
                      .then((res) => {
                        setCategories(res);
                        if (res && res.length > 0) {
                          const currentCategory = res.find(
                            (c: Category) => c.id === selectedCategory.id
                          );
                          setSelectedCategory(currentCategory || res[0]);
                        }
                      })
                      .catch(() => {
                        setCategories([]);
                      })
                      .finally(() => {
                        setLoading(false);
                      });
                  }}
                  communityId={community?.uid as string}
                />
              ) : viewMode === "indicators" ? (
                <IndicatorsView
                  categories={categories}
                  communityId={community?.uid as string}
                />
              ) : null}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex w-full items-center justify-center">
          <p>{MESSAGES.ADMIN.NOT_AUTHORIZED(community?.uid || "")}</p>
        </div>
      )}
    </div>
  );
}
