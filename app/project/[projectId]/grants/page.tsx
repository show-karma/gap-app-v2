/* eslint-disable @next/next/no-img-element */
import React, { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ProjectPageLayout } from "../page";
import { useOwnerStore, useProjectStore } from "@/store";
import {
  Grant,
  IGrantDetails,
  IProjectDetails,
} from "@show-karma/karma-gap-sdk";
import { ExternalLink } from "@/components/Utilities/ExternalLink";
import {
  ArrowTopRightOnSquareIcon,
  PencilSquareIcon,
} from "@heroicons/react/24/outline";
import formatCurrency from "@/utilities/formatCurrency";
import { Hex } from "viem";
import markdownStyles from "@/styles/markdown.module.css";

import { CheckCircleIcon, PlusIcon } from "@heroicons/react/20/solid";
import { Button } from "@/components/Utilities/Button";
import {
  EmptyGrantsSection,
  NewGrant,
} from "@/components/Pages/GrantMilestonesAndUpdates/screens";
import { useRouter } from "next/router";
import { GrantScreen } from "@/types/grant";
import { NewMilestone } from "@/components/Pages/GrantMilestonesAndUpdates/screens/NewMilestone";
import { NewGrantUpdate } from "@/components/Pages/GrantMilestonesAndUpdates/screens/NewGrantUpdate";
import { useAccount } from "wagmi";
import { GrantDelete } from "@/components/Pages/GrantMilestonesAndUpdates/GrantDelete";
import { GrantCompleteButton } from "@/components/Pages/GrantMilestonesAndUpdates/GrantCompleteButton";
import { GrantCompletion } from "@/components/Pages/GrantMilestonesAndUpdates/screens/MilestonesAndUpdates/CompleteGrant";
import { GetServerSidePropsContext, InferGetServerSidePropsType } from "next";
import { NextSeo } from "next-seo";
import { MarkdownPreview } from "@/components/Utilities/MarkdownPreview";
import { GrantMilestonesAndUpdates } from "@/components/Pages/GrantMilestonesAndUpdates";
import { GrantContext } from "@/components/Pages/GrantMilestonesAndUpdates/GrantContext";
import { GrantAllReviews } from "@/components/Pages/AllReviews";
import { ReviewGrant } from "@/components/Pages/ReviewGrant";

import { useQueryState } from "nuqs";
import {
  getMetadata,
  getQuestionsOf,
  getReviewsOf,
  isCommunityAdminOf,
} from "@/utilities/sdk";
import { zeroUID } from "@/utilities/commons";
import { PAGES } from "@/utilities/pages";
import { defaultMetadata } from "@/utilities/meta";
import { cn } from "@/utilities/tailwind";
import { MESSAGES } from "@/utilities/messages";
import { formatDate } from "@/utilities/formatDate";
import { useCommunityAdminStore } from "@/store/community";
import { useSigner } from "@/utilities/eas-wagmi-utils";
import { useGap } from "@/hooks";
import { useAuthStore } from "@/store/auth";
import { useCommunitiesStore } from "@/store/communities";
import { chainImgDictionary } from "@/utilities/chainImgDictionary";
import { chainNameDictionary } from "@/utilities/chainNameDictionary";
import { GrantsAccordion } from "@/components/GrantsAccordion";

interface Tab {
  name: string;
  tabName: string;
  current: boolean;
}

