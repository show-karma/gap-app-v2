/* eslint-disable @next/next/no-img-element */
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ProjectPageLayout } from ".";
import { FlagIcon } from "@heroicons/react/24/solid";
import { MESSAGES, PAGES, ReadMore, cn } from "@/utilities";
import { useProjectStore } from "@/store";
import { Grant } from "@show-karma/karma-gap-sdk";
import ReactMarkdown from "react-markdown";
import { ExternalLink } from "@/components/Utilities/ExternalLink";
import { ArrowTopRightOnSquareIcon } from "@heroicons/react/24/outline";
import formatCurrency from "@/utilities/formatCurrency";
import { Hex } from "viem";
import { GrantAllReviews, ReviewGrant } from "@/components/Pages";

function GrantsPage() {
  const searchParams = useSearchParams();
  const grantIdFromQueryParam = searchParams.get("grantId");
  const tabFromQueryParam = searchParams.get("tab");
  const [currentTab, setCurrentTab] = useState("Overview");
  const [grant, setGrant] = useState<Grant | undefined>(undefined);
  const project = useProjectStore((state) => state.project);
  const navigation =
    project?.grants?.map((item) => ({
      uid: item.uid,
      name: item.details?.title || "",
      href: PAGES.PROJECT.GRANT(project.uid, item.uid),
      icon: item.community.details?.imageURL || "",
      current: item.uid === grantIdFromQueryParam || item.uid === grant?.uid,
    })) || [];

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

  const tabs = [
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
      href: PAGES.PROJECT.TABS.MILESTONES(
        project?.uid as string,
        grant?.uid as string
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
                    "group flex items-center gap-x-5 rounded-xl px-4 py-2 text-sm leading-6 font-semibold line-clamp-2"
                  )}
                >
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
                  <div className="w-full line-clamp-2">{item.name}</div>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
      <div className="w-10/12 pl-5 py-5 border-l border-gray-200">
        {/* Grants tabs start */}
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
        {/* Grants tabs end */}

        {currentTab === "overview" && <GrantOverview grant={grant} />}
        {currentTab === "milestones-and-updates" && (
          <GrantMilestonesAndUpdates grant={grant} />
        )}
        {currentTab === "impact-criteria" && (
          <GrantImpactCriteria grant={grant} />
        )}
        {currentTab === "reviews" && <GrantAllReviews grant={grant} />}
        {currentTab === "review-this-grant" && <ReviewGrant grant={grant} />}
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
      <div className="mt-5 text-xl font-semibold">{grant?.details?.title}</div>

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

interface GrantMilestonesAndUpdatesProps {
  grant: Grant | undefined;
}

const GrantMilestonesAndUpdates = ({
  grant,
}: GrantMilestonesAndUpdatesProps) => {
  return (
    <div className="mt-5 space-y-5">
      <div className="p-5 bg-white border border-gray-200 rounded-xl shadow-md">
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-x-1 rounded-full bg-primary-50 px-2 py-1 text-xs font-semibold text-primary-600 uppercase ring-1 ring-inset ring-primary-500/10">
            <FlagIcon className="h-4 w-4 text-primary-500" aria-hidden="true" />
            Update 2
          </span>
          <div className="text-sm text-gray-600">
            Posted on &nbsp;
            <span className="font-semibold">January 25, 2024</span>
          </div>
        </div>

        <div className="mt-3 text-lg font-semibold">Training is Ongoing</div>

        <div className="mt-3">
          <ReadMore>
            Hello Community, My name is Oyeniyi Abiola Peace, I am the CEO of
            Blockchain Innovation Hub. We are one of the grantees of the
            Education, Community Growth and Events (Blockchain Innovation Hub -
            A Three Month Bootcamp for Developers). This report summarizes the
            activities completed so far for the BIH x Arbitrum Blockchain
            Software Development Bootcamp. After successful partnerships, event
            promotions, curriculum drafting and our first report, we have
            concluded the selection process and started classes for the
            Bootcamp. Out of approximately 800 registrations, we initially
            selected 164 participants. We sent them a congratulatory email and
            invited them to the last Twitter Space (BIH X Arbitrum Onboarding
            call) scheduled for December 15th, 2023, at 7 pm. The final 100
            participants were selected from the Twitter Space. Screenshot
            2024-01-25 at 17.20.08|690x404 During the Onboarding call, we
            provided a detailed explanation of the Bootcamp program and sent out
            a form for everyone to fill out. The 100 selected participants were
            then onboarded to the Bootcamp Workspace, where they can access all
            the training materials and curriculum for the entire program. They
            are also required to submit their assignments as URLs using Notion.
            As scheduled, the first class of the Bootcamp commenced on January
            8th, 2024, as indicated in the curriculum. Four classes were
            conducted consecutively during the first week, from Monday, January
            8th to Thursday, January 11th, 2024. In the second week, only two
            classes were conducted on Monday, January 15th, and Thursday,
            January 18th, 2024. Similar to the first week, four classes were
            completed consecutively in the third week, from Monday, January 22nd
            to Thursday, January 25th, 2024. The curriculum schedule and topics
            remained consistent throughout the three-week period.
          </ReadMore>
        </div>
      </div>
      <div className="p-5 bg-white border border-gray-200 rounded-xl text-base font-semibold shadow-md">
        What is the intended direct impact your project will have on the
        ecosystem?
      </div>
      <div className="p-5 bg-white border border-gray-200 rounded-xl text-base font-semibold shadow-md">
        What is the long-term impact of your grant?
      </div>
    </div>
  );
};

interface GrantImpactCriteriaProps {
  grant: Grant | undefined;
}

const GrantImpactCriteria = ({ grant }: GrantImpactCriteriaProps) => {
  const questions = grant?.details?.questions;
  return (
    <div className="mt-5 space-y-5 max-w-prose">
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
