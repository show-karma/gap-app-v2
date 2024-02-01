/* eslint-disable @next/next/no-img-element */
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ProjectPageLayout } from ".";
import { MESSAGES, PAGES, cn, getQuestionsOf, getReviewsOf } from "@/utilities";
import { useOwnerStore, useProjectStore } from "@/store";
import { Grant } from "@show-karma/karma-gap-sdk";
import ReactMarkdown from "react-markdown";
import { ExternalLink } from "@/components/Utilities/ExternalLink";
import {
  ArrowTopRightOnSquareIcon,
  PencilSquareIcon,
} from "@heroicons/react/24/outline";
import formatCurrency from "@/utilities/formatCurrency";
import { Hex } from "viem";
import {
  GrantAllReviews,
  GrantMilestonesAndUpdates,
  ReviewGrant,
} from "@/components/Pages";
import { CheckCircleIcon, PlusIcon } from "@heroicons/react/20/solid";
import { Button } from "@/components/Utilities/Button";
import { NewGrant } from "@/components/Pages/GrantMilestonesAndUpdates/screens";
import { useRouter } from "next/router";
import { GrantScreen } from "@/types/grant";
import { NewMilestone } from "@/components/Pages/GrantMilestonesAndUpdates/screens/NewMilestone";
import { NewGrantUpdate } from "@/components/Pages/GrantMilestonesAndUpdates/screens/NewGrantUpdate";

interface Tab {
  name: string;
  href: string;
  tabName: string;
  current: boolean;
}