const authorizedViews: GrantScreen[] = [
  "create-milestone",
  "create-grant",
  "grant-update",
  "edit-grant",
  "complete-grant",
];

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const { params } = context;
  const projectId = params?.projectId as string;
  const grant = context.query?.grantId as string | undefined;
  const tab = context.query?.tab as string | undefined;

  const projectInfo = await getMetadata<IProjectDetails>(
    "projects",
    projectId as Hex
  );

  if (projectInfo?.uid === zeroUID || !projectInfo) {
    return {
      notFound: true,
    };
  }
  if (grant && tab) {
    const grantInfo = await getMetadata<IGrantDetails>("grants", grant as Hex);
    if (grantInfo) {
      const tabMetadata: Record<
        string,
        {
          title: string;
          description: string;
        }
      > = {
        overview: {
          title: `Karma GAP - ${projectInfo?.title || projectInfo?.uid} - ${
            grantInfo?.title
          } grant overview`,
          description:
            `${grantInfo?.description?.slice(0, 160)}${
              grantInfo?.description && grantInfo?.description?.length >= 160
                ? "..."
                : ""
            }` || "",
        },

        "milestones-and-updates": {
          title: `Karma GAP - ${projectInfo?.title || projectInfo?.uid} - ${
            grantInfo?.title
          } grant milestones and updates`,
          description: `View all milestones and updates by ${
            projectInfo?.title || projectInfo?.uid
          } for ${grantInfo?.title} grant.`,
        },

        "impact-criteria": {
          title: `Karma GAP - ${projectInfo?.title || projectInfo?.uid} - ${
            grantInfo?.title
          } grant impact criteria`,
          description: `Impact criteria defined by ${
            projectInfo?.title || projectInfo?.uid
          } for ${grantInfo?.title} grant.`,
        },

        reviews: {
          title: `Karma GAP - ${projectInfo?.title || projectInfo?.uid} - ${
            grantInfo?.title
          } grant community reviews`,
          description: `View all community reviews of ${
            projectInfo?.title || projectInfo?.uid
          }'s ${grantInfo?.title} grant.`,
        },

        "review-this-grant": {
          title: `Karma GAP - ${projectInfo?.title || projectInfo?.uid} - ${
            grantInfo?.title
          } grant`,
          description: `As a community contributor, you can review ${
            projectInfo?.title || projectInfo?.uid
          }'s ${grantInfo?.title} grant now!`,
        },
      };

      return {
        props: {
          metadataTitle:
            tabMetadata[tab || "overview"]?.title ||
            tabMetadata["overview"]?.title ||
            "",
          metadataDesc:
            tabMetadata[tab || "overview"]?.description ||
            tabMetadata["overview"]?.description ||
            "",
        },
      };
    }
  }
  return {
    props: {
      metadataTitle: `Karma GAP - ${projectInfo?.title}`,
      metadataDesc: projectInfo?.description?.substring(0, 80) || "",
    },
  };
}

