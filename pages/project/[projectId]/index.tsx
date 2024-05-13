/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { useRouter } from "next/router";
import { ReactNode, useEffect, useMemo, useState } from "react";
import ProjectPage from "./project";
import { useOwnerStore, useProjectStore } from "@/store";
import { useAccount } from "wagmi";
import { IProjectDetails, Project } from "@show-karma/karma-gap-sdk";
import { NextSeo } from "next-seo";

import { Hex } from "viem";
import { GetServerSidePropsContext, InferGetServerSidePropsType } from "next";
import formatCurrency from "@/utilities/formatCurrency";
import {
  DiscordIcon,
  GithubIcon,
  LinkedInIcon,
  TwitterIcon,
  WebsiteIcon,
} from "@/components/Icons";
import { ExclamationTriangleIcon } from "@heroicons/react/24/solid";
import fetchData from "@/utilities/fetchData";
import { PAGES } from "@/utilities/pages";
import { getMetadata, getProjectById, getProjectOwner } from "@/utilities/sdk";
import { zeroUID } from "@/utilities/commons";
import { INDEXER } from "@/utilities/indexer";
import { useSigner, walletClientToSigner } from "@/utilities/eas-wagmi-utils";
import { cn } from "@/utilities/tailwind";
import { defaultMetadata } from "@/utilities/meta";
import { useAuthStore } from "@/store/auth";
import { Feed } from "@/types";
import { getWalletClient } from "@wagmi/core";
import { EndorsementDialog } from "@/components/Pages/Project/Impact/EndorsementDialog";
import { Button } from "@/components/Utilities/Button";
import { useConnectModal } from "@rainbow-me/rainbowkit";

type ProjectDetailsWithUid = IProjectDetails & { uid: Hex };

interface Props {
  children: ReactNode;
}

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(" ");
}

const firstFiveMembers = (project: Project) =>
  project.members.slice(0, 5).map((item) => item.recipient);
const restMembersCounter = (project: Project) =>
  project.members?.length ? project.members.length - 5 : 0;

