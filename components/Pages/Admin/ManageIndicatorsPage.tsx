"use client";
import { Disclosure } from "@headlessui/react";
import { ChevronDownIcon, ChevronLeftIcon, ChevronUpIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/Utilities/Button";
import { Spinner } from "@/components/Utilities/Spinner";
import {
  useCommunityAdminAccess,
  useCommunityCategories,
  useCommunityDetails,
} from "@/hooks/communities";
import type { Category } from "@/types/impactMeasurement";
import { MESSAGES } from "@/utilities/messages";
import { defaultMetadata } from "@/utilities/meta";
import { PAGES } from "@/utilities/pages";
import { cn } from "@/utilities/tailwind";
import { CategoryView } from "./CategoryView";
import { IndicatorsView } from "./IndicatorsView";

export const metadata = defaultMetadata;

export default function ManageIndicatorsPage() {
  const router = useRouter();
  const params = useParams();
  const communityId = params.communityId as string;

  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [viewMode, setViewMode] = useState<"category" | "indicators">("category");
  const [viewType, setViewType] = useState<"all" | "output" | "outcome">("all");
  const [_indicatorViewType, _setIndicatorViewType] = useState<"all" | "automated" | "manual">(
    "all"
  );
  const [_searchQuery, _setSearchQuery] = useState<string>("");

  const {
    data: community,
    isLoading: communityLoading,
    isError: communityError,
  } = useCommunityDetails(communityId);

  const {
    data: categories = [],
    isLoading: categoriesLoading,
    isError: categoriesError,
    refetch: refetchCategories,
  } = useCommunityCategories(community?.details?.slug || community?.uid || communityId, {
    enabled: !!community,
  });

  const { hasAccess, isLoading: adminLoading } = useCommunityAdminAccess(community?.uid);

  useEffect(() => {
    if (community === null && !communityLoading) {
      router.push(PAGES.NOT_FOUND);
    }
  }, [community, communityLoading, router]);

  useEffect(() => {
    if (categories.length > 0 && !selectedCategory) {
      setSelectedCategory(categories[0]);
    }
  }, [categories, selectedCategory]);

  const isLoading = communityLoading || categoriesLoading || adminLoading;

  return (
    <div className="mt-4 flex gap-8 flex-row max-lg:flex-col w-full mb-10">
      {isLoading ? (
        <div className="flex w-full min-h-screen h-full items-center justify-center">
          <Spinner />
        </div>
      ) : communityError || categoriesError ? (
        <div className="flex w-full min-h-screen h-full items-center justify-center">
          <div className="text-center max-w-md">
            <div className="bg-red-100 dark:bg-red-900/20 p-4 rounded-full mb-4 inline-block">
              <svg
                className="h-12 w-12 text-red-600 dark:text-red-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">
              Failed to load data
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              {communityError
                ? "Unable to load community information. Please try again later."
                : "Unable to load categories. Please try again later."}
            </p>
            <Button onClick={() => router.push("/communities")}>Return to Communities</Button>
          </div>
        </div>
      ) : hasAccess ? (
        <div className="flex w-full flex-1 flex-col items-center gap-8">
          <div className="w-full flex flex-row items-center justify-between max-w-full">
            {(community?.details?.slug || community?.uid) && (
              <Link
                href={PAGES.ADMIN.ROOT(community.details?.slug ?? community.uid ?? communityId)}
              >
                <Button className="flex flex-row items-center gap-2 px-4 py-2 font-semibold text-base  bg-transparent text-black dark:text-white dark:bg-transparent hover:bg-transparent rounded-md transition-all ease-in-out duration-200">
                  <ChevronLeftIcon className="h-5 w-5" />
                  Return to admin page
                </Button>
              </Link>
            )}
          </div>

          {categories.length === 0 ? (
            <div className="flex w-full items-center justify-center py-12">
              <div className="text-center max-w-md">
                <div className="bg-gray-100 dark:bg-zinc-800 p-4 rounded-full mb-4 inline-block">
                  <svg
                    className="h-12 w-12 text-gray-400 dark:text-gray-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                    />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">
                  No categories found
                </h3>
                <p className="text-gray-500 dark:text-gray-400">
                  This community doesn&apos;t have any categories yet. Categories help organize
                  activities, outcomes, and indicators for impact measurement.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-row w-full max-md:flex-col gap-8 max-md:gap-4 max-w-full">
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
                        type="button"
                        onClick={() => {
                          setSelectedCategory(category);
                          setViewMode("category");
                        }}
                        className={`text-left p-3 rounded-md transition-all ${
                          selectedCategory?.id === category.id && viewMode === "category"
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
                      <div>
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
                                type="button"
                                onClick={() => {
                                  setSelectedCategory(category);
                                  setViewMode("category");
                                }}
                                className={`text-left p-3 transition-all ${
                                  selectedCategory?.id === category.id && viewMode === "category"
                                    ? "bg-blue-100 dark:bg-blue-900 font-medium"
                                    : "hover:bg-gray-100 dark:hover:bg-zinc-800"
                                }`}
                              >
                                {category.name}
                              </button>
                            ))}
                          </div>
                        </Disclosure.Panel>
                      </div>
                    )}
                  </Disclosure>
                </div>

                {/* Desktop Indicators */}
                <div className=" flex-col gap-0 p-6 w-full mb-4 hidden md:flex">
                  <p className="text-xs font-body uppercase font-bold text-black dark:text-white mb-3">
                    Indicators
                  </p>
                  <button
                    type="button"
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
                      <div>
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
                              type="button"
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
                      </div>
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
                    onRefreshCategory={async () => {
                      const { data: refreshedCategories } = await refetchCategories();
                      if (refreshedCategories && refreshedCategories.length > 0) {
                        const currentCategory = refreshedCategories.find(
                          (c: Category) => c.id === selectedCategory.id
                        );
                        setSelectedCategory(currentCategory || refreshedCategories[0]);
                      }
                    }}
                    communityId={community?.uid as string}
                  />
                ) : viewMode === "indicators" ? (
                  <IndicatorsView categories={categories} communityId={community?.uid as string} />
                ) : null}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="flex w-full items-center justify-center">
          <p>{MESSAGES.ADMIN.NOT_AUTHORIZED(community?.uid || "")}</p>
        </div>
      )}
    </div>
  );
}
