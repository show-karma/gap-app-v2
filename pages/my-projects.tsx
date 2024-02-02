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
import { ProjectDialog } from "@/components/ProjectDialog";
import formatCurrency from "@/utilities/formatCurrency";
import pluralize from "pluralize";
import ReactMarkdown from "react-markdown";
import Link from "next/link";
import { motion } from "framer-motion";
import Pagination from "@/components/Utilities/Pagination";
import { NextSeo } from "next-seo";
import { Spinner } from "@/components/Utilities/Spinner";

const firstFiveMembers = (project: Project) =>
  project.members.slice(0, 5).map((item) => item.recipient);
const restMembersCounter = (project: Project) =>
  project.members?.length ? project.members.length - 5 : 0;

export default function MyProjects() {
  const { isConnected, address } = useAccount();

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
            href: "/favicon.png",
          },
        ]}
      />
      <div>
        <div className="px-4 sm:px-6 lg:px-8 py-5">
          <div className="text-2xl font-bold">My Projects</div>
          <div className="mt-5 w-full gap-5">
            {isConnected ? (
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
                        <motion.div
                          key={index}
                          initial={{
                            opacity: 0,
                            translateX: -10,
                            translateY: 0,
                          }}
                          animate={{ opacity: 1, translateX: 0, translateY: 0 }}
                          transition={{
                            type: "spring",
                            duration: 0.75,
                            delay: index * 0.03,
                          }}
                          exit={{ opacity: 0, translateX: -10, translateY: 0 }}
                          className="bg-white dark:bg-zinc-900 dark:border-gray-900 border border-gray-200 py-5 px-5 rounded-xl shadow-md w-full hover:shadow-zinc-400 dark:hover:shadow-zinc-700 transition-all ease-in-out duration-200"
                        >
                          <Link
                            href={PAGES.PROJECT.OVERVIEW(
                              card.details?.slug || card.uid
                            )}
                            className="w-full flex flex-col justify-start gap-3"
                          >
                            <div className="text-lg font-bold line-clamp-1">
                              {card.details?.title || card.uid}
                            </div>

                            <div className="flex flex-col gap-1 flex-1">
                              <div className=" text-gray-600  dark:text-gray-400 text-sm font-semibold">
                                Summary
                              </div>
                              <div className="text-sm text-gray-900 dark:text-white text-ellipsis line-clamp-2">
                                <ReactMarkdown>
                                  {card.details?.description || ""}
                                </ReactMarkdown>
                              </div>
                            </div>

                            <div className="flex min-h-[24px] w-full flex-row gap-2">
                              {total ? (
                                <div className="flex h-7 items-center justify-start rounded-2xl bg-slate-100 px-3 py-1">
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

                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                {firstFiveMembers(card).length ? (
                                  <>
                                    <span className="text-sm text-gray-600 dark:text-gray-400">
                                      Built by
                                    </span>
                                    {firstFiveMembers(card)?.map(
                                      (member, index) => (
                                        <span key={index}>
                                          <img
                                            src={blo(member, 8)}
                                            alt={member}
                                            className="h-12 w-12 rounded-md ring-4 ring-gray-50 dark:ring-black border-1 border-gray-100 dark:border-zinc-900 sm:h-5 sm:w-5"
                                          />
                                        </span>
                                      )
                                    )}
                                    {restMembersCounter(card) > 0 && (
                                      <p className="flex items-center justify-center h-12 w-12 rounded-md ring-4 ring-gray-50 dark:ring-black border-1 border-gray-100 dark:border-zinc-900 sm:h-5 sm:w-5">
                                        +
                                      </p>
                                    )}
                                  </>
                                ) : null}
                              </div>

                              <div className="text-xs text-gray-600 dark:text-gray-400">
                                Created on &nbsp;
                                {formatDate(card.createdAt)}
                              </div>
                            </div>
                          </Link>
                        </motion.div>
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
                      To find your project, please use the search function
                      above. If your project isn&apos;t listed, feel free to
                      create a new one.
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
