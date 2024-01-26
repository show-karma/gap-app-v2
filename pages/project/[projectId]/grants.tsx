import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ProjectPageLayout } from ".";
import { HomeIcon, UsersIcon } from "@heroicons/react/24/outline";
import { FlagIcon } from "@heroicons/react/24/solid";
import { ReadMore } from "@/utilities";

const navigation = [
  {
    name: "Arbitrum Good Citizen retrofunding round 1",
    href: "/project/pin-save-decentralized-pinterest/grants?grantId=0xb7ff3368a18ea43386a15080173beb6a32b2fcf1ae0df9acf1b3e173a808ae8f&tab=overview",
    icon: HomeIcon,
    current: true,
  },
  {
    name: "Blockchain Innovation Hub - A Three Month Bootcamp for Developers",
    href: "#",
    icon: UsersIcon,
    current: false,
  },
];

const tabs = [
  {
    name: "Overview",
    href: "/project/pin-save-decentralized-pinterest/grants?grantId=0xb7ff3368a18ea43386a15080173beb6a32b2fcf1ae0df9acf1b3e173a808ae8f&tab=overview",
    tabName: "overview",
    current: true,
  },
  {
    name: "Milestones & Updates",
    href: "/project/pin-save-decentralized-pinterest/grants?grantId=0xb7ff3368a18ea43386a15080173beb6a32b2fcf1ae0df9acf1b3e173a808ae8f&tab=milestones-and-updates",
    tabName: "milestones-and-updates",
    current: false,
  },
  {
    name: "Impact Criteria",
    href: "/project/pin-save-decentralized-pinterest/grants?grantId=0xb7ff3368a18ea43386a15080173beb6a32b2fcf1ae0df9acf1b3e173a808ae8f&tab=impact-criteria",
    tabName: "impact-criteria",
    current: false,
  },
];

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(" ");
}

function GrantsPage() {
  const searchParams = useSearchParams();
  const tabFromQueryParam = searchParams.get("tab");
  const [currentTab, setCurrentTab] = useState("Overview");

  // UseEffect to check if current URL changes
  useEffect(() => {
    console.log("tabFromQueryParam", tabFromQueryParam);
    if (tabFromQueryParam) {
      setCurrentTab(tabFromQueryParam);
    }
  }, [tabFromQueryParam]);

  return (
    <div className="flex">
      <div className="w-2/12 pr-5 py-5">
        <nav className="flex flex-1 flex-col" aria-label="Sidebar">
          <ul role="list" className="-mx-2 space-y-1">
            {navigation.map((item) => (
              <li key={item.name}>
                <a
                  href={item.href}
                  className={classNames(
                    item.current
                      ? "bg-white text-primary-600 border border-gray-200"
                      : "text-gray-700 hover:text-primary-600 hover:bg-gray-50",
                    "group flex items-center gap-x-5 rounded-xl px-4 py-2 text-sm leading-6 font-semibold"
                  )}
                >
                  <item.icon
                    className={classNames(
                      item.current
                        ? "text-primary-600"
                        : "text-gray-400 group-hover:text-primary-600",
                      "h-6 w-6 shrink-0"
                    )}
                    aria-hidden="true"
                  />
                  <div className="w-8/12">{item.name}</div>
                </a>
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
                  className={classNames(
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
                    className={classNames(
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

        {currentTab === "overview" && <GrantOverview />}
        {currentTab === "milestones-and-updates" && (
          <GrantMilestonesAndUpdates />
        )}
        {currentTab === "impact-criteria" && <GrantImpactCriteria />}
      </div>
    </div>
  );
}

GrantsPage.getLayout = ProjectPageLayout;

export default GrantsPage;

function GrantOverview() {
  return (
    <>
      {/* Grant Overview Start */}
      <div className="mt-5 text-xl font-semibold">
        Blockchain Innovation Hub - A Three Month Bootcamp for Developers
      </div>

      <div className="mt-5 flex">
        <div className="w-9/12 p-5 mr-5 bg-white border border-gray-200 rounded-xl shadow-md">
          <div className="text-base uppercase font-semibold">
            GRANT DESCRIPTION
          </div>
          <div className="mt-5 space-y-5">
            <p>
              We propose a three-month hybrid blockchain development bootcamp,
              featuring a hackathon, to onboard quality developers into the
              Arbitrum ecosystem. The program is divided into two tracks -
              front-end and back-end development.
            </p>
            <p>
              Front-end developers will learn how to integrate the Arbitrum SDK
              into their applications and develop amazing web3 UI/UX. Back-end
              developers, on the other hand, will focus on building scalable
              backends using Node.js and integrating Arbitrum.
            </p>
            <p>Participants in both tracks will learn Solidity and Ether.js.</p>
            <p>
              Furthermore, a minimum of 8 hours per week is set aside for
              learning to maximize impact. Physical sessions will be
              live-streamed and recorded, allowing participants to contribute in
              real-time and ensuring an all-round engagement. These recorded
              classes can also serve as resources for anyone interested in
              building on the Arbitrum chain in the future.
            </p>
          </div>
        </div>
        <div className="w-3/12">
          <div className="border border-gray-200 rounded-xl bg-white shadow-md">
            <div className="flex items-center justify-between p-5">
              <div className="font-semibold">Grant Overview</div>
              <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
                50% Complete
              </span>
            </div>
            <div className="flex items-center justify-between p-5 border-t border-gray-200">
              <div className="text-gray-500 text-base">Community</div>
              <span className="inline-flex items-center gap-x-1 rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="https://pbs.twimg.com/profile_images/1653532864309239810/ZjT_zBAS_400x400.png"
                  alt=""
                  className="h-5 w-5 rounded-full"
                />
                <span className="text-base font-semibold">Arbitrum</span>
              </span>
            </div>
          </div>
        </div>
      </div>
      {/* Grant Overview End */}
    </>
  );
}

function GrantMilestonesAndUpdates() {
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
}

function GrantImpactCriteria() {
  return (
    <div className="mt-5 space-y-5 max-w-prose">
      <div className="p-5 bg-white border border-gray-200 rounded-xl text-base font-semibold shadow-md">
        How should the success of your grant be measured?
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
}
