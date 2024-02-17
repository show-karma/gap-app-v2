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
            {grant.project?.title}
          </p>
          <p className="line-clamp-1 break-all text-sm font-semibold text-gray-500 dark:text-zinc-300 max-2xl:text-[13px]">
            {grant.details?.title}
          </p>
          <p className="mb-2 text-sm font-medium text-gray-400  dark:text-zinc-400  max-2xl:text-[13px]">
            Created on {formatDate(grant.createdAt)}
          </p>
          <div className="flex flex-col gap-1 flex-1 h-[64px]">
            <div className="text-sm text-gray-900 dark:text-gray-400 text-ellipsis line-clamp-2">
              <MarkdownPreview
                source={grant.details?.description?.slice(0, 100)}
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
              {milestonesPercentage(grant)}% completed
            </p>
          </div>
        ) : null}
        <div className="flex h-max w-max items-center justify-start rounded-full bg-slate-50 dark:bg-slate-600 text-slate-600 dark:text-gray-300 px-3 py-1 max-2xl:px-2">
          <p className="text-center text-sm font-semibold text-slate-600 dark:text-slate-100 max-2xl:text-[13px]">
            {formatCurrency(updatesLength(grant))}{" "}
            {pluralize("Update", updatesLength(grant))}
          </p>
        </div>
      </div>

      <div className="gap-1 flex items-center justify-start flex-row flex-wrap">
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
          {firstFiveMembers(grant).length ? (
            <>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-200">
                Built by
              </p>
              <div className="flex flex-row gap-2 flex-1">
                {firstFiveMembers(grant).map((member, index) => (
                  <span key={index}>
                    <img
                      src={blo(member, 8)}
                      alt={member}
                      className="h-5 w-5 rounded-full border-1 border-gray-100 dark:border-zinc-900 sm:h-5 sm:w-5"
                    />
                  </span>
                ))}
                {restMembersCounter(grant) > 0 && (
                  <p className="flex items-center justify-center h-12 w-12 rounded-full ring-4 ring-gray-50 dark:ring-zinc-800 border-1 border-gray-100 dark:border-zinc-900 sm:h-5 sm:w-5">
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
