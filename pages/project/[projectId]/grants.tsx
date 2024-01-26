import React from "react";
import { ProjectPageLayout } from ".";
import BlockiesSvg from "blockies-react-svg";
import { shortAddress } from "@/utilities";
import {
  CalendarIcon,
  ChartPieIcon,
  DocumentDuplicateIcon,
  FolderIcon,
  HomeIcon,
  UsersIcon,
} from "@heroicons/react/24/outline";

const navigation = [
  {
    name: "Arbitrum Good Citizen retrofunding round 1",
    href: "#",
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
  { name: "Overview", href: "#", current: true },
  { name: "Milestones & Updates", href: "#", current: false },
  { name: "Impact Criteria", href: "#", current: false },
];

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(" ");
}

function GrantsPage() {
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
                      ? "bg-gray-50 text-indigo-600 border border-gray-200"
                      : "text-gray-700 hover:text-indigo-600 hover:bg-gray-50",
                    "group flex items-center gap-x-5 rounded-md px-4 py-2 text-sm leading-6 font-semibold"
                  )}
                >
                  <item.icon
                    className={classNames(
                      item.current
                        ? "text-indigo-600"
                        : "text-gray-400 group-hover:text-indigo-600",
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
              className="block w-full rounded-md border-gray-300 focus:border-indigo-500 focus:ring-indigo-500"
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
                <a
                  key={tab.name}
                  href={tab.href}
                  className={classNames(
                    tab.current
                      ? "text-gray-900"
                      : "text-gray-500 hover:text-gray-700",
                    tabIdx === 0 ? "rounded-l-lg" : "",
                    tabIdx === tabs.length - 1 ? "rounded-r-lg" : "",
                    "group relative min-w-0 flex-1 overflow-hidden bg-white py-4 px-4 text-center text-sm font-medium hover:bg-gray-50 focus:z-10"
                  )}
                  aria-current={tab.current ? "page" : undefined}
                >
                  <span>{tab.name}</span>
                  <span
                    aria-hidden="true"
                    className={classNames(
                      tab.current ? "bg-indigo-500" : "bg-transparent",
                      "absolute inset-x-0 bottom-0 h-0.5"
                    )}
                  />
                </a>
              ))}
            </nav>
          </div>
        </div>
        {/* Grants tabs end */}

        {/* Grant Overview Start */}
        <div className="mt-5 text-xl font-semibold">
          Blockchain Innovation Hub - A Three Month Bootcamp for Developers
        </div>

        <div className="mt-5 flex">
          <div className="w-9/12 p-5 mr-5 bg-white border border-gray-200 rounded-xl">
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
                Front-end developers will learn how to integrate the Arbitrum
                SDK into their applications and develop amazing web3 UI/UX.
                Back-end developers, on the other hand, will focus on building
                scalable backends using Node.js and integrating Arbitrum.
              </p>
              <p>
                Participants in both tracks will learn Solidity and Ether.js.
              </p>
              <p>
                Furthermore, a minimum of 8 hours per week is set aside for
                learning to maximize impact. Physical sessions will be
                live-streamed and recorded, allowing participants to contribute
                in real-time and ensuring an all-round engagement. These
                recorded classes can also serve as resources for anyone
                interested in building on the Arbitrum chain in the future.
              </p>
            </div>
          </div>
          <div className="w-3/12">
            <div className="border border-gray-200 rounded-xl bg-white">
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
      </div>
    </div>
  );
}

GrantsPage.getLayout = ProjectPageLayout;

export default GrantsPage;
