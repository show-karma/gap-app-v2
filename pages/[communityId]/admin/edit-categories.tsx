import React, { Fragment, useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useGap } from "@/hooks";
import {
  INDEXER,
  MESSAGES,
  PAGES,
  cn,
  defaultMetadata,
  formatDate,
  reduceText,
  useSigner,
  zeroUID,
} from "@/utilities";
import { Community, Grant } from "@show-karma/karma-gap-sdk";
import { isCommunityAdminOf } from "@/utilities/sdk/communities/isCommunityAdmin";
import { useAccount } from "wagmi";
import { Spinner } from "@/components/Utilities/Spinner";
import { getGrants } from "@/utilities/sdk/communities";
import { Hex } from "viem";
import fetchData from "@/utilities/fetchData";
import TablePagination from "@/components/Utilities/TablePagination";
import { CheckIcon, ChevronLeftIcon } from "@heroicons/react/20/solid";
import { Listbox, Transition } from "@headlessui/react";
import { ChevronUpDownIcon } from "@heroicons/react/24/solid";
import toast from "react-hot-toast";
import pluralize from "pluralize";
import { Button } from "@/components/Utilities/Button";
import Link from "next/link";
import { NextSeo } from "next-seo";
import { CategoryCreationDialog } from "@/components/Pages/Admin/CategoryCreationDialog";

interface GrantEdited {
  uid: string;
  categories: string[];
}

interface CategoriesOptions {
  id: number;
  name: string;
}

type SimplifiedGrants = {
  grant: string;
  project: string;
  description: string;
  createdOn: string;
  categories: string[];
  uid: string;
};

const milestonesPercentage = (grantToCalculate: Grant) => {
  const total = grantToCalculate.milestones?.length;
  const completed = grantToCalculate.milestones?.filter(
    (milestone) => milestone.completed
  ).length;
  if (!total) return 0;
  return Math.round((completed / total) * 100) || 0;
};

