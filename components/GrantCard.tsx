/* eslint-disable @next/next/no-img-element */
import { Grant, GrantDetails, ProjectDetails } from "@show-karma/karma-gap-sdk";
import { blo } from "blo";
import { Hex } from "viem";
import { PAGES, formatPercentage, formatDate } from "@/utilities";
import pluralize from "pluralize";
import formatCurrency from "@/utilities/formatCurrency";
import { MarkdownPreview } from "./Utilities/MarkdownPreview";

interface GrantMongo extends Omit<Grant, "details" | "project"> {
  details: GrantDetails;
  project: {
    details: ProjectDetails;
  };
}

interface GrantCardProps {
  rawGrant: Grant;
  index: number;
}

const firstFiveMembers = (members: Grant["members"]) =>
  members?.slice(0, 5) as Hex[];
const restMembersCounter = (members: Grant["members"]) =>
  members?.length ? members.length - 5 : 0;

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

const milestonesPercentage = (milestones: Grant["milestones"]) => {
  const total = milestones?.length;
  const completed = milestones?.filter(
    (milestone) => milestone.completed
  ).length;
  return formatPercentage((completed / total) * 100) || 0;
};

const updatesLength = (
  milestones: Grant["milestones"],
  updatesLength: number
) =>
  milestones.filter((milestone) => milestone.completed).length + updatesLength;

export const GrantCard = ({ rawGrant, index }: GrantCardProps) => {
  const grant = rawGrant as unknown as GrantMongo;

  return (
    <a
      href={PAGES.PROJECT.GRANT(
        grant.project?.details?.data?.slug || grant.refUID || "",
        grant.uid
      )}
      className="flex h-full w-full max-w-[320px] flex-col items-start justify-between gap-3 rounded-2xl border border-zinc-200 bg-white dark:bg-zinc-900 p-2 transition-all duration-300 ease-in-out hover:opacity-80"
    >
      <div className="w-full flex flex-col gap-1">
        <div
          className="h-[4px] w-full rounded-full mb-2.5"
          style={{
            background: pickColor(index),
          }}
        />
        <div className="flex w-full flex-col px-3">
          <p className="line-clamp-1 break-all text-base font-semibold text-gray-900 dark:text-zinc-200  max-2xl:text-sm">
            {grant.project?.details?.data?.title || grant.uid}
          </p>
          <p className="line-clamp-1 break-all text-sm font-semibold text-gray-500 dark:text-zinc-300 max-2xl:text-[13px]">
            {grant.details?.data.title}
          </p>
          <p className="mb-2 text-sm font-medium text-gray-400  dark:text-zinc-400  max-2xl:text-[13px]">
            Created on {formatDate(grant.createdAt)}
          </p>
          <div className="flex flex-col gap-1 flex-1 h-[64px]">
            <div className="text-sm text-gray-900 dark:text-gray-400 text-ellipsis line-clamp-2">
              <MarkdownPreview
                source={grant.details?.data?.description?.slice(0, 100)}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex w-full flex-row flex-wrap justify-start gap-1">
        <div className="flex h-max w-max items-center justify-start rounded-full bg-slate-50   dark:bg-slate-700 text-slate-600 dark:text-gray-300 px-3 py-1 max-2xl:px-2">
          <p className="text-center text-sm font-semibold text-slate-600 dark:text-slate-100 max-2xl:text-[13px]">
            <>
              {formatCurrency(grant.milestones?.length)}{" "}
              {pluralize("Milestone", grant.milestones?.length)}
            </>
          </p>
        </div>
        {grant.milestones?.length ? (
          <div className="flex h-max w-max items-center justify-start rounded-full bg-teal-50 dark:bg-teal-700 text-teal-600 dark:text-teal-200 px-3 py-1 max-2xl:px-2">
            <p className="text-center text-sm font-medium text-teal-600 dark:text-teal-100 max-2xl:text-[13px]">
              {milestonesPercentage(grant.milestones)}% completed
            </p>
          </div>
        ) : null}

        <div className="flex h-max w-max items-center justify-start rounded-full bg-slate-50 dark:bg-slate-600 text-slate-600 dark:text-gray-300 px-3 py-1 max-2xl:px-2">
          <p className="text-center text-sm font-semibold text-slate-600 dark:text-slate-100 max-2xl:text-[13px]">
            {formatCurrency(
              updatesLength(grant.milestones, grant.updates.length)
            )}{" "}
            {pluralize(
              "Update",
              updatesLength(grant.milestones, grant.updates.length)
            )}
          </p>
        </div>
      </div>

      <div className="gap-1 flex items-center justify-start flex-row flex-wrap overflow-y-auto">
        {grant.categories?.map((category, index) => (
          <div
            key={category}
            className="flex h-max max-h-[64px] w-max items-center justify-start  rounded-2xl bg-blue-100 dark:bg-blue-900 dark:mix-blend-normal px-3 py-1 mix-blend-multiply  max-2xl:px-2"
          >
            <div className="h-max max-h-[64px] w-max max-w-[260px] truncate break-words text-start text-sm font-semibold text-slate-600 dark:text-slate-100 max-2xl:text-[13px]">
              {category}
            </div>
          </div>
        ))}
      </div>

      <div className="flex px-3 items-center justify-between">
        <div className="flex items-center w-full flex-wrap gap-2">
          {firstFiveMembers(grant.members).length ? (
            <>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-200">
                Built by
              </p>
              <div className="flex flex-row gap-0 flex-1">
                {firstFiveMembers(grant).map((member, index) => (
                  <span
                    key={index}
                    className="-mr-1.5"
                    style={{ zIndex: 5 - index }}
                  >
                    <img
                      src={blo(member, 8)}
                      alt={member}
                      className="h-5 w-5 rounded-full border-1 border-gray-100 dark:border-zinc-900 sm:h-5 sm:w-5"
                    />
                  </span>
                ))}
                {restMembersCounter(grant.members) > 0 && (
                  <p className="flex items-center justify-center h-12 w-12 rounded-full ring-4 ring-gray-50 dark:ring-zinc-800 border-1 border-gray-100 dark:border-zinc-900 sm:h-5 sm:w-5">
                    +
                  </p>
                )}
              </div>
            </>
          ) : null}
        </div>
      </div>
    </a>
  );
};