function GrantsPage() {
  const searchParams = useSearchParams();
  const tabFromQueryParam = searchParams.get("tab");
  const grantIdFromQueryParam = searchParams.get("grantId");
  const [currentTab, setCurrentTab] = useState("Overview");
  const [grant, setGrant] = useState<Grant | undefined>(undefined);
  const project = useProjectStore((state) => state.project);
  const navigation =
    project?.grants?.map((item) => ({
      uid: item.uid,
      name: item.details?.title || "",
      href: PAGES.PROJECT.GRANT(project.uid, item.uid),
      icon: item.community?.details?.imageURL || "",
      current: item.uid === grantIdFromQueryParam || item.uid === grant?.uid,
      completed: item.completed,
    })) || [];
  const [tabs, setTabs] = useState<Tab[]>([]);
  const router = useRouter();

  const isProjectOwner = useProjectStore((state) => state.isProjectOwner);
  const isContractOwner = useOwnerStore((state) => state.isOwner);
  const isAuthorized = isProjectOwner || isContractOwner;

  // UseEffect to check if current URL changes
  useEffect(() => {
    if (tabFromQueryParam) {
      setCurrentTab(tabFromQueryParam);
    }
  }, [tabFromQueryParam]);

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
    href: string;
    tabName: GrantScreen;
    current: boolean;
  }[] = [
    {
      name: "Overview",
      href: PAGES.PROJECT.TABS.OVERVIEW(
        project?.uid as string,
        grant?.uid as string
      ),
      tabName: "overview",
      current: true,
    },
    {
      name: "Milestones & Updates",
      href: PAGES.PROJECT.TABS.SELECTED_TAB(
        project?.uid as string,
        grant?.uid as string,
        "milestones-and-updates"
      ),
      tabName: "milestones-and-updates",
      current: false,
    },
    {
      name: "Impact Criteria",
      href: PAGES.PROJECT.TABS.IMPACT_CRITERIA(
        project?.uid as string,
        grant?.uid as string
      ),
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
          href: PAGES.PROJECT.TABS.REVIEWS(
            project?.uid as string,
            grant?.uid as string
          ),
          tabName: "reviews",
          current: false,
        },
        {
          name: "Review this grant",
          href: PAGES.PROJECT.TABS.REVIEW_THIS_GRANT(
            project?.uid as string,
            grant?.uid as string
          ),
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
              href: PAGES.PROJECT.TABS.REVIEWS(
                project?.uid as string,
                grant?.uid as string
              ),
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

  return (
    <div className="flex">
      <div className="w-2/12 pr-5 py-5">
        <nav className="flex flex-1 flex-col" aria-label="Sidebar">
          <ul role="list" className="-mx-2 space-y-1">
            {navigation.map((item) => (
              <li key={item.uid}>
                <Link
                  href={item.href}
                  className={cn(
                    item.current
                      ? "bg-white text-primary-600 border border-gray-200"
                      : "text-gray-700 hover:text-primary-600 hover:bg-gray-50",
                    "flex items-center rounded-xl text-sm leading-6 font-semibold w-full"
                  )}
                >
                  <div className="flex flex-row w-full items-center gap-2 justify-between px-4 py-2">
                    <div className="flex flex-row gap-4">
                      <img
                        src={item.icon}
                        alt=""
                        className={cn(
                          item.current
                            ? "text-primary-600"
                            : "text-gray-400 group-hover:text-primary-600",
                          "h-6 w-6 shrink-0 rounded-full"
                        )}
                      />
                      <p className="line-clamp-2 break-words max-w-44">
                        {item.name}
                      </p>
                    </div>
                    <div className="w-6 min-w-6">
                      {item?.completed && (
                        <CheckCircleIcon className="w-5 h-5 text-green-600" />
                      )}
                    </div>
                  </div>
                </Link>
              </li>
            ))}
            {isAuthorized && (
              <li>
                <Button
                  onClick={() => {
                    if (project) {
                      router.push(
                        PAGES.PROJECT.TABS.SELECTED_TAB(
                          project?.uid || "",
                          undefined,
                          "create-grant"
                        )
                      );
                    }
                  }}
                  className="flex h-max w-full  flex-row items-center  hover:opacity-75 justify-center gap-3 rounded border border-[#155EEF] bg-[#155EEF] px-3 py-1 text-sm font-semibold text-white   max-sm:w-full"
                >
                  <p>Add a new grant</p>
                  <PlusIcon className="w-5 h-5" />
                </Button>
              </li>
            )}
          </ul>
        </nav>
      </div>
      <div className="w-10/12 pl-5 py-5 border-l border-gray-200">
        {/* Grants tabs start */}
        {currentTab !== "create-grant" && (
          <div>
            <div className="sm:hidden">
              <label htmlFor="tabs" className="sr-only">
                Select a tab
              </label>
              {/* Use an "onChange" listener to redirect the user to the selected tab URL. */}
              <select
                id="tabs"
                name="tabs"
                className="block w-full rounded-md border-gray-300 focus:border-primary-500 focus:ring-primary-500"
                //   defaultValue={tabs.find((tab) => tab.current).name}
              >
                {tabs.map((tab) => (
                  <option key={tab.name}>{tab.name}</option>
                ))}
              </select>
            </div>
            <div className="hidden sm:block">
              <nav
                className="isolate flex divide-x divide-gray-200 rounded-lg shadow"
                aria-label="Tabs"
              >
                {tabs.map((tab, tabIdx) => (
                  <Link
                    key={tab.name}
                    href={tab.href}
                    className={cn(
                      tabFromQueryParam === tab.tabName
                        ? "text-gray-900"
                        : "text-gray-500 hover:text-gray-700",
                      tabIdx === 0 ? "rounded-l-lg" : "",
                      tabIdx === tabs.length - 1 ? "rounded-r-lg" : "",
                      "group relative min-w-0 flex-1 overflow-hidden bg-white py-4 px-4 text-center text-sm font-medium hover:bg-gray-50 focus:z-10"
                    )}
                  >
                    <span>{tab.name}</span>
                    <span
                      aria-hidden="true"
                      className={cn(
                        tabFromQueryParam === tab.tabName
                          ? "bg-primary-500"
                          : "bg-transparent",
                        "absolute inset-x-0 bottom-0 h-0.5"
                      )}
                    />
                  </Link>
                ))}
              </nav>
            </div>
          </div>
        )}
        {/* Grants tabs end */}

        <div className="flex flex-col py-5">
          {currentTab === "overview" && <GrantOverview grant={grant} />}
          {currentTab === "milestones-and-updates" && (
            <GrantMilestonesAndUpdates grant={grant} />
          )}
          {currentTab === "impact-criteria" && (
            <GrantImpactCriteria grant={grant} />
          )}
          {currentTab === "reviews" && <GrantAllReviews grant={grant} />}
          {currentTab === "review-this-grant" && <ReviewGrant grant={grant} />}
          {/*  */}
          {(currentTab === "create-grant" || currentTab === "edit-grant") &&
            project?.uid && (
              <NewGrant grantToEdit={grant} projectUID={project.uid} />
            )}
          {(currentTab === "create-milestone" ||
            currentTab === "edit-milestone") &&
            grant && <NewMilestone grant={grant} />}
          {currentTab === "grant-update" && grant && (
            <NewGrantUpdate grant={grant} />
          )}
        </div>
      </div>
    </div>
  );
}

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
  const isAuthorized = isProjectOwner || isContractOwner;

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
      stat: grant?.details?.season,
      title: "Season",
    },
    {
      stat: grant?.details?.cycle,
      title: "Cycle",
    },
  ];

  return (
    <>
      {/* Grant Overview Start */}
      <div className="flex flex-row gap-2 items-center flex-wrap">
        <div className="text-xl font-semibold">{grant?.details?.title}</div>
        {isAuthorized && project && grant && (
          <Link
            href={PAGES.PROJECT.TABS.SELECTED_TAB(
              project?.uid as string,
              grant?.uid as string,
              "edit-grant"
            )}
          >
            <Button className="flex h-max flex-row gap-2 bg-zinc-800 p-2 text-white hover:bg-zinc-800 hover:text-white">
              Edit grant
              <PencilSquareIcon className="h-4 w-4" />
            </Button>
          </Link>
        )}
      </div>

      <div className="mt-5 flex">
        <div className="w-9/12 p-5 mr-5 bg-white border border-gray-200 rounded-xl shadow-md">
          <div className="text-base uppercase font-semibold">
            GRANT DESCRIPTION
          </div>
          <div className="mt-5 space-y-5">
            <ReactMarkdown>{grant?.details?.description}</ReactMarkdown>
          </div>
        </div>
        <div className="w-3/12">
          <div className="border border-gray-200 rounded-xl bg-white shadow-md">
            <div className="flex items-center justify-between p-5">
              <div className="font-semibold">Grant Overview</div>
              <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
                {getPercentage()}% Complete
              </span>
            </div>
            <div className="flex flex-col gap-4  px-5 pt-5 pb-5 border-t border-gray-200">
              <Link
                href={PAGES.COMMUNITY.ALL_GRANTS(grant?.community.uid as Hex)}
                className="flex items-center justify-between"
              >
                <div className="text-gray-500 text-base">Community</div>
                <span className="inline-flex items-center gap-x-1 rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={grant?.community.details?.imageURL}
                    alt=""
                    className="h-5 w-5 rounded-full"
                  />
                  <span className="text-base font-semibold">
                    {grant?.community.details?.name}
                  </span>
                </span>
              </Link>
              {grant?.details?.proposalURL ? (
                <div className="flex items-center justify-between">
                  <div className="text-gray-500 text-base">Proposal</div>
                  <ExternalLink
                    href={grant?.details?.proposalURL}
                    className="inline-flex items-center gap-x-1 rounded-md  px-2 py-1 text-xs font-medium text-blue-700"
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
                    <h4 className={"text-gray-500 text-base"}>{data.title}</h4>
                    <p className={"text-base font-semibold"}>{data.stat}</p>
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
              className="p-5 bg-white border border-gray-200 rounded-xl text-base font-semibold shadow-md"
              key={item.query + item.explanation}
            >
              <h3>{item.query}</h3>
              <p className="text-normal font-normal">{item.explanation}</p>
            </div>
          ))}
        </div>
      ) : (
        <p>{MESSAGES.GRANT.IMPACT_CRITERIA.EMPTY}</p>
      )}
    </div>
  );
};
