/* eslint-disable @next/next/no-img-element */
"use client";

import { useOwnerStore, useProjectStore } from "@/store";
import { EmptyGrantsSection } from "../../GrantMilestonesAndUpdates/screens";
import { GrantContext } from "../../GrantMilestonesAndUpdates/GrantContext";
import { cn } from "@/utilities/tailwind";
import { GrantCompleteButton } from "../../GrantMilestonesAndUpdates/GrantCompleteButton";
import { GrantDelete } from "../../GrantMilestonesAndUpdates/GrantDelete";
import dynamic from "next/dynamic";
import { PAGES } from "@/utilities/pages";
import { useAccount } from "wagmi";
import { useEffect, useState } from "react";
import { GrantScreen } from "@/types";
import { useParams, usePathname, useRouter } from "next/navigation";
import { useCommunityAdminStore } from "@/store/community";
import { useCommunitiesStore } from "@/store/communities";
import {
  getQuestionsOf,
  getReviewsOf,
  isCommunityAdminOf,
} from "@/utilities/sdk";
import { useSigner } from "@/utilities/eas-wagmi-utils";
import { useGap } from "@/hooks";
import { useAuthStore } from "@/store/auth";
import { gapIndexerApi } from "@/utilities/gapIndexerApi";
import { errorManager } from "@/components/Utilities/errorManager";
import { GrantsAccordion } from "@/components/GrantsAccordion";
import { CheckCircleIcon, PlusIcon } from "@heroicons/react/20/solid";
import { Button } from "@/components/Utilities/Button";
import { PencilSquareIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import { useGrantStore } from "@/store/grant";

const GenerateImpactReportDialog = dynamic(
  () =>
    import("@/components/Dialogs/GenerateImpactReportDialog").then(
      (mod) => mod.GenerateImpactReportDialog
    ),
  { ssr: false }
);

interface GrantsLayoutProps {
  children: React.ReactNode;
}

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

const allViews: GrantScreen[] = [
  "milestones-and-updates",
  "create-milestone",
  "create-grant",
  "edit-grant",
  "grant-update",
  "impact-criteria",
  "overview",
  "complete-grant",
  "grant-update",
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

export const GrantsLayout = ({ children }: GrantsLayoutProps) => {
  const pathname = usePathname();
  const screen = getScreen(pathname);
  const grantIdFromQueryParam = useParams().grantUid as string;
  const [currentTab, setCurrentTab] = useState("overview");
  const [grant, setGrant] = useGrantStore((state) => [
    state.grant,
    state.setGrant,
  ]);
  const project = useProjectStore((state) => state.project);
  const navigation =
    project?.grants?.map((item) => ({
      uid: item.uid,
      name: item.details?.data?.title || "",
      href: PAGES.PROJECT.GRANT(
        project.details?.data?.slug || project.uid,
        item.uid
      ),
      icon: item.community?.details?.data?.imageURL || "",
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

  const { address } = useAccount();

  //   UseEffect to check if current URL changes
  useEffect(() => {
    if (screen) {
      if (
        !isAuthorized &&
        currentTab &&
        authorizedViews.includes(currentTab as GrantScreen)
      ) {
        router.push(
          PAGES.PROJECT.GRANTS(
            project?.details?.data.slug || project?.uid || ""
          )
        );
        setCurrentTab("overview");
      } else {
        setCurrentTab(screen);
      }
    }
  }, [screen, isAuthorized, address]);

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
      const community = await gapIndexerApi
        .communityBySlug(grant.data.communityUID)
        .then((res) => res.data);
      const result = await isCommunityAdminOf(
        community,
        address as string,
        signer
      );
      setIsCommunityAdmin(result);
    } catch (error: any) {
      errorManager(`Error checking if ${address} is a community admin`, error);
      console.log(error);
      setIsCommunityAdmin(false);
    } finally {
      setIsCommunityAdminLoading(false);
    }
  };

  useEffect(() => {
    checkIfAdmin();
  }, [address, grant?.uid, signer, isAuth]);

  if (screen === "create-grant") {
    return (
      <div className="flex-1 pl-5 pt-5 pb-20 max-lg:px-0 max-lg:pt-0">
        {children}
      </div>
    );
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
                          {item?.completed && (
                            <CheckCircleIcon className="w-5 h-5 text-green-600" />
                          )}
                        </div>
                      </div>
                    </Link>
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
                      <p>Add a new grant</p>
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
                    <Link
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
                          {item?.completed && (
                            <CheckCircleIcon className="w-5 h-5 text-green-600" />
                          )}
                        </div>
                      </div>
                    </Link>
                  </li>
                ))}
                {(isAuthorized || isCommunityAdminOfSome) && (
                  <li>
                    <Button
                      onClick={() => {
                        if (project) {
                          router.push(
                            PAGES.PROJECT.SCREENS.NEW_GRANT(
                              project.details?.data.slug || project.uid
                            )
                          );
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
                  {grant?.details?.data.title}
                </div>
              </div>
              {isAuthorized && grant ? (
                <div className="flex flex-row gap-2">
                  {project ? (
                    <GrantCompleteButton project={project} grant={grant} />
                  ) : null}
                  {project ? (
                    <Link
                      href={PAGES.PROJECT.SCREENS.SELECTED_SCREEN(
                        project.details?.data.slug || project?.uid || "",
                        grant?.uid as string,
                        "edit-grant"
                      )}
                      className="rounded-md items-center text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600 disabled:opacity-35 hover:opacity-75 transition-all ease-in-out duration-300 flex h-max w-max flex-row gap-2 bg-zinc-800 p-2 text-white hover:bg-zinc-800 hover:text-white"
                    >
                      Edit grant
                      <PencilSquareIcon className="h-4 w-4" />
                    </Link>
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
                  <Link
                    key={tab.name}
                    href={PAGES.PROJECT.SCREENS.SELECTED_SCREEN(
                      project.details?.data.slug || project?.uid || "",
                      grant?.uid as string,
                      tab.tabName === "overview" ? "" : tab.tabName
                    )}
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
          ) : null}
          {/* Grants tabs end */}
          {project?.grants.length || currentTab === "create-grant" ? (
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
