/* eslint-disable @next/next/no-img-element */
"use client";

import { GrantsAccordion } from "@/components/GrantsAccordion";
import { Button } from "@/components/Utilities/Button";
import { useOwnerStore, useProjectStore } from "@/store";
import { useCommunitiesStore } from "@/store/communities";
import { useCommunityAdminStore } from "@/store/communityAdmin";
import { useGrantStore } from "@/store/grant";
import { GrantScreen } from "@/types";

import { PAGES } from "@/utilities/pages";
import { useGrantCommunityAdmin } from "@/hooks/useIsCommunityAdmin";
import { cn } from "@/utilities/tailwind";
import { CheckCircleIcon, PlusIcon } from "@heroicons/react/20/solid";
import { PencilSquareIcon } from "@heroicons/react/24/outline";
import {
  IGrantResponse,
  IProjectResponse,
} from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";
import Link, { useLinkStatus } from "next/link";
import { useParams, usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { GrantCompleteButton } from "../../GrantMilestonesAndUpdates/GrantCompleteButton";
import { GrantContext } from "../../GrantMilestonesAndUpdates/GrantContext";
import { GrantDelete } from "../../GrantMilestonesAndUpdates/GrantDelete";
import { GrantLinkExternalAddressButton } from "../../GrantMilestonesAndUpdates/GrantLinkExternalAddressButton";
import { EmptyGrantsSection } from "../../GrantMilestonesAndUpdates/screens/EmptyGrantsSection";
import { ProjectGrantsLayoutLoading } from "../Loading/Grants/Layout";
import { Spinner } from "@/components/Utilities/Spinner";

interface GrantsLayoutProps {
  children: React.ReactNode;
  fetchedProject?: IProjectResponse;
}

interface Tab {
  name: string;
  tabName: string;
  current: boolean;
}

const authorizedViews: GrantScreen[] = [
  "create-milestone",
  "new",
  "edit",
  "complete-grant",
];

const allViews: GrantScreen[] = [
  "milestones-and-updates",
  "create-milestone",
  "new",
  "edit",
  "impact-criteria",
  "outputs",
  "overview",
  "complete-grant",
];

const getScreen = (pathname: string): GrantScreen | undefined => {
  const screen: GrantScreen = pathname.split("/")[5] as GrantScreen;
  if (screen && allViews.includes(screen)) {
    return screen;
  }
  if (
    pathname.split("/")[4] &&
    allViews.includes(pathname.split("/")[4] as GrantScreen)
  ) {
    return pathname.split("/")[4] as GrantScreen;
  }
  return "overview";
};

const NavigationRow = ({
  project,
  item,
}: {
  project: IProjectResponse;
  item: {
    uid: `0x${string}`;
    name: string;
    href: string;
    icon: string;
    current: boolean;
    completed: boolean;
  };
}) => {
  const { pending } = useLinkStatus();
  return (
    <Link
      id="project-grant"
      href={PAGES.PROJECT.GRANT(
        project.details?.data.slug || project?.uid || "",
        item.uid
      )}
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
          {pending ? (
            <Spinner className="w-5 h-5 min-w-5 max-w-5 min-h-5 max-h-5" />
          ) : (
            item?.completed && (
              <CheckCircleIcon className="w-5 h-5 text-green-600" />
            )
          )}
        </div>
      </div>
    </Link>
  );
};

const MobileNavigationRow = ({
  project,
  item,
}: {
  project: IProjectResponse;
  item: {
    uid: `0x${string}`;
    name: string;
    href: string;
    icon: string;
    current: boolean;
    completed: boolean;
  };
}) => {
  const { pending } = useLinkStatus();
  return (
    <Link
      href={PAGES.PROJECT.GRANT(
        project.details?.data.slug || project?.uid || "",
        item.uid
      )}
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
          {pending ? (
            <Spinner className="w-5 h-5 min-w-5 max-w-5 min-h-5 max-h-5" />
          ) : (
            item?.completed && (
              <CheckCircleIcon className="w-5 h-5 text-green-600" />
            )
          )}
        </div>
      </div>
    </Link>
  );
};

export const GrantsLayout = ({
  children,
  fetchedProject,
}: GrantsLayoutProps) => {
  const pathname = usePathname();
  const screen = getScreen(pathname);
  const grantIdFromQueryParam = useParams().grantUid as string;
  const [currentTab, setCurrentTab] = useState("overview");
  const { grant, setGrant, loading, setLoading } = useGrantStore();
  const { project: storedProject } = useProjectStore();
  const router = useRouter();
  const isProjectAdmin = useProjectStore((state) => state.isProjectAdmin);
  const isContractOwner = useOwnerStore((state) => state.isOwner);
  const isCommunityAdmin = useCommunityAdminStore(
    (state) => state.isCommunityAdmin
  );
  const { communities } = useCommunitiesStore();
  const isCommunityAdminOfSome = communities.length !== 0;
  const isAuthorized = isProjectAdmin || isContractOwner || isCommunityAdmin;
  const { address } = useAccount();
  const setIsCommunityAdmin = useCommunityAdminStore(
    (state) => state.setIsCommunityAdmin
  );
  const { pending } = useLinkStatus();

  // Use React Query hook to check admin status with Zustand sync
  useGrantCommunityAdmin(
    grant?.community?.uid || grant?.data?.communityUID,
    address,
    {
      setIsCommunityAdmin,
    }
  );

  const zustandProject = useProjectStore((state) => state.project);

  const project = storedProject || fetchedProject || zustandProject;

  useEffect(() => {
    if (!project || !screen) return;

    if (!isAuthorized && authorizedViews.includes(screen)) {
      router.replace(
        PAGES.PROJECT.GRANTS(project.details?.data.slug || project.uid || "")
      );
      setCurrentTab("overview");
      return;
    }

    if (currentTab !== screen) {
      setCurrentTab(screen);
    }
  }, [screen, isAuthorized, project, currentTab, router]);

  useEffect(() => {
    if (project) {
      setLoading(true);
      if (grantIdFromQueryParam) {
        const grantFound = project?.grants?.find(
          (grant) =>
            grant.uid?.toLowerCase() === grantIdFromQueryParam?.toLowerCase()
        );
        if (grantFound) {
          setGrant(grantFound);
          setLoading(false);
          return;
        }
      }
      setGrant(project?.grants?.[0]);
      setLoading(false);
    }
  }, [project, grantIdFromQueryParam, setGrant, setLoading]);

  // If no project data is available, show loading
  if (!project) {
    return <ProjectGrantsLayoutLoading>{children}</ProjectGrantsLayoutLoading>;
  }

  const navigation =
    project?.grants?.map((item) => {
      const hasMilestonesCompleted =
        item?.milestones?.length > 0
          ? item?.milestones?.filter((milestone) => !!milestone.completed)
              .length > 0
          : false;
      return {
        uid: item.uid,
        name: item.details?.data?.title || "",
        href: PAGES.PROJECT.GRANT(
          project.details?.data?.slug || project.uid,
          item.uid
        ),
        icon: item.community?.details?.data?.imageURL || "",
        current: item.uid === grantIdFromQueryParam || item.uid === grant?.uid,
        completed: !!item.completed || hasMilestonesCompleted,
      };
    }) || [];

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
      name: "Outputs",
      tabName: "outputs",
      current: false,
    },
    {
      name: "Impact Criteria",
      tabName: "impact-criteria",
      current: false,
    },
  ];

  // const [tabs, setTabs] = useState<Tab[]>(defaultTabs);
  const tabs: Tab[] = defaultTabs;

  if (loading || (!grant && project.grants?.length > 0)) {
    return <ProjectGrantsLayoutLoading>{children}</ProjectGrantsLayoutLoading>;
  }

  return (
    <>
      <div className="flex max-lg:flex-col">
        {project?.grants.length ? (
          <div className="w-full max-w-[320px] max-lg:max-w-full py-5 border-none max-lg:w-full max-lg:px-0">
            <div className=" lg:hidden">
              <GrantsAccordion>
                {navigation.map((item) => (
                  <div key={item.uid}>
                    <MobileNavigationRow project={project} item={item} />
                  </div>
                ))}
                {(isAuthorized || isCommunityAdminOfSome) && (
                  <div className="mt-4">
                    <Link
                      href={PAGES.PROJECT.SCREENS.NEW_GRANT(
                        project?.details?.data.slug || project?.uid || ""
                      )}
                      className="flex h-max w-full  flex-row items-center  hover:opacity-75 justify-center gap-3 rounded border border-[#155EEF] bg-[#155EEF] px-3 py-2 text-sm font-semibold text-white   max-sm:w-full"
                    >
                      <p>Add</p>
                      <PlusIcon className="w-5 h-5" />
                    </Link>
                  </div>
                )}
              </GrantsAccordion>
            </div>
            <nav
              className="flex flex-1 flex-col gap-4 max-lg:hidden"
              aria-label="Sidebar"
            >
              <div className="flex flex-row gap-4 justify-between  min-w-[240px]">
                <div className="flex w-full flex-row items-center gap-2">
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
                    FUNDING
                  </p>
                </div>
                {(isAuthorized || isCommunityAdminOfSome) && (
                  <Button
                    onClick={() => {
                      if (project) {
                        router.push(
                          PAGES.PROJECT.SCREENS.NEW_GRANT(
                            project.details?.data.slug || project.uid
                          )
                        );
                        router.refresh();
                      }
                    }}
                    className="flex h-max w-max  flex-row items-center  hover:opacity-75 justify-center gap-3 rounded border border-[#155EEF] bg-[#155EEF] px-3 py-2 text-sm font-semibold text-white   max-sm:w-full"
                  >
                    <p>Add</p>
                    <PlusIcon className="w-5 h-5" />
                  </Button>
                )}
              </div>
              <ul role="list" className="space-y-2 mt-4">
                {navigation.map((item) => (
                  <li key={item.uid}>
                    <NavigationRow project={project} item={item} />
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        ) : null}
        <div className="flex-1 pl-5 pt-5 pb-20 max-lg:px-0 max-lg:pt-0">
          {/* Grants tabs start */}
          {project?.grants.length && currentTab !== "new" ? (
            <>
              <div className="flex flex-row gap-4 justify-between max-md:flex-col border-b border-b-zinc-900 dark:border-b-zinc-200 pb-2 mb-4">
                <div className="flex flex-row gap-2 items-center">
                  <div className="text-xl font-semibold text-black dark:text-zinc-100">
                    {grant?.details?.data.title}
                  </div>
                  {isAuthorized && grant && project ? (
                    <Link
                      href={PAGES.PROJECT.SCREENS.SELECTED_SCREEN(
                        project.details?.data.slug || project?.uid || "",
                        grant?.uid as string,
                        "edit"
                      )}
                      className="rounded-md items-center text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600 disabled:opacity-35 hover:opacity-75 transition-all ease-in-out duration-300 flex h-max w-max flex-row gap-2 text-zinc-800 p-2 dark:text-zinc-100"
                    >
                      <PencilSquareIcon className="h-5 w-5" />
                    </Link>
                  ) : null}
                </div>
                {isAuthorized && grant ? (
                  <div className="flex flex-row gap-2 items-center">
                    {project ? (
                      <GrantLinkExternalAddressButton grant={grant as any} />
                    ) : null}
                    {project ? (
                      <GrantCompleteButton project={project} grant={grant} />
                    ) : null}

                    <GrantDelete grant={grant} />
                  </div>
                ) : null}
              </div>
              <div className="sm:block">
                <nav
                  className="isolate flex flex-row max-lg:w-full flex-wrap gap-4 divide-x divide-gray-200 rounded-lg py-1 px-1  bg-[#F2F4F7] dark:bg-zinc-900 w-max transition-all duration-300 ease-in-out"
                  aria-label="Tabs"
                >
                  {tabs
                    .filter((tab) => tab.name !== "Outputs")
                    .map((tab) => (
                      <Link
                        key={tab.name}
                        href={PAGES.PROJECT.SCREENS.SELECTED_SCREEN(
                          project.details?.data.slug || project?.uid || "",
                          grant?.uid as string,
                          tab.tabName === "overview" ? "" : tab.tabName
                        )}
                        id={`tab-${tab.tabName}`}
                        className={cn(
                          screen === tab.tabName ||
                            (tab.tabName === "overview" && !screen)
                            ? "text-gray-900 bg-white dark:bg-zinc-700 dark:text-zinc-100"
                            : "text-gray-500 hover:text-gray-700 dark:text-zinc-400",
                          "group relative min-w-0 w-max border-none overflow-hidden rounded-lg py-2 px-3 text-center text-sm font-semibold hover:bg-gray-50 dark:hover:bg-zinc-800 dark:hover:text-white focus:z-10 transition-all duration-300 ease-in-out"
                        )}
                      >
                        <span>{tab.name}</span>
                      </Link>
                    ))}
                </nav>
              </div>
            </>
          ) : null}
          {/* Grants tabs end */}
          {project?.grants.length || currentTab === "new" ? (
            <div className="flex flex-col py-5">
              <GrantContext.Provider value={grant}>
                {children}
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
