/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { useRouter } from "next/router";
import { ReactNode, useEffect, useMemo, useState } from "react";
import ProjectPage from "./project";
import {
  PAGES,
  cn,
  defaultMetadata,
  getProjectById,
  getProjectOwner,
  useSigner,
  zeroUID,
} from "@/utilities";
import { useProjectStore } from "@/store";
import { useAccount } from "wagmi";
import { blo } from "blo";
import { Project } from "@show-karma/karma-gap-sdk";
import { NextSeo } from "next-seo";
import {
  DiscordIcon,
  GithubIcon,
  TwitterIcon,
  WebsiteIcon,
} from "@/components";

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
  const tabs = [
    { name: "Project", href: PAGES.PROJECT.OVERVIEW(projectId) },
    {
      name: "Grants",
      href: PAGES.PROJECT.GRANTS(projectId),
    },
    { name: "Team", href: PAGES.PROJECT.TEAM(projectId) },
  ];
  const project = useProjectStore((state) => state.project);
  const loading = useProjectStore((state) => state.loading);
  const setProject = useProjectStore((state) => state.setProject);
  const setLoading = useProjectStore((state) => state.setLoading);
  const setIsProjectOwner = useProjectStore((state) => state.setIsProjectOwner);

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

  const signer = useSigner();
  const { address } = useAccount();

  useEffect(() => {
    if (!signer || !project) {
      setIsProjectOwner(false);
      return;
    }
    const setupOwner = async () => {
      const isOwner = await getProjectOwner(signer as any, project);
      setIsProjectOwner(isOwner);
    };
    setupOwner();
  }, [signer, project, address]);

  const socials = useMemo(() => {
    const types = [
      { name: "Twitter", prefix: "https://twitter.com/", icon: TwitterIcon },
      { name: "Github", prefix: "https://github.com/", icon: GithubIcon },
      { name: "Discord", prefix: "https://discord.gg/", icon: DiscordIcon },
      { name: "Website", prefix: "https://", icon: WebsiteIcon },
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

    return types
      .map(({ name, prefix, icon }) => {
        const hasUrl = project?.details?.links?.find(
          (link) => link.type === name.toLowerCase()
        )?.url;

        if (hasUrl) {
          if (name === "Twitter") {
            const hasAt = hasUrl?.includes("@");
            return {
              name,
              url: isLink(hasUrl)
                ? hasUrl
                : prefix + (hasAt ? hasUrl?.replace("@", "") || "" : hasUrl),
              icon,
            };
          }
          return {
            name,
            url: isLink(hasUrl) ? hasUrl : prefix + hasUrl,
            icon,
          };
        }

        return undefined;
      })
      .filter((social) => social);
  }, [project]);

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
            href: "/favicon.png",
          },
        ]}
      />
      <div>
        <div className="relative border-b border-gray-200 pb-5 sm:pb-0">
          <div className="px-4 sm:px-6 lg:px-8 md:flex py-8 md:items-center md:justify-between">
            <h1
              className={cn(
                loading
                  ? "animate-pulse w-64 h-10 bg-gray-600 rounded-lg"
                  : "text-2xl font-semibold leading-6 text-gray-900 dark:text-gray-200"
              )}
            >
              {loading ? "" : project?.details?.title}
            </h1>
            <div className="flex flex-row gap-10">
              {project ? (
                <div className="flex items-center space-x-2">
                  {firstFiveMembers(project).length ? (
                    <>
                      <span className="text-base text-gray-600 dark:text-zinc-200">
                        Built by
                      </span>
                      {firstFiveMembers(project).map((member, index) => (
                        <span key={index}>
                          <img
                            src={blo(member, 8)}
                            alt={member}
                            className="h-12 w-12 rounded-md ring-4 ring-gray-50 dark:ring-black border-1 border-gray-100 dark:border-zinc-900 sm:h-5 sm:w-5"
                          />
                        </span>
                      ))}
                      {restMembersCounter(project) > 0 && (
                        <p className="flex items-center justify-center h-12 w-12 rounded-md ring-4 ring-gray-50 dark:ring-black border-1 border-gray-100 dark:border-zinc-900 sm:h-5 sm:w-5">
                          +
                        </p>
                      )}
                    </>
                  ) : null}
                </div>
              ) : null}
              {socials.length > 0 && (
                <div className="flex flex-row gap-3 items-center">
                  <p className="text-base font-normal leading-tight text-black dark:text-zinc-200">
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
                            <social.icon className="h-5 w-5 fill-black dark:fill-zinc-200" />
                          )}
                        </a>
                      ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="mt-4 max-sm:px-4">
            <div className="sm:hidden">
              <label htmlFor="current-tab" className="sr-only">
                Select a tab
              </label>
              <select
                id="current-tab"
                name="current-tab"
                className="block w-full rounded-md border-0 py-1.5 pl-3 pr-10 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-primary-600"
              >
                {tabs.map((tab) => (
                  <option key={tab.name}>{tab.name}</option>
                ))}
              </select>
            </div>
            <div className="px-4 sm:px-6 lg:px-8 hidden sm:block">
              <nav className="-mb-px flex space-x-8">
                {tabs.map((tab) => (
                  <Link
                    key={tab.name}
                    href={tab.href}
                    className={classNames(
                      tab.href.split("/")[3]?.split("?")[0] ===
                        router.pathname.split("/")[3]
                        ? "border-primary-500 text-primary-600"
                        : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700",
                      "whitespace-nowrap border-b-2 px-1 pb-4 text-sm font-medium"
                    )}
                  >
                    {tab.name}
                  </Link>
                ))}
              </nav>
            </div>
          </div>
        </div>
        <div className="px-4 sm:px-6 lg:px-8">{children}</div>
      </div>
    </>
  );
};

export const ProjectPageLayout = (page: any) => (
  <NestedLayout>{page}</NestedLayout>
);

const ProjectPageIndex = () => {
  return <ProjectPage />;
};

ProjectPageIndex.getLayout = ProjectPageLayout;

export default ProjectPageIndex;
