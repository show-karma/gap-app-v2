/* eslint-disable @next/next/no-img-element */
import { Grant, GrantDetails, ProjectDetails } from "@show-karma/karma-gap-sdk";
import pluralize from "pluralize";
import formatCurrency from "@/utilities/formatCurrency";
import { MarkdownPreview } from "../../Utilities/MarkdownPreview";
import { formatPercentage } from "@/utilities/formatNumber";
import { PAGES } from "@/utilities/pages";
import { formatDate } from "@/utilities/formatDate";
import { ProjectFromList } from "@/types/project";
import Link from "next/link";
import { ProfilePicture } from "../../Utilities/ProfilePicture";

interface ProjectCardProps {
  project: ProjectFromList;
  index: number;
}

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

export const ProjectCard = ({ project, index }: ProjectCardProps) => {
  return (
    <Link
      id="project-card"
      href={PAGES.PROJECT.OVERVIEW(project?.slug || project?.uid)}
      className="flex h-full w-full max-w-full max-sm:w-[320px] relative flex-col items-start justify-between gap-3 rounded-2xl border border-zinc-200 bg-white dark:bg-zinc-900 p-2 transition-all duration-300 ease-in-out hover:opacity-80"
    >
      <div className="w-full flex flex-col gap-1 ">
        <div
          className="h-[4px] w-full rounded-full mb-2.5"
          style={{
            background: pickColor(index),
          }}
        />

        <div className="flex w-full flex-col px-3">
          <div className="flex flex-row items-center gap-2 mb-1">
            <div className="flex justify-center">
              <ProfilePicture
                imageURL={project?.imageURL}
                name={project?.uid || ""}
                size="32"
                className="h-8 w-8 min-w-8 min-h-8 border border-white shadow-sm"
                alt={project?.title || "Project"}
              />
            </div>
            <p className="line-clamp-1 break-all text-base font-semibold text-gray-900 dark:text-zinc-200 max-2xl:text-sm flex-1">
              {project?.title}
            </p>
          </div>

          <p className="mb-2 text-sm font-medium text-gray-400  dark:text-zinc-400  max-2xl:text-[13px]">
            Created on {formatDate(project.createdAt)}
          </p>
          <div className="flex flex-col gap-1 flex-1 h-[60px]">
            <div className="text-sm text-gray-900 dark:text-gray-400 text-ellipsis line-clamp-3">
              <MarkdownPreview source={project?.description?.slice(0, 160)} />
            </div>
          </div>
        </div>
      </div>

      <div className="flex w-full flex-col justify-start gap-1">
        <div className="flex w-full flex-row justify-start items-center gap-1">
          <div className="flex h-max w-full items-center justify-start rounded-full bg-slate-50   dark:bg-slate-700 text-slate-600 dark:text-gray-300 px-3 py-1 max-2xl:px-2">
            <p className="text-center text-sm font-semibold text-slate-600 dark:text-slate-100 max-2xl:text-[13px]">
              {formatCurrency(project.noOfGrants)}{" "}
              {pluralize("Grants", project.noOfGrants)} received
            </p>
          </div>
          {project.noOfGrantMilestones && project.noOfGrantMilestones > 0 ? (
            <div className="flex h-max w-full items-center justify-start rounded-full bg-slate-50   dark:bg-slate-700 text-slate-600 dark:text-gray-300 px-3 py-1 max-2xl:px-2">
              <p className="text-center text-sm font-semibold text-slate-600 dark:text-slate-100 max-2xl:text-[13px]">
                Total {pluralize("Milestone", project.noOfGrantMilestones)}{" "}
                {project.noOfGrantMilestones}
              </p>
            </div>
          ) : null}
        </div>

        <div className="flex h-max w-full items-center justify-start rounded-full bg-slate-50 dark:bg-slate-600 text-slate-600 dark:text-gray-300 px-3 py-1 max-2xl:px-2">
          <p className="text-center text-sm font-semibold text-slate-600 dark:text-slate-100 max-2xl:text-[13px]">
            {formatCurrency(project.noOfProjectMilestones)} Roadmap{" "}
            {pluralize("items", project.noOfProjectMilestones)}
          </p>
        </div>
      </div>
    </Link>
  );
};