const GrantsPage = ({
  metadataTitle,
  metadataDesc,
}: InferGetServerSidePropsType<typeof getServerSideProps>) => {
  const searchParams = useSearchParams();
  const tabFromQueryParam = searchParams?.get("tab");
  const grantIdFromQueryParam = searchParams?.get("grantId");
  const [currentTab, setCurrentTab] = useState("overview");
  const [grant, setGrant] = useState<Grant | undefined>(undefined);
  const project = useProjectStore((state) => state.project);
  const navigation =
    project?.grants?.map((item) => ({
      uid: item.uid,
      name: item.details?.title || "",
      href: PAGES.PROJECT.GRANT(project.details?.slug || project.uid, item.uid),
      icon: item.community?.details?.imageURL || "",
      current: item.uid === grantIdFromQueryParam || item.uid === grant?.uid,
      completed: item.completed,
    })) || [];
  const [tabs, setTabs] = useState<Tab[]>([]);
  const router = useRouter();

  const isProjectOwner = useProjectStore((state) => state.isProjectOwner);
  const isContractOwner = useOwnerStore((state) => state.isOwner);
  const isCommunityAdmin = useCommunityAdminStore(
    (state) => state.isCommunityAdmin
  );
  const { communities } = useCommunitiesStore();
  const isCommunityAdminOfSome = communities.length !== 0;
  const isAuthorized = isProjectOwner || isContractOwner || isCommunityAdmin;
  const [, changeTab] = useQueryState("tab");
  const [, changeGrantId] = useQueryState("grantId");
  const { address } = useAccount();

  // UseEffect to check if current URL changes
  useEffect(() => {
    if (tabFromQueryParam) {
      if (
        !isAuthorized &&
        currentTab &&
        authorizedViews.includes(currentTab as GrantScreen)
      ) {
        setCurrentTab("overview");
      } else {
        setCurrentTab(tabFromQueryParam);
      }
    }
  }, [tabFromQueryParam, isAuthorized, address]);

  useEffect(() => {
    if (project) {
      if (grantIdFromQueryParam) {
        const grantFound = project?.grants?.find(
          (grant) =>
            grant.uid?.toLowerCase() === grantIdFromQueryParam?.toLowerCase()
        );
        if (grantFound) {
          setGrant(grantFound);
          return;
        }
      }
      setGrant(project?.grants?.[0]);
    }
  }, [project, grantIdFromQueryParam]);

  const defaultTabs: {
    name: string;

    tabName: GrantScreen;
    current: boolean;
  }[] = [
    {
      name: "Overview",
      tabName: "overview",
      current: true,
    },
    {
      name: "Milestones and Updates",
      tabName: "milestones-and-updates",
      current: false,
    },
    {
      name: "Impact Criteria",
      tabName: "impact-criteria",
      current: false,
    },
  ];

  useEffect(() => {
    const mountTabs = async () => {
      const firstTabs: Tab[] = [...defaultTabs];

      if (
        !grant ||
        !grant.categories?.length ||
        grant.categories?.length <= 0
      ) {
        setTabs(firstTabs);
        return;
      }

      const hasQuestions = await getQuestionsOf(grant.uid)
        .then((data) => data.length > 0)
        .catch(() => false);

      const reviewTabs = [
        {
          name: "Reviews",
          tabName: "reviews",
          current: false,
        },
        {
          name: "Review this grant",
          tabName: "review-this-grant",
          current: false,
        },
      ];

      if (hasQuestions) {
        const finalTabs = firstTabs.concat(reviewTabs);
        setTabs(finalTabs);
      } else {
        const hasReviews = await getReviewsOf(grant.uid)
          .then((data) => data.length > 0)
          .catch(() => false);
        if (hasReviews) {
          const allReviewsTabTogether = firstTabs.concat([
            {
              name: "Reviews",
              tabName: "reviews",
              current: false,
            },
          ]);
          setTabs(allReviewsTabTogether);
          return;
        }
        setTabs(firstTabs);
      }
    };

    mountTabs();
  }, [grant?.uid]);

  const setIsCommunityAdmin = useCommunityAdminStore(
    (state) => state.setIsCommunityAdmin
  );
  const setIsCommunityAdminLoading = useCommunityAdminStore(
    (state) => state.setIsCommunityAdminLoading
  );

  const signer = useSigner();
  const { chain } = useAccount();
  const { gap } = useGap();
  const { isAuth } = useAuthStore();

  const checkIfAdmin = async () => {
    setIsCommunityAdmin(false);
    if (!chain?.id || !gap || !grant || !address || !signer || !isAuth) {
      setIsCommunityAdmin(false);
      setIsCommunityAdminLoading(false);
      return;
    }
    setIsCommunityAdminLoading(true);
    try {
      const community = await gap.fetch.communityById(grant.communityUID);
      const result = await isCommunityAdminOf(
        community,
        address as string,
        signer
      );
      setIsCommunityAdmin(result);
    } catch (error) {
      console.log(error);
      setIsCommunityAdmin(false);
    } finally {
      setIsCommunityAdminLoading(false);
    }
  };

  useEffect(() => {
    checkIfAdmin();
  }, [address, grant?.uid, signer, isAuth]);

  return (
    <>
      <NextSeo
        title={metadataTitle || defaultMetadata.title}
        description={metadataDesc || defaultMetadata.description}
        twitter={{
          handle: defaultMetadata.twitter.creator,
          site: defaultMetadata.twitter.site,
          cardType: "summary_large_image",
        }}
        openGraph={{
          url: defaultMetadata.openGraph.url,
          title: metadataTitle || defaultMetadata.title,
          description: metadataDesc || defaultMetadata.description,
          images: defaultMetadata.openGraph.images.map((image) => ({
            url: image,
            alt: metadataTitle || defaultMetadata.title,
          })),
          // site_name: defaultMetadata.openGraph.siteName,
        }}
        additionalLinkTags={[
          {
            rel: "icon",
            href: "/images/favicon.png",
          },
        ]}
      />
      <div className="flex max-lg:flex-col">
        {project?.grants.length ? (
          <div className="w-full max-w-[320px] max-lg:max-w-full py-5 border-none max-lg:w-full max-lg:px-0">
            <div className=" lg:hidden">
              <GrantsAccordion>
                {navigation.map((item) => (
                  <div key={item.uid}>
                    <button
                      onClick={() => {
                        changeGrantId(item.uid);
                      }}
                      className={cn(
                        " text-[#155eef] hover:text-primary-600",
                        "flex items-center rounded-md text-sm leading-6 font-semibold w-full"
                      )}
                    >
                      <div className="flex flex-row w-full items-center gap-2 justify-between">
                        <div className="flex flex-row items-center">
                          <p className="line-clamp-2 break-normal font-medium text-left text-base underline">
                            {item.name}
                          </p>
                        </div>
                        <div className="w-6 min-w-6">
                          {item?.completed && (
                            <CheckCircleIcon className="w-5 h-5 text-green-600" />
                          )}
                        </div>
                      </div>
                    </button>
                  </div>
                ))}
                {(isAuthorized || isCommunityAdminOfSome) && (
                  <div className="mt-4">
                    <Button
                      onClick={() => {
                        if (project) {
                          changeTab("create-grant");
                        }
                      }}
                      className="flex h-max w-full  flex-row items-center  hover:opacity-75 justify-center gap-3 rounded border border-[#155EEF] bg-[#155EEF] px-3 py-2 text-sm font-semibold text-white   max-sm:w-full"
                    >
                      <p>Add a new grant</p>
                      <PlusIcon className="w-5 h-5" />
                    </Button>
                  </div>
                )}
              </GrantsAccordion>
            </div>
            <nav
              className="flex flex-1 flex-col gap-4 max-lg:hidden"
              aria-label="Sidebar"
            >
              <div className="flex w-full min-w-[240px] flex-row items-center gap-2">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 dark:text-zinc-300"
                >
                  <g clipPath="url(#clip0_2139_16649)">
                    <path
                      d="M5.66659 9.77648C5.66659 10.6356 6.36303 11.332 7.22214 11.332H8.66659C9.58706 11.332 10.3333 10.5858 10.3333 9.66536C10.3333 8.74489 9.58706 7.9987 8.66659 7.9987H7.33325C6.41278 7.9987 5.66659 7.25251 5.66659 6.33203C5.66659 5.41156 6.41278 4.66536 7.33325 4.66536H8.7777C9.63681 4.66536 10.3333 5.36181 10.3333 6.22092M7.99992 3.66536V4.66536M7.99992 11.332V12.332M14.6666 7.9987C14.6666 11.6806 11.6818 14.6654 7.99992 14.6654C4.31802 14.6654 1.33325 11.6806 1.33325 7.9987C1.33325 4.3168 4.31802 1.33203 7.99992 1.33203C11.6818 1.33203 14.6666 4.3168 14.6666 7.9987Z"
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </g>
                  <defs>
                    <clipPath id="clip0_2139_16649">
                      <rect width="16" height="16" fill="white" />
                    </clipPath>
                  </defs>
                </svg>

                <p className="text-xs font-bold text-black dark:text-zinc-300 ">
                  GRANTS
                </p>
              </div>
              <ul role="list" className="space-y-2 mt-8">
                {navigation.map((item) => (
                  <li key={item.uid}>
                    <button
                      onClick={() => {
                        changeGrantId(item.uid);
                      }}
                      className={cn(
                        item.current
                          ? "bg-[#eef4ff] dark:bg-zinc-800 dark:text-primary-300  text-[#155eef]"
                          : "text-gray-700 hover:text-primary-600 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-700",
                        "flex items-center rounded-md text-sm leading-6 font-semibold w-full"
                      )}
                    >
                      <div className="flex flex-row w-full items-center gap-2 justify-between px-4 py-2">
                        <div className="flex flex-row items-center gap-2">
                          <img
                            src={item.icon}
                            alt=""
                            className={cn(
                              item.current
                                ? "text-primary-600"
                                : "text-gray-400 group-hover:text-primary-600",
                              "h-5 w-5 shrink-0 rounded-full object-cover"
                            )}
                          />
                          <p className="line-clamp-2 break-normal font-medium text-left text-lg">
                            {item.name}
                          </p>
                        </div>
                        <div className="w-6 min-w-6">
                          {item?.completed && (
                            <CheckCircleIcon className="w-5 h-5 text-green-600" />
                          )}
                        </div>
                      </div>
                    </button>
                  </li>
                ))}
                {(isAuthorized || isCommunityAdminOfSome) && (
                  <li>
                    <Button
                      onClick={() => {
                        if (project) {
                          changeTab("create-grant");
                        }
                      }}
                      className="flex h-max w-full  flex-row items-center  hover:opacity-75 justify-center gap-3 rounded border border-[#155EEF] bg-[#155EEF] px-3 py-2 text-sm font-semibold text-white   max-sm:w-full"
                    >
                      <p>Add a new grant</p>
                      <PlusIcon className="w-5 h-5" />
                    </Button>
                  </li>
                )}
              </ul>
            </nav>
          </div>
        ) : null}
        <div className="flex-1 pl-5 pt-5 pb-20 max-lg:px-0 max-lg:pt-0">
          {/* Grants tabs start */}
          {project?.grants.length ? (
            <div className="flex flex-row gap-4 justify-between max-md:flex-col border-b border-b-zinc-900 dark:border-b-zinc-200 pb-2 mb-4">
              <div className="flex flex-row gap-2 items-center">
                <div className="text-xl font-semibold text-black dark:text-zinc-100">
                  {grant?.details?.title}
                </div>
                {isAuthorized && project && grant && (
                  <button
                    onClick={() => {
                      changeTab("edit-grant");
                    }}
                    className="rounded-md items-center text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600 disabled:opacity-35 hover:opacity-75 transition-all ease-in-out duration-300 flex h-max w-max flex-row gap-2 bg-zinc-800 p-2 text-white hover:bg-zinc-800 hover:text-white"
                  >
                    Edit grant
                    <PencilSquareIcon className="h-4 w-4" />
                  </button>
                )}
              </div>
              {isAuthorized && grant ? (
                <div className="flex flex-row gap-2">
                  {project ? (
                    <GrantCompleteButton project={project} grant={grant} />
                  ) : null}
                  <GrantDelete grant={grant} />
                </div>
              ) : null}
            </div>
          ) : null}
          {project?.grants.length && currentTab !== "create-grant" ? (
            <div className="sm:block">
              <nav
                className="isolate flex flex-row max-lg:w-full flex-wrap gap-4 divide-x divide-gray-200 rounded-lg py-1 px-1  bg-[#F2F4F7] dark:bg-zinc-900 w-max transition-all duration-300 ease-in-out"
                aria-label="Tabs"
              >
                {tabs.map((tab) => (
                  <button
                    key={tab.name}
                    onClick={() => {
                      changeTab(tab.tabName);
                    }}
                    className={cn(
                      tabFromQueryParam === tab.tabName ||
                        (tab.tabName === "overview" && !tabFromQueryParam)
                        ? "text-gray-900 bg-white dark:bg-zinc-700 dark:text-zinc-100"
                        : "text-gray-500 hover:text-gray-700 dark:text-zinc-400",
                      "group relative min-w-0 w-max border-none overflow-hidden rounded-lg py-2 px-3 text-center text-sm font-semibold hover:bg-gray-50 dark:hover:bg-zinc-800 dark:hover:text-white focus:z-10 transition-all duration-300 ease-in-out"
                    )}
                  >
                    <span>{tab.name}</span>
                  </button>
                ))}
              </nav>
            </div>
          ) : null}
          {/* Grants tabs end */}
          {project?.grants.length || currentTab === "create-grant" ? (
            <div className="flex flex-col py-5">
              <GrantContext.Provider value={grant}>
                {currentTab === "milestones-and-updates" && (
                  <GrantMilestonesAndUpdates grant={grant} />
                )}
                {currentTab === "impact-criteria" && (
                  <GrantImpactCriteria grant={grant} />
                )}
                {currentTab === "reviews" && <GrantAllReviews grant={grant} />}
                {currentTab === "review-this-grant" && (
                  <Suspense>
                    <ReviewGrant grant={grant} />
                  </Suspense>
                )}
                {/*  */}
                {currentTab === "create-grant" && project?.uid && (
                  <NewGrant grantToEdit={grant} />
                )}
                {currentTab === "edit-grant" && project?.uid && grant && (
                  <NewGrant grantToEdit={grant} />
                )}
                {(currentTab === "create-milestone" ||
                  currentTab === "edit-milestone") &&
                  grant && <NewMilestone grant={grant} />}
                {currentTab === "grant-update" && grant && (
                  <NewGrantUpdate grant={grant} />
                )}
                {currentTab === "complete-grant" && grant && project && (
                  <GrantCompletion project={project} grant={grant} />
                )}
                {(currentTab === "overview" || !currentTab) && (
                  <GrantOverview grant={grant} />
                )}
              </GrantContext.Provider>
            </div>
          ) : (
            <div className="w-full py-5">
              <EmptyGrantsSection />
            </div>
          )}
        </div>
      </div>
    </>
  );
};

