/* eslint-disable @next/next/no-img-element */
import React, { useEffect, useState } from "react";
import Head from "next/head";
import { blo } from "blo";
import { useAccount } from "wagmi";
import {
  MESSAGES,
  PAGES,
  defaultMetadata,
  formatDate,
  getFeedHref,
  getProjectsOf,
} from "@/utilities";
import { Project } from "@show-karma/karma-gap-sdk";
import formatCurrency from "@/utilities/formatCurrency";
import pluralize from "pluralize";
import Link from "next/link";
import Pagination from "@/components/Utilities/Pagination";
import { NextSeo } from "next-seo";
import { Spinner } from "@/components/Utilities/Spinner";
import { MarkdownPreview } from "@/components/Utilities/MarkdownPreview";
import dynamic from "next/dynamic";
import { useTheme } from "next-themes";
import { useAuthStore } from "@/store/auth";

const ProjectDialog = dynamic(
  () => import("@/components/ProjectDialog").then((mod) => mod.ProjectDialog),
  { ssr: false }
);

const firstFiveMembers = (project: Project) =>
  project.members.slice(0, 5).map((item) => item.recipient);
const restMembersCounter = (project: Project) =>
  project.members?.length ? project.members.length - 5 : 0;

const pickColor = (index: number) => {
  const cardColors = [
    "#5FE9D0",
    "#875BF7",
    "#F97066",
    "#FDB022",
    "#A6EF67",
    "#84ADFF",
    "#EF6820",
    "#EE46BC",
    "#EEAAFD",
    "#67E3F9",
  ];
  return cardColors[index % cardColors.length];
};