export const NestedLayout = ({ children }: Props) => {
  const router = useRouter();
  const projectId = router.query.projectId as string;
  const project = useProjectStore((state) => state.project);
  const loading = useProjectStore((state) => state.loading);
  const setProject = useProjectStore((state) => state.setProject);
  const setLoading = useProjectStore((state) => state.setLoading);
  const setIsProjectOwner = useProjectStore((state) => state.setIsProjectOwner);
  const setIsProjectOwnerLoading = useProjectStore(
    (state) => state.setIsProjectOwnerLoading
  );

  const publicTabs = [
    {
      name: "Project",
      href: PAGES.PROJECT.OVERVIEW(project?.details?.slug || projectId),
    },
    {
      name: "Grants",
      href: PAGES.PROJECT.GRANTS(project?.details?.slug || projectId),
    },
    // {
    //   name: "Team",
    //   href: PAGES.PROJECT.TEAM(project?.details?.slug || projectId),
    // },
    {
      name: "Impact",
      href: PAGES.PROJECT.IMPACT.ROOT(project?.details?.slug || projectId),
    },
  ];
  const [tabs, setTabs] = useState<typeof publicTabs>(publicTabs);
  const isOwner = useOwnerStore((state) => state.isOwner);
  const isProjectOwner = useProjectStore((state) => state.isProjectOwner);

  const isAuthorized = isOwner || isProjectOwner;
  const setProjectContactsInfo = useProjectStore(
    (state) => state.setProjectContactsInfo
  );
  const projectContactsInfo = useProjectStore(
    (state) => state.projectContactsInfo
  );
  const setContactInfoLoading = useProjectStore(
    (state) => state.setContactInfoLoading
  );

  useEffect(() => {
    const mountTabs = () => {
      if (isAuthorized) {
        setTabs([
          ...publicTabs,
          {
            name: "Contact Info",
            href: PAGES.PROJECT.CONTACT_INFO(
              project?.details?.slug || projectId
            ),
          },
        ]);
      } else {
        setTabs(publicTabs);
      }
    };
    mountTabs();
  }, [isAuthorized, project]);

  useEffect(() => {
    if (projectId) {
      const fetchProject = async () => {
        try {
          setLoading(true);
          const fetchedProject = await getProjectById(projectId);

          if (!fetchedProject || fetchedProject.uid === zeroUID) {
            router.push(PAGES.NOT_FOUND);
          }
          setProject(fetchedProject);
        } catch (error: any) {
          console.log(error);
          setProject(undefined);
        } finally {
          setLoading(false);
        }
      };

      fetchProject();
    } else {
      setProject(undefined);
    }
  }, [projectId]);

  useEffect(() => {
    if (!projectId) return;
    const getContactInfo = async () => {
      setContactInfoLoading(true);
      try {
        const [data] = await fetchData(
          INDEXER.SUBSCRIPTION.GET(projectId),
          "GET",
          {},
          {},
          {},
          true
        );

        setProjectContactsInfo(data);
      } catch (error) {
        console.error(error);
        setProjectContactsInfo(undefined);
      } finally {
        setContactInfoLoading(false);
      }
    };
    getContactInfo();
  }, [projectId]);

  const hasContactInfo = Boolean(projectContactsInfo?.length);

  const signer = useSigner();
  const { address, isConnected, isConnecting } = useAccount();
  const { isAuth } = useAuthStore();

  useEffect(() => {
    if (!project || !project?.chainID || !isAuth || !isConnected) {
      setIsProjectOwner(false);
      setIsProjectOwnerLoading(false);
      return;
    }

    const setupOwner = async () => {
      try {
        setIsProjectOwnerLoading(true);
        const walletClient = await getWalletClient({
          chainId: project.chainID,
        });
        if (!walletClient) return;
        const walletSigner = await walletClientToSigner(walletClient).catch(
          () => undefined
        );

        await getProjectOwner(walletSigner || signer, project)
          .then((res) => {
            setIsProjectOwner(res);
          })
          .finally(() => setIsProjectOwnerLoading(false));
      } catch {
        setIsProjectOwner(false);
      } finally {
        setIsProjectOwnerLoading(false);
      }
    };
    setupOwner();
  }, [project?.uid, address, isAuth, isConnected, signer]);

  const socials = useMemo(() => {
    const types = [
      { name: "Twitter", prefix: "twitter.com/", icon: TwitterIcon },
      { name: "Github", prefix: "github.com/", icon: GithubIcon },
      { name: "Discord", prefix: "discord.gg/", icon: DiscordIcon },
      { name: "Website", prefix: "https://", icon: WebsiteIcon },
      { name: "LinkedIn", prefix: "linkedin.com/", icon: LinkedInIcon },
    ];

    const isLink = (link?: string) => {
      if (!link) return false;
      if (
        link.includes("http://") ||
        link.includes("https://") ||
        link.includes("www.")
      ) {
        return true;
      }
      return false;
    };

    const addPrefix = (link: string) => `https://${link}`;

    const formatPrefix = (prefix: string, link: string) => {
      const firstWWW = link.slice(0, 4) === "www.";
      if (firstWWW) {
        return addPrefix(link);
      }
      const alreadyHasPrefix = link.includes(prefix);
      if (alreadyHasPrefix) {
        if (isLink(link)) {
          return link;
        }
        return addPrefix(link);
      }

      return isLink(prefix + link) ? prefix + link : addPrefix(prefix + link);
    };

    return types
      .map(({ name, prefix, icon }) => {
        const hasUrl = project?.details?.links?.find(
          (link) => link.type === name.toLowerCase()
        )?.url;

        if (hasUrl) {
          if (name === "Twitter") {
            const hasAt = hasUrl?.includes("@");
            const url = hasAt ? hasUrl?.replace("@", "") || "" : hasUrl;
            return {
              name,
              url: isLink(hasUrl)
                ? hasUrl
                : hasUrl.includes(prefix)
                ? addPrefix(url)
                : prefix + url,
              icon,
            };
          }

          return {
            name,
            url: formatPrefix(prefix, hasUrl),
            icon,
          };
        }

        return undefined;
      })
      .filter((social) => social);
  }, [project]);

  const hasAlreadyEndorsed = project?.endorsements?.find(
    (item) => item.recipient?.toLowerCase() === address?.toLowerCase()
  );
  const { openConnectModal } = useConnectModal();

  const handleEndorse = () => {
    if (!isConnected || !isAuth) {
      return (
        <Button
          className="hover:bg-white dark:hover:bg-black border border-black bg-white text-black dark:bg-black dark:text-white px-4 rounded-md py-2 w-max"
          onClick={() => {
            if (!isConnecting) {
              openConnectModal?.();
            }
          }}
        >
          Endorse this project
        </Button>
      );
    }
    if (!hasAlreadyEndorsed) {
      return (
        <EndorsementDialog
          buttonElement={{
            text: "Endorse this project",
            styleClass:
              "hover:bg-white dark:hover:bg-black border border-black bg-white text-black dark:bg-black dark:text-white px-4 rounded-md py-2 w-max",
          }}
        />
      );
    }
    return null;
  };

  return (
    <div>
      <div className="relative border-b border-gray-200 ">
        <div className="px-4 sm:px-6 lg:px-12 md:flex py-5 md:items-start md:justify-between flex flex-row max-lg:flex-col gap-4">
          <h1
            className={cn(
              loading
                ? "animate-pulse w-64 h-10 bg-gray-600 rounded-lg"
                : "text-[32px] font-bold leading-tight text-black dark:text-zinc-100"
            )}
          >
            {loading ? "" : project?.details?.title}
          </h1>
          <div className="flex flex-row gap-10 max-lg:gap-4 flex-wrap max-lg:flex-col items-center max-lg:items-start">
            {/* {project ? (
              <div className="flex flex-row items-center gap-3">
                {firstFiveMembers(project).length ? (
                  <div className="flex flex-row gap-2 items-center">
                    <span className="text-base font-body font-normal leading-tight text-black mr-6 dark:text-zinc-200">
                      Built by
                    </span>
                    <div className="flex flex-row gap-0 items-center">
                      {firstFiveMembers(project).map((member, index) => (
                        <div key={index} className="h-4 w-4 -mr-1.5">
                          <img
                            src={blo(member, 8)}
                            alt={member}
                            className="h-4 w-4 m-0 rounded-full border-1 border-gray-100 dark:border-zinc-900"
                            style={{ zIndex: 5 - index }}
                          />
                        </div>
                      ))}
                      {restMembersCounter(project) > 0 && (
                        <p className="flex items-center justify-center h-5 w-5 rounded-full dark:ring-black border border-1 border-gray-100 dark:border-zinc-900 ">
                          +
                        </p>
                      )}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null} */}
            {socials.length > 0 && (
              <div className="flex flex-row gap-3 items-center">
                <p className="text-base font-normal leading-tight text-black dark:text-zinc-200 max-lg:hidden">
                  Socials
                </p>
                <div className="flex flex-row gap-4 items-center">
                  {socials
                    .filter((social) => social?.url)
                    .map((social, index) => (
                      <a
                        key={social?.url || index}
                        href={social?.url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {social?.icon && (
                          <social.icon className="h-5 w-5 fill-black text-black dark:text-white dark:fill-zinc-200" />
                        )}
                      </a>
                    ))}
                </div>
              </div>
            )}
            {handleEndorse()}
          </div>
        </div>
        <div className="mt-4 max-sm:px-4">
          <div className="sm:px-6 lg:px-12  sm:block">
            <nav className="gap-10 flex flex-row w-full items-center max-lg:gap-8 overflow-scroll">
              {tabs.map((tab) => (
                <Link
                  key={tab.name}
                  href={tab.href}
                  className={classNames(
                    "whitespace-nowrap border-b-2 pb-2 text-base flex flex-row gap-2 items-center",
                    tab.href.split("/")[3]?.split("?")[0] ===
                      router.pathname.split("/")[3]
                      ? "border-blue-600 text-gray-700 font-bold px-0 dark:text-gray-200 max-lg:border-b-2"
                      : "border-transparent text-gray-600  px-0 hover:border-gray-300 hover:text-gray-700 dark:text-gray-200 font-normal"
                  )}
                >
                  {tab.name}
                  {tab.name === "Contact Info" && !hasContactInfo ? (
                    <ExclamationTriangleIcon className="w-4 h-4 text-yellow-500" />
                  ) : null}
                  {tab.name === "Grants" && project?.grants?.length ? (
                    <p className="rounded-2xl bg-gray-200 px-2.5 py-[2px] text-center text-sm font-medium leading-tight text-slate-700 dark:bg-slate-700 dark:text-zinc-300">
                      {formatCurrency(project?.grants?.length || 0)}
                    </p>
                  ) : null}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      </div>
      <div className="px-4 sm:px-6 lg:px-12">{children}</div>
    </div>
  );
};

export const ProjectPageLayout = (page: any) => (
  <NestedLayout>{page}</NestedLayout>
);
export async function getServerSideProps(context: GetServerSidePropsContext) {
  const { params } = context;
  const projectId = params?.projectId as string;
  let projectInfo: ProjectDetailsWithUid | null = null;

  await Promise.all(
    [
      async () => {
        const info = await getMetadata<IProjectDetails>(
          "projects",
          projectId as Hex
        );
        projectInfo = info as ProjectDetailsWithUid;
      },
    ].map((func) => func())
  );

  if (!projectInfo || (projectInfo as ProjectDetailsWithUid)?.uid === zeroUID) {
    return {
      notFound: true,
    };
  }

  return {
    props: {
      projectTitle: (projectInfo as ProjectDetailsWithUid)?.title || "",
      projectDesc:
        (projectInfo as ProjectDetailsWithUid)?.description?.substring(0, 80) ||
        "",
    },
  };
}
const ProjectPageIndex = ({
  projectTitle,
  projectDesc,
}: InferGetServerSidePropsType<typeof getServerSideProps>) => {
  const dynamicMetadata = {
    title: `Karma GAP - ${projectTitle}`,
    description: projectDesc,
  };
  if (!projectTitle) {
    // Project is undefined, return null or any other fallback component
    return (
      <div className="col-span-12 min-h-screen px-4 py-4">
        <h1 className="text-3xl mb-5">404 - Project Not Found</h1>
        <Link href="/">Go Home</Link>
      </div>
    );
  }
  return (
    <>
      <NextSeo
        title={dynamicMetadata.title || defaultMetadata.title}
        description={dynamicMetadata.description || defaultMetadata.description}
        twitter={{
          handle: defaultMetadata.twitter.creator,
          site: defaultMetadata.twitter.site,
          cardType: "summary_large_image",
        }}
        openGraph={{
          url: defaultMetadata.openGraph.url,
          title: dynamicMetadata.title || defaultMetadata.title,
          description:
            dynamicMetadata.description || defaultMetadata.description,
          images: defaultMetadata.openGraph.images.map((image) => ({
            url: image,
            alt: dynamicMetadata.title || defaultMetadata.title,
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

      {<ProjectPage />}
    </>
  );
};

ProjectPageIndex.getLayout = ProjectPageLayout;

export default ProjectPageIndex;
