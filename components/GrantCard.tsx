/* eslint-disable @next/next/no-img-element */
import { Grant } from "@show-karma/karma-gap-sdk";
import { blo } from "blo";
import { Hex } from "viem";
import { PAGES, formatDate, formatPercentage } from "@/utilities";
import pluralize from "pluralize";
import Link from "next/link";
import formatCurrency from "@/utilities/formatCurrency";
import { motion } from "framer-motion";
import { MarkdownPreview } from "./Utilities/MarkdownPreview";
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
    <motion.a
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
      href={PAGES.PROJECT.GRANT(
        grant.project?.slug || grant.refUID || "",
        grant.uid
      )}
      className="bg-white dark:bg-zinc-900 dark:border-gray-700 border border-gray-200 gap-3 px-5 pb-5 rounded-xl shadow-md flex flex-col transition-all ease-in-out duration-200 hover:shadow-lg"
    >
      <div className="w-full flex flex-col gap-1">
        <div
          className="h-[4px] w-full rounded-full mt-2.5 mb-2.5"
          style={{
            background: pickColor(index),
          }}
        />
        <div className="text-lg text-black dark:text-zinc-100 font-bold line-clamp-1">
          {grant.project?.title}
        </div>
        <div className="text-sm text-gray-500 dark:text-gray-500 font-semibold line-clamp-1">
          {grant.details?.title}
        </div>
        <div className="text-sm text-gray-400 dark:text-slate-400 font-medium">
          Created on &nbsp;
          {formatDate(grant.createdAt)}
        </div>
      </div>

      <div className="flex flex-col gap-1 flex-1">
        <div className="text-gray-600 dark:text-zinc-100 text-sm font-semibold">
          Summary
        </div>
        <div className="text-sm text-gray-900 dark:text-gray-400 text-ellipsis line-clamp-2">
          <MarkdownPreview source={grant.details?.description?.slice(0, 100)} />
        </div>
      </div>

      <div className="flex w-full flex-row flex-wrap justify-start gap-1">
        <div className="flex h-max w-max items-center justify-start rounded-md bg-slate-50 dark:bg-slate-700 text-slate-600 dark:text-gray-300 px-3 py-1 max-2xl:px-2">
          <p className="text-center text-xs font-semibold">
            <>
              {formatCurrency(grant.milestones?.length)}{" "}
              {pluralize("Milestone", grant.milestones?.length)}
            </>
          </p>
        </div>
        {grant.milestones?.length ? (
          <div className="flex h-max w-max items-center justify-start rounded-md bg-teal-50 dark:bg-teal-700 text-teal-600 dark:text-teal-200 px-3 py-1 max-2xl:px-2">
            <p className="text-center text-xs font-semibold">
              {milestonesPercentage(grant)}% completed
            </p>
          </div>
        ) : null}
        <div className="flex h-max w-max items-center justify-start rounded-md bg-slate-50 dark:bg-slate-600 text-slate-600 dark:text-gray-300 px-3 py-1 max-2xl:px-2">
          <p className="text-center text-xs font-semibold">
            {formatCurrency(updatesLength(grant))}{" "}
            {pluralize("Update", updatesLength(grant))}
          </p>
        </div>
      </div>

      <div className="gap-1 flex items-center justify-start flex-row flex-wrap">
        {grant.categories?.map((category, index) => (
          <span
            className="inline-flex items-center rounded-md bg-blue-50 dark:bg-slate-800 dark:text-gray-200 px-2 py-1 text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-500/10"
            key={index}
          >
            {category}
          </span>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center w-full flex-wrap gap-2">
          {firstFiveMembers(grant).length ? (
            <>
              <span className="text-sm w-max min-w-max text-gray-600 dark:text-gray-200">
                Built by
              </span>
              <div className="flex flex-row gap-2 flex-1">
                {firstFiveMembers(grant).map((member, index) => (
                  <span key={index}>
                    <img
                      src={blo(member, 8)}
                      alt={member}
                      className="h-5 w-5 rounded-md ring-4 ring-gray-50 dark:ring-zinc-800 border-1 border-gray-100 dark:border-zinc-900 sm:h-5 sm:w-5"
                    />
                  </span>
                ))}
                {restMembersCounter(grant) > 0 && (
                  <p className="flex items-center justify-center h-12 w-12 rounded-md ring-4 ring-gray-50 dark:ring-zinc-800 border-1 border-gray-100 dark:border-zinc-900 sm:h-5 sm:w-5">
                    +
                  </p>
                )}
              </div>
            </>
          ) : null}
        </div>
      </div>
    </motion.a>
  );
};