export default function MyProjects() {
  const { isConnected, address } = useAccount();
  const { isAuth } = useAuthStore();
  const { theme: currentTheme } = useTheme();
  const [myProjects, setMyProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const itemsPerPage = 12;
  const [page, setPage] = useState<number>(1);
  const [totalProjects, setTotalProjects] = useState<number>(0);

  useEffect(() => {
    const fetchMyProjects = async () => {
      if (!address) return;
      setIsLoading(true);
      try {
        const projectsOf = await getProjectsOf(address);
        setTotalProjects(projectsOf.length);
        const projectsPiece = projectsOf.slice(
          itemsPerPage * (page - 1),
          itemsPerPage * page
        );
        setMyProjects(projectsPiece || []);
      } catch (error) {
        console.error(error);
        setMyProjects([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMyProjects();
  }, [address, page]);

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
        <div className="mt-5 w-full gap-5">
          {isConnected && isAuth ? (
            myProjects.length > 0 ? (
              <div className="flex flex-col gap-4 justify-start">
                <div className="grid grid-cols-4 gap-7 pb-4 max-xl:grid-cols-3 max-lg:grid-cols-2 max-sm:grid-cols-1">
                  {myProjects.map((card, index) => {
                    let active = 0;
                    let total = 0;
                    card.grants?.forEach((grant) => {
                      total += 1;
                      const hasActive = grant.milestones.find(
                        (milestone) =>
                          (milestone.completed && !milestone.approved) ||
                          !milestone.completed
                      );
                      if (hasActive) active += 1;
                    });
                    return (
                      <div
                        key={index}
                        className="h-full bg-white dark:bg-zinc-900 dark:border-gray-900 border border-gray-200 rounded-xl   pb-5 w-full transition-all ease-in-out duration-200"
                      >
                        <Link
                          href={PAGES.PROJECT.OVERVIEW(
                            card.details?.slug || card.uid
                          )}
                          className="w-full flex flex-1 flex-col justify-start gap-3"
                        >
                          <div className="px-2 w-full mt-2.5">
                            <div
                              className=" h-[4px] w-full rounded-full"
                              style={{
                                background: pickColor(index),
                              }}
                            />
                          </div>

                          <div className="px-5 flex flex-col gap-0">
                            <div className="font-body line-clamp-1 mb-0 pb-0 truncate text-base font-semibold text-gray-900 dark:text-gray-100">
                              {card.details?.title || card.uid}
                            </div>
                            <div className="font-body dark:text-slate-400 mb-2 text-sm font-medium text-slate-500">
                              {`Created on ${formatDate(card.createdAt)}`}
                            </div>
                          </div>

                          <div className="px-5 flex flex-col gap-1 flex-1 h-full">
                            <div className="line-clamp-2 text-base font-normal ">
                              <MarkdownPreview
                                source={card.details?.description || ""}
                                style={{
                                  backgroundColor: "transparent",
                                  color:
                                    currentTheme === "dark"
                                      ? "white"
                                      : "rgb(71, 85, 105)",
                                  width: "100%",
                                  fontSize: "16px",
                                }}
                              />
                            </div>
                          </div>

                          <div className="px-5 flex min-h-[24px] w-full flex-row gap-2">
                            {total ? (
                              <div className="flex h-7 items-center justify-start rounded-2xl bg-slate-50 px-3 py-1">
                                <p className="text-center text-sm font-semibold leading-tight text-slate-600">
                                  {formatCurrency(total)} total{" "}
                                  {pluralize("grants", total)}
                                </p>
                              </div>
                            ) : null}
                            {active ? (
                              <div className="flex h-7 items-center justify-start gap-1.5 rounded-2xl bg-teal-50 py-1 pl-2.5 pr-3">
                                <div className="relative h-2 w-2">
                                  <div className="absolute left-[1px] top-[1px] h-1.5 w-1.5 rounded-full bg-teal-600" />
                                </div>
                                <p className="text-center text-sm font-medium leading-tight text-teal-600">
                                  {formatCurrency(active)} active{" "}
                                  {pluralize("grants", active)}
                                </p>
                              </div>
                            ) : null}
                          </div>

                          <div className="flex items-center justify-between px-5">
                            <div className="flex items-center gap-2">
                              {firstFiveMembers(card).length ? (
                                <>
                                  <span className="font-body text-sm font-medium text-slate-500 dark:text-gray-400">
                                    Built by
                                  </span>
                                  <div className="flex flex-row gap-0">
                                    {firstFiveMembers(card)?.map(
                                      (member, index) => (
                                        <span
                                          key={index}
                                          className="-mr-1.5"
                                          style={{ zIndex: 5 - index }}
                                        >
                                          <img
                                            src={blo(member, 8)}
                                            alt={member}
                                            className="h-6 w-6 rounded-full sm:h-5 sm:w-5  border-1 border-gray-100 dark:border-zinc-900"
                                          />
                                        </span>
                                      )
                                    )}
                                    {restMembersCounter(card) > 0 && (
                                      <p className="flex items-center justify-center h-12 w-12 rounded-md ring-4 ring-gray-50 dark:ring-black border-1 border-gray-100 dark:border-zinc-900 sm:h-5 sm:w-5">
                                        +
                                      </p>
                                    )}
                                  </div>
                                </>
                              ) : null}
                            </div>
                          </div>
                        </Link>
                      </div>
                    );
                  })}
                </div>
                <Pagination
                  currentPage={page}
                  postsPerPage={itemsPerPage}
                  totalPosts={totalProjects}
                  setCurrentPage={setPage}
                />
              </div>
            ) : !isLoading ? (
              <div className="flex w-full flex-row items-center justify-center">
                <div
                  className="flex h-96 border-spacing-4 flex-col items-center justify-center gap-5 rounded border border-blue-600 bg-[#EEF4FF] px-8"
                  style={{
                    border: "dashed 2px #155EEF",
                  }}
                >
                  <p className="text-lg font-bold text-black">Attention!</p>
                  <p className="w-max max-w-md  break-normal text-left text-lg font-normal text-black">
                    We were unable to locate any projects associated with your
                    wallet address: {address}. <br />
                    To find your project, please use the search function above.
                    If your project isn&apos;t listed, feel free to create a new
                    one.
                  </p>
                  <ProjectDialog />
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center">
                <Spinner />
              </div>
            )
          ) : (
            <div className="flex w-full items-center justify-center">
              <p className="text-base font-normal text-black">
                {MESSAGES.MY_PROJECTS.NOT_CONNECTED}
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

{
  /* {isLoading && (
  <div className="flex items-center justify-center">
    <Spinner />
  </div>
)} */
}