GrantsPage.getLayout = ProjectPageLayout;

export default GrantsPage;

interface GrantOverviewProps {
  grant: Grant | undefined;
}

const isValidAmount = (amount?: string | undefined) => {
  if (!amount) return undefined;

  const number = Number(amount);
  if (Number.isNaN(number)) return amount;

  return formatCurrency(+amount);
};

const GrantOverview = ({ grant }: GrantOverviewProps) => {
  const milestones = grant?.milestones;
  const project = useProjectStore((state) => state.project);
  const isProjectOwner = useProjectStore((state) => state.isProjectOwner);
  const isContractOwner = useOwnerStore((state) => state.isOwner);
  const isCommunityAdmin = useCommunityAdminStore(
    (state) => state.isCommunityAdmin
  );
  const isAuthorized = isProjectOwner || isContractOwner || isCommunityAdmin;
  const [, changeTab] = useQueryState("tab");

  const getPercentage = () => {
    if (!milestones) return 0;

    const total = milestones.length;
    const completed = milestones.filter(
      (milestone) => milestone.completed
    ).length;

    const percent = grant?.completed ? 100 : (completed / total) * 100;
    return Number.isNaN(percent) ? 0 : +percent.toFixed(2);
  };

  const grantData: { stat?: number | string; title: string }[] = [
    {
      stat: isValidAmount(grant?.details?.amount),
      title: "Total Grant Amount",
    },
    {
      stat: grant?.details?.startDate
        ? formatDate(grant?.details?.startDate * 1000)
        : undefined,
      title: "Start Date",
    },
    // {
    //   stat: grant?.details?.season,
    //   title: "Season",
    // },
    // {
    //   stat: grant?.details?.cycle,
    //   title: "Cycle",
    // },
  ];

  return (
    <>
      {/* Grant Overview Start */}

      <div className="mt-5 flex flex-row max-lg:flex-col-reverse gap-4 ">
        {grant?.details?.description && (
          <div className="w-8/12 max-lg:w-full p-5 gap-2 bg-[#EEF4FF] dark:bg-zinc-900 dark:border-gray-800 rounded-xl  text-black dark:text-zinc-100">
            <h3 className="text-sm text-slate-600 dark:text-slate-400 uppercase font-semibold">
              GRANT DESCRIPTION
            </h3>
            <div className="mt-2">
              <MarkdownPreview
                className={markdownStyles.wmdeMarkdown}
                source={grant?.details?.description}
              />
            </div>
          </div>
        )}
        <div className="w-4/12 max-lg:w-full">
          <div className="border border-gray-200 rounded-xl bg-white  dark:bg-zinc-900 dark:border-gray-800">
            <div className="flex items-center justify-between p-5">
              <div className="font-semibold text-black dark:text-white">
                Grant Overview
              </div>
              {/* <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10"> */}
              <span
                className={`h-max items-center justify-center rounded-2xl  px-2 py-1 text-center text-xs font-medium leading-none text-white ${
                  +getPercentage() > 0 ? "bg-blue-600" : "bg-gray-500"
                }`}
              >
                {getPercentage()}% complete
              </span>
            </div>
            <div className="flex flex-col gap-4  px-5 pt-5 pb-5 border-t border-gray-200">
              <div className="flex items-center justify-between gap-2">
                <div className="text-gray-500 text-base  font-semibold dark:text-gray-300">
                  Community
                </div>
                <a
                  href={PAGES.COMMUNITY.ALL_GRANTS(
                    grant?.community?.details?.slug ||
                      (grant?.community?.uid as Hex)
                  )}
                >
                  <div className="w-full inline-flex items-center gap-x-2 rounded-3xl bg-[#E0EAFF] dark:bg-zinc-800 dark:border-gray-800 dark:text-blue-500 px-2 py-1 text-xs font-medium text-gray-900">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={grant?.community?.details?.imageURL}
                      alt=""
                      className="h-5 w-5 rounded-full"
                    />
                    <p className="max-w-xs truncate text-base font-semibold text-black dark:text-gray-100 max-md:text-sm w-full break-words whitespace-break-spaces">
                      {grant?.community?.details?.name}
                    </p>
                  </div>
                </a>
              </div>
              <div className="flex items-center justify-between gap-2">
                <div className="text-gray-500 text-base  font-semibold dark:text-gray-300">
                  Network
                </div>

                <div className="inline-flex items-center gap-x-2 rounded-full bg-[#E0EAFF] dark:bg-zinc-800 dark:border-gray-800 dark:text-blue-500 px-2 py-1 text-xs font-medium text-gray-900">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={chainImgDictionary(
                      grant?.community?.details?.chainID as number
                    )}
                    alt=""
                    className="h-5 w-5 rounded-full"
                  />
                  <p className="max-w-xs truncate text-base font-semibold text-black dark:text-gray-100 max-md:text-sm  w-full break-words whitespace-break-spaces">
                    {chainNameDictionary(
                      grant?.community?.details?.chainID as number
                    )}
                  </p>
                </div>
              </div>

              {grant?.details?.proposalURL ? (
                <div className="flex items-center justify-between">
                  <div className="text-gray-500  font-semibold text-base dark:text-gray-300">
                    Proposal
                  </div>
                  <ExternalLink
                    href={grant?.details?.proposalURL}
                    className="inline-flex items-center gap-x-1 rounded-md  px-2 py-1 text-xs font-medium text-blue-700 dark:bg-zinc-800 dark:border-gray-800 dark:text-blue-500"
                  >
                    <span className="text-base font-semibold">Details</span>
                    <ArrowTopRightOnSquareIcon className="w-4 h-4" />
                  </ExternalLink>
                </div>
              ) : null}
              {grantData.map((data) =>
                data.stat ? (
                  <div
                    key={data.title}
                    className="flex flex-row items-center justify-between gap-2"
                  >
                    <h4
                      className={
                        "text-gray-500  font-semibold text-base dark:text-gray-300"
                      }
                    >
                      {data.title}
                    </h4>
                    <p className={"text-base text-gray-900 dark:text-gray-100"}>
                      {data.stat}
                    </p>
                  </div>
                ) : null
              )}
            </div>
          </div>
        </div>
      </div>
      {/* Grant Overview End */}
    </>
  );
};

interface GrantImpactCriteriaProps {
  grant: Grant | undefined;
}

const GrantImpactCriteria = ({ grant }: GrantImpactCriteriaProps) => {
  const questions = grant?.details?.questions;
  return (
    <div className="space-y-5 max-w-prose">
      {questions ? (
        <div className="flex flex-col gap-4">
          {questions.map((item) => (
            <div
              className="p-5 bg-white border border-gray-200 dark:bg-zinc-800 dark:border-zinc-600 rounded-xl text-base font-semibold  text-black dark:text-zinc-100"
              key={item.query + item.explanation}
            >
              <h3>{item.query}</h3>
              <p className="text-normal font-normal">{item.explanation}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-black dark:text-zinc-100">
          {MESSAGES.GRANT.IMPACT_CRITERIA.EMPTY}
        </p>
      )}
    </div>
  );
};
