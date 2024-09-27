"use client";
import { DefaultLoading } from "@/components/Utilities/DefaultLoading";
import { errorManager } from "@/components/Utilities/errorManager";
import Pagination from "@/components/Utilities/Pagination";
import { useOwnerStore } from "@/store";
import { PageInfo } from "@/types/pagination";
import { ProjectReport } from "@/types/project";
import fetchData from "@/utilities/fetchData";
import { formatDate } from "@/utilities/formatDate";
import { INDEXER } from "@/utilities/indexer";
import { MESSAGES } from "@/utilities/messages";
import { ReadMore } from "@/utilities/ReadMore";
import { cn } from "@/utilities/tailwind";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import toast from "react-hot-toast";
import { ProjectDescriptionDialog } from "./Dialog";
import { ProjectContacts } from "./Contacts";
import { AllProjectsLoadingTable } from "./Loading";

const getAllProjects = async (
  offset: number,
  limit: number
): Promise<{ data: ProjectReport[]; pageInfo: PageInfo }> => {
  const response = await fetchData(
    INDEXER.PROJECT.ALL_REPORT(offset, limit)
  ).then(([res, error]) => {
    if (!error) {
      return res;
    }
    toast.error("Something went wrong while fetching projects");
    errorManager("Something went wrong while fetching projects", error);
    return [];
  });

  return response;
};

const rowClass =
  "text-normal text-center  text-zinc-800 dark:text-zinc-200 text-base break-normal line-clamp-2 w-full max-w-[320px] px-1 py-2";

const headerClass =
  "text-normal text-center  text-zinc-800 dark:text-zinc-200 text-base w-max max-w-[320px]";

export const AllProjects = () => {
  const isOwner = useOwnerStore((state) => state.isOwner);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [currentPageInfo, setCurrentPageInfo] = useState<PageInfo | undefined>(
    undefined
  );

  // const isLoading = true;
  const { data, isLoading } = useQuery({
    queryKey: ["all-projects", page, pageSize],
    queryFn: () =>
      getAllProjects((page - 1) * pageSize, pageSize).then((res) => {
        setCurrentPageInfo(res.pageInfo);
        return res;
      }),
  });
  const projects = data?.data || [];

  return (
    <div className="px-4 sm:px-6 lg:px-12 py-5">
      {isOwner ? (
        <div className="flex flex-col gap-2">
          <div className="flex justify-between">
            <div className="text-2xl font-bold">All Projects</div>
            {/* do a select to change page size */}
            <div className="flex items-center gap-2">
              <p>Show</p>
              <select
                className="border border-zinc-300 rounded-md px-2 py-1 flex flex-row gap-2 pr-6"
                onChange={(e) => setPageSize(Number(e.target.value))}
              >
                <option value={20}>20</option>
                <option value={40}>40</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={200}>200</option>
              </select>
              <p>entries</p>
            </div>
          </div>
          <div className="mt-5 w-full gap-5 overflow-x-auto">
            {isLoading ? (
              <AllProjectsLoadingTable pageSize={pageSize} />
            ) : projects?.length ? (
              <table className="border-x border-x-zinc-300 border-y border-y-zinc-300 w-full ">
                <thead className="border-x border-x-zinc-300 border-y border-y-zinc-300 w-full">
                  <tr className="divide-x w-full">
                    <th className={cn(headerClass)}>Date</th>
                    <th className={cn(headerClass)}>Project</th>
                    <th className={cn(headerClass)}>Categories</th>
                    <th className={cn(headerClass)}>Description</th>
                    <th className={cn(headerClass)}>Contact Info</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-x divide-zinc-300 w-full">
                  {projects?.map((project) => {
                    return (
                      <tr
                        key={project.title + project.createdAt}
                        className="divide-zinc-300 divide-x"
                      >
                        <td className="w-max min-w-max max-w-1/5 px-2 py-1">
                          <p className={cn(rowClass)}>
                            {formatDate(project.createdAt)}
                          </p>
                        </td>
                        <td className="w-1/5 min-w-[300px] max-w-1/5 px-2 py-1">
                          <p className={cn(rowClass)}>{project.title}</p>
                        </td>
                        <td className="w-1/5 min-w-[200px] max-w-1/5 px-2 py-1">
                          <p className={cn(rowClass)}>
                            {project?.categories?.join(", ")}
                          </p>
                        </td>
                        <td className="w-1/5 min-w-[300px] max-w-1/5 px-2 py-1">
                          <ProjectDescriptionDialog
                            projectName={project.title}
                            description={project.description}
                          />
                        </td>
                        <td className="w-1/5 min-w-[320px] max-w-1/5 px-2 py-1">
                          {project?.contact.length ? (
                            <ProjectContacts contacts={project.contact} />
                          ) : null}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <p>No projects found</p>
            )}
          </div>
          <Pagination
            currentPage={page}
            totalPosts={currentPageInfo?.totalItems || 0}
            setCurrentPage={setPage}
            postsPerPage={pageSize}
          />
        </div>
      ) : (
        <p>{MESSAGES.REVIEWS.NOT_ADMIN}</p>
      )}
    </div>
  );
};