export default function Index() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const communityId = router.query.communityId as string;
  const { gap } = useGap();
  const [grants, setGrants] = useState<SimplifiedGrants[]>([]);
  const [categoriesOptions, setCategoriesOptions] = useState<
    CategoriesOptions[]
  >([]);
  const [grantsEdited, setGrantsEdited] = useState<GrantEdited[]>([]);

  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Pagination infos
  const itemsPerPage = 12; // Set the total number of items you want returned from the API
  const [currentPage, setCurrentPage] = useState(1);
  const [totalGrants, setTotalGrants] = useState(0);

  // Call API
  const [loading, setLoading] = useState<boolean>(true); // Loading state of the API call
  const [community, setCommunity] = useState<Community | undefined>(undefined); // Data returned from the API
  const [isAdmin, setIsAdmin] = useState<boolean>(false); // Data returned from the API
  const signer = useSigner();

  useEffect(() => {
    const fetchDetails = async () => {
      if (!communityId || !gap) return;
      setLoading(true);
      try {
        const result = await (communityId.startsWith("0x")
          ? gap.fetch.communityById(communityId as `0x${string}`)
          : gap.fetch.communityBySlug(communityId));
        if (!result || result.uid === zeroUID)
          throw new Error("Community not found");
        setCommunity(result);
      } catch (error: any) {
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
  }, [communityId, gap]);

  useEffect(() => {
    if (!community) return;

    const checkIfAdmin = async () => {
      setLoading(true);
      if (!community?.uid) return;
      try {
        const checkAdmin = await isCommunityAdminOf(
          community,
          address as string,
          signer
        );
        setIsAdmin(checkAdmin);
      } catch (error) {
        console.log(error);
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    };

    checkIfAdmin();
  }, [address, isConnected, community?.uid, signer]);

  const getCategories = async () => {
    try {
      const [data] = await fetchData(
        INDEXER.GRANTS.CATEGORIES.ALL(communityId)
      );
      const orderedCategories = data.sort(
        (a: CategoriesOptions, b: CategoriesOptions) => {
          return a.name.localeCompare(b.name, "en");
        }
      );
      setCategoriesOptions(orderedCategories);
    } catch (error) {
      setCategoriesOptions([]);
      console.error(error);
    }
  };

  useEffect(() => {
    if (!communityId || communityId === zeroUID) return;

    const fetchGrants = async () => {
      setLoading(true);
      try {
        const { grants: fetchedGrants } = await getGrants(communityId as Hex);
        if (fetchedGrants) {
          setTotalGrants(fetchedGrants.length);

          const mapSimplifiedGrants: SimplifiedGrants[] = fetchedGrants
            .slice(itemsPerPage * (currentPage - 1), itemsPerPage * currentPage)
            .map(
              (grant: any) =>
                ({
                  grant: grant.details?.data?.title || grant.uid || "",
                  project: grant.project?.details?.data?.title || "",
                  description: reduceText(
                    grant.details?.data?.description || ""
                  ),
                  categories: grant.categories || [],
                  uid: grant.uid,
                } as SimplifiedGrants)
            );
          setGrants(mapSimplifiedGrants);
        }
      } catch (error) {
        console.log("error", error);
        setGrants([]);
      } finally {
        setLoading(false);
      }
    };

    fetchGrants();
    getCategories();
  }, [communityId, currentPage]);

  const editGrant = (uid: string, newCategories: string[]) => {
    const newGrantsEdited = grantsEdited.filter(
      (grant) => grant.uid !== uid
    ) as GrantEdited[];
    newGrantsEdited.push({ uid, categories: newCategories });
    setGrantsEdited(newGrantsEdited);
  };

  const saveEdits = async () => {
    setIsSaving(true);
    try {
      let hasError = false;
      const promises = grantsEdited.map((grant) => {
        return fetchData(INDEXER.GRANTS.CATEGORIES.UPDATE(grant.uid), "PUT", {
          categories: grant.categories,
        })
          .then(([res, error]) => {
            if (error) {
              hasError = true;
            }
            // update grant
            const grantToEdit = grants.find(
              (item) => item.uid === grant.uid
            ) as SimplifiedGrants;
            grantToEdit.categories = grant.categories;
            setGrants([...grants]);

            // update edited grants
            const newGrantsEdited = grantsEdited.filter(
              (item) => item.uid !== grant.uid
            );
            setGrantsEdited(newGrantsEdited);
          })
          .catch((error) => {
            console.error(error);
            hasError = true;
          });
      });
      const teste = await Promise.all(promises);

      if (hasError) {
        throw new Error("Error updating categories");
      }

      toast.success("Categories updated successfully.");
    } catch (error) {
      toast.error("Something went wrong, please try again later.");
      console.log(error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <NextSeo
        title={defaultMetadata.title}
        description={defaultMetadata.description}
        twitter={{
          handle: defaultMetadata.twitter.creator,
          site: defaultMetadata.twitter.site,
          cardType: "summary_large_image",
        }}
        openGraph={{
          url: defaultMetadata.openGraph.url,
          title: defaultMetadata.title,
          description: defaultMetadata.description,
          images: defaultMetadata.openGraph.images.map((image) => ({
            url: image,
            alt: defaultMetadata.title,
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
      <div className="px-4 sm:px-6 lg:px-12 py-5">
        <div className="py-8 rounded-xl bg-black border border-primary-800 text-center flex flex-col gap-2 justify-center w-full items-center">
          <div className="flex justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text */}
            <img
              src={community?.details?.imageURL}
              className={cn(
                "h-14 w-14 rounded-full",
                loading ? "animate-pulse bg-gray-600" : ""
              )}
            />
          </div>

          <div className="mt-3 text-3xl font-black text-white w-max flex flex-row gap-2">
            <span
              className={cn(
                loading
                  ? "animate-pulse min-w-32 bg-gray-600 rounded-lg px-4 py-0"
                  : ""
              )}
            >
              {community && !loading ? community.details?.name : ""}
            </span>{" "}
            Admin
          </div>
        </div>

        <div className="mt-12 flex gap-8 flex-row max-lg:flex-col-reverse w-full">
          {loading ? (
            <div className="flex w-full items-center justify-center">
              <Spinner />
            </div>
          ) : isAdmin ? (
            <div className="w-full flex flex-col gap-8">
              <div className="w-full flex flex-row items-center justify-between">
                <Link
                  href={PAGES.ADMIN.ROOT(
                    community?.details?.slug || (community?.uid as string)
                  )}
                >
                  <Button className="flex flex-row items-center gap-2 px-4 py-2 bg-transparent text-black dark:text-white dark:bg-transparent hover:bg-transparent rounded-md transition-all ease-in-out duration-200">
                    <ChevronLeftIcon className="h-5 w-5" />
                    Return to admin page
                  </Button>
                </Link>
                <div className="flex">
                  <CategoryCreationDialog refreshCategories={getCategories} />
                </div>
              </div>
              <div className="flex flex-col justify-center w-full max-w-full overflow-x-auto rounded-md border">
                <table className="pt-3 min-w-full divide-y dark:bg-zinc-900 divide-gray-300 dark:divide-zinc-800 dark:text-white">
                  <thead>
                    <tr className="border-b transition-colors text-gray-500 dark:text-gray-200 hover:bg-muted/50 data-[state=selected]:bg-muted">
                      <th
                        scope="col"
                        className="h-12 px-4 text-left align-middle font-medium"
                      >
                        Project
                      </th>
                      <th
                        scope="col"
                        className="h-12 px-4 text-left align-middle font-medium"
                      >
                        Grant Title
                      </th>
                      <th
                        scope="col"
                        className="h-12 px-4 text-left align-middle font-medium"
                      >
                        Description
                      </th>
                      <th
                        scope="col"
                        className="h-12 px-4 text-left align-middle font-medium"
                      >
                        Categories
                      </th>
                      <th
                        scope="col"
                        className="h-12 px-4 text-left align-middle font-medium"
                      >
                        Edit categories
                      </th>
                    </tr>
                  </thead>
                  <tbody className="px-4 divide-y divide-gray-200 dark:divide-zinc-800">
                    {grants.map((grant) => {
                      const categories =
                        grantsEdited.find((item) => item.uid === grant.uid)
                          ?.categories || grant.categories;
                      return (
                        <tr
                          key={grant.uid}
                          className="dark:text-zinc-300 text-gray-900 px-4 py-4"
                        >
                          <td className="px-4 py-2 font-medium h-16">
                            <div className="max-w-full line-clamp-2">
                              {grant.project}
                            </div>
                          </td>
                          <td className="px-4 py-2">
                            <div className="max-w-full line-clamp-2">
                              {grant.grant}
                            </div>
                          </td>
                          <td className="px-4 py-2">
                            <div className=" max-w-[200px] line-clamp-2">
                              {grant.description}
                            </div>
                          </td>
                          <td className="px-4 py-2 max-w-[200px]">
                            {grant.categories.join(", ")}
                          </td>
                          <td className="w-max">
                            <Listbox
                              value={categories}
                              onChange={(value) => editGrant(grant.uid, value)}
                              multiple
                            >
                              {({ open }) => (
                                <div className="flex items-center gap-x-2">
                                  <div className="relative flex-1 w-56">
                                    <Listbox.Button className=" dark:bg-zinc-800 dark:text-white relative w-full max-w-[200px] cursor-default rounded-md bg-white py-1.5 pl-3 pr-10 text-left text-gray-900  ring-1 ring-inset ring-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-600 sm:text-sm sm:leading-6">
                                      <p className="block truncate">
                                        {categories.length > 0
                                          ? `${categories.length} 
                        ${pluralize("category", categories.length)} selected`
                                          : "Categories"}
                                      </p>
                                      <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                                        <ChevronUpDownIcon
                                          className="h-5 w-5 text-gray-400"
                                          aria-hidden="true"
                                        />
                                      </span>
                                    </Listbox.Button>

                                    <Transition
                                      show={open}
                                      as={Fragment}
                                      leave="transition ease-in duration-100"
                                      leaveFrom="opacity-100"
                                      leaveTo="opacity-0"
                                    >
                                      <Listbox.Options className="dark:bg-zinc-800 dark:text-white absolute z-10 mt-1 max-h-60 w-full max-w-max min-w-[200px] overflow-auto rounded-md bg-white py-1 text-base  ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
                                        {categoriesOptions.map((category) => (
                                          <Listbox.Option
                                            key={category.id}
                                            className={({ active }) =>
                                              cn(
                                                active
                                                  ? "bg-gray-100 text-black dark:text-gray-300 dark:bg-zinc-900"
                                                  : "text-gray-900 dark:text-gray-200 ",
                                                "relative cursor-default select-none py-2 pl-3 pr-9 transition-all ease-in-out duration-200"
                                              )
                                            }
                                            value={category.name}
                                          >
                                            {({ selected, active }) => {
                                              return (
                                                <>
                                                  <span
                                                    className={cn(
                                                      selected
                                                        ? "font-semibold"
                                                        : "font-normal",
                                                      "block truncate"
                                                    )}
                                                  >
                                                    {category.name}
                                                  </span>

                                                  {selected ? (
                                                    <span
                                                      className={cn(
                                                        "text-primary-600 dark:text-primary-400",
                                                        "absolute inset-y-0 right-0 flex items-center pr-4"
                                                      )}
                                                    >
                                                      <CheckIcon
                                                        className="h-5 w-5"
                                                        aria-hidden="true"
                                                      />
                                                    </span>
                                                  ) : null}
                                                </>
                                              );
                                            }}
                                          </Listbox.Option>
                                        ))}
                                      </Listbox.Options>
                                    </Transition>
                                  </div>
                                </div>
                              )}
                            </Listbox>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <div className="dark:bg-zinc-900 flex flex-col pb-4 items-end">
                  <div className="w-full">
                    <TablePagination
                      currentPage={currentPage}
                      setCurrentPage={setCurrentPage}
                      postsPerPage={itemsPerPage}
                      totalPosts={totalGrants}
                    />
                  </div>
                  <Button
                    disabled={isSaving || grantsEdited.length === 0}
                    onClick={saveEdits}
                    className="w-max  mx-4 px-8 py-2 bg-blue-400 text-white rounded-md disabled:opacity-25 dark:bg-blue-900"
                  >
                    Save
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex w-full items-center justify-center">
              <p>{MESSAGES.ADMIN.NOT_AUTHORIZED}</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
