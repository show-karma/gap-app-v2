/* eslint-disable @next/next/no-img-element */
import { Grant } from "@show-karma/karma-gap-sdk";
import { blo } from "blo";
import ReactMarkdown from "react-markdown";
import { Hex } from "viem";
import { PAGES, formatDate, formatPercentage } from "@/utilities";
import pluralize from "pluralize";
import Link from "next/link";
import formatCurrency from "@/utilities/formatCurrency";

interface GrantCardProps {
  grant: Grant;
  index: number;
}

const firstFiveMembers = (grant: Grant) => grant.members?.slice(0, 5) as Hex[];
const restMembersCounter = (grant: Grant) =>
  grant.members?.length ? grant.members.length - 5 : 0;

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

const milestonesPercentage = (grant: Grant) => {
  const total = grant.milestones?.length;
  const completed = grant.milestones?.filter(
    (milestone) => milestone.completed
  ).length;
  return formatPercentage((completed / total) * 100) || 0;
};

const updatesLength = (grant: Grant) =>
  grant.milestones.filter((milestone) => milestone.completed).length +
  grant.updates.length;

export const GrantCard = ({ grant, index }: GrantCardProps) => {
  return (
    <Link
      href={PAGES.PROJECT.GRANT(
        grant.project?.slug || grant.refUID || "",
        grant.uid
      )}
      className="bg-white border border-gray-200 gap-3 px-5 pb-5 rounded-xl shadow-md flex flex-col transition-all ease-in-out duration-200 hover:shadow-lg"
    >
      <div className="w-full flex flex-col gap-1">
        <div
          className="h-[4px] w-full rounded-full mt-2.5 mb-2.5"
          style={{
            background: pickColor(index),
          }}
        />
        <div className="text-lg text-black font-bold line-clamp-1">
          {grant.project?.title}
        </div>
        <div className="text-sm text-gray-500 font-semibold line-clamp-1">
          {grant.details?.title}
        </div>
        <div className="text-sm text-gray-400 font-medium">
          Created on &nbsp;
          {formatDate(grant.createdAt)}
        </div>
      </div>

      <div className="flex flex-col gap-1 flex-1">
        <div className="text-gray-600 text-sm font-semibold">Summary</div>
        <div className="text-sm text-gray-900 text-ellipsis line-clamp-2">
          <ReactMarkdown>
            {grant.details?.description?.slice(0, 100)}
          </ReactMarkdown>
        </div>
      </div>

      <div className="flex w-full flex-row flex-wrap justify-start gap-1">
        <div className="flex h-max w-max items-center justify-start rounded-md bg-slate-50 px-3 py-1 mix-blend-multiply max-2xl:px-2">
          <p className="text-center text-xs font-semibold text-slate-600">
            <>
              {formatCurrency(grant.milestones?.length)}{" "}
              {pluralize("Milestone", grant.milestones?.length)}
            </>
          </p>
        </div>
        {grant.milestones?.length ? (
          <div className="flex h-max w-max items-center justify-start rounded-md bg-teal-50 px-3 py-1 mix-blend-multiply max-2xl:px-2">
            <p className="text-center text-xs font-semibold text-teal-600">
              {milestonesPercentage(grant)}% completed
            </p>
          </div>
        ) : null}
        <div className="flex h-max w-max items-center justify-start rounded-md bg-slate-50 px-3 py-1 mix-blend-multiply max-2xl:px-2">
          <p className="text-center text-xs font-semibold text-slate-600">
            {formatCurrency(updatesLength(grant))}{" "}
            {pluralize("Update", updatesLength(grant))}
          </p>
        </div>
      </div>

      <div className="gap-1 flex items-center justify-start flex-row flex-wrap">
        {grant.categories?.map((category, index) => (
          <span
            className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-500/10"
            key={index}
          >
            {category}
          </span>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {firstFiveMembers(grant).length ? (
            <>
              <span className="text-sm text-gray-600">Built by</span>
              {firstFiveMembers(grant).map((member, index) => (
                <span key={index}>
                  <img
                    src={blo(member, 8)}
                    alt={member}
                    className="h-12 w-12 rounded-md ring-4 ring-gray-50 dark:ring-black border-1 border-gray-100 dark:border-zinc-900 sm:h-5 sm:w-5"
                  />
                </span>
              ))}
              {restMembersCounter(grant) > 0 && (
                <p className="flex items-center justify-center h-12 w-12 rounded-md ring-4 ring-gray-50 dark:ring-black border-1 border-gray-100 dark:border-zinc-900 sm:h-5 sm:w-5">
                  +
                </p>
              )}
            </>
          ) : null}
        </div>
      </div>
    </Link>
  );
};
