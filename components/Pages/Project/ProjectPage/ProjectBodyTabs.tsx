/* eslint-disable @next/next/no-img-element */
import { useProjectStore } from "@/store";
import { ReadMore } from "@/utilities/ReadMore";
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  MapPinIcon,
} from "@heroicons/react/24/outline";
import { Bars4Icon } from "@heroicons/react/24/solid";
import { FC } from "react";

import { BusinessModelIcon } from "@/components/Icons/BusinessModel";
import { FundsRaisedIcon } from "@/components/Icons/FundsRaised";
import { PathIcon } from "@/components/Icons/PathIcon";
import { StageIcon } from "@/components/Icons/StageIcon";
import { TargetIcon } from "@/components/Icons/Target";
import { ProjectBlocks } from "./ProjectBlocks";

export const InformationBlock: FC = () => {
  const { project } = useProjectStore();
  return (
    <div
      id="information-tab"
      className="flex flex-col gap-6 max-sm:gap-4 flex-1 w-full"
    >
      <ProjectBlocks />

      <div className="flex flex-row gap-2 items-start justify-start">
        <Bars4Icon className="w-6 h-6 max-w-6 max-h-[24px] min-w-6 min-h-[24px] text-black dark:text-zinc-100" />
        <div className="flex flex-col gap-1 justify-start items-start flex-1 w-full max-w-full">
          <p className="font-bold leading-normal text-black dark:text-zinc-100">
            Description
          </p>
          <ReadMore
            readLessText="Show less"
            readMoreText="Show more"
            markdownClass="text-black dark:text-zinc-100 font-normal text-base w-full max-w-full"
            side="left"
            words={200}
          >
            {project?.details?.data?.description || ""}
          </ReadMore>
        </div>
      </div>
      {project?.details?.data?.missionSummary && (
        <div className="flex flex-row gap-2 items-start justify-start">
          <TargetIcon className="w-6 h-6 max-w-6 max-h-[24px] min-w-6 min-h-[24px]  text-black dark:text-zinc-100" />
          <div className="flex flex-col gap-1 justify-start items-start">
            <p className="font-bold leading-normal text-black dark:text-zinc-100">
              Mission
            </p>
            <ReadMore
              readLessText="Show less"
              readMoreText="Show more"
              markdownClass="text-black dark:text-zinc-100 font-normal text-base"
              side="left"
              words={200}
            >
              {project?.details?.data?.missionSummary || ""}
            </ReadMore>
          </div>
        </div>
      )}

      {project?.details?.data?.problem && (
        <div className="flex flex-row gap-2 items-start justify-start">
          <ExclamationTriangleIcon className="w-6 h-6 max-w-6 max-h-[24px] min-w-6 min-h-[24px] text-black dark:text-zinc-100" />
          <div className="flex flex-col gap-1 justify-start items-start">
            <p className="font-bold leading-normal text-black dark:text-zinc-100">
              Problem
            </p>
            <ReadMore
              readLessText="Show less"
              readMoreText="Show more"
              markdownClass="text-black dark:text-zinc-100 font-normal text-base"
              side="left"
              words={200}
            >
              {project?.details?.data?.problem || ""}
            </ReadMore>
          </div>
        </div>
      )}
      {project?.details?.data?.solution && (
        <div className="flex flex-row gap-2 items-start justify-start">
          <CheckCircleIcon className="w-6 h-6 max-w-6 max-h-[24px] min-w-6 min-h-[24px] text-black dark:text-zinc-100" />
          <div className="flex flex-col gap-1 justify-start items-start">
            <p className="font-bold leading-normal text-black dark:text-zinc-100">
              Solution
            </p>
            <ReadMore
              readLessText="Show less"
              readMoreText="Show more"
              markdownClass="text-black dark:text-zinc-100 font-normal text-base"
              side="left"
              words={200}
            >
              {project?.details?.data?.solution || ""}
            </ReadMore>
          </div>
        </div>
      )}
      {project?.details?.data?.locationOfImpact && (
        <div className="flex flex-row gap-2 items-start justify-start">
          <MapPinIcon className="w-6 h-6 max-w-6 max-h-[24px] min-w-6 min-h-[24px] text-black dark:text-zinc-100" />
          <div className="flex flex-col gap-1 justify-start items-start">
            <p className="font-bold leading-normal text-black dark:text-zinc-100">
              Location of Impact
            </p>
            <ReadMore
              readLessText="Show less"
              readMoreText="Show more"
              markdownClass="text-black dark:text-zinc-100 font-normal text-base"
              side="left"
              words={200}
            >
              {project?.details?.data?.locationOfImpact || ""}
            </ReadMore>
          </div>
        </div>
      )}
      {project?.details?.data?.businessModel ||
      project?.details?.data?.pathToTake ||
      project?.details?.data?.stageIn ||
      project?.details?.data?.raisedMoney ? (
        <div className="flex flex-col px-6 py-6 gap-6 border-[#DCDFEA] border rounded-xl">
          <div className="flex flex-row gap-2 items-start justify-start">
            <BusinessModelIcon className="w-6 h-6 max-w-6 max-h-[24px] min-w-6 min-h-[24px] text-black dark:text-zinc-100" />
            <div className="flex flex-col gap-1 justify-start items-start">
              <p className="font-bold leading-normal text-black dark:text-zinc-100">
                Business Model
              </p>
              <ReadMore
                readLessText="Show less"
                readMoreText="Show more"
                markdownClass="text-black dark:text-zinc-100 font-normal text-base"
                side="left"
                words={200}
              >
                {project?.details?.data?.businessModel || ""}
              </ReadMore>
            </div>
          </div>

          <div className="flex flex-row  max-sm:flex-col gap-10 max-sm:gap-4 items-center max-sm:items-start justify-start flex-wrap">
            {project?.details?.data?.pathToTake ? (
              <div className="flex flex-row gap-2 max-sm:flex-col items-start justify-start">
                <div className="flex flex-row gap-3 justify-start items-start">
                  <PathIcon className="w-6 h-6 max-w-6 max-h-[24px] min-w-6 min-h-[24px] text-black dark:text-zinc-100" />
                  <p className="font-bold leading-normal text-black dark:text-zinc-100">
                    Path
                  </p>
                </div>
                <p className="font-normal text-base leading-normal text-black dark:text-zinc-100">
                  {project?.details?.data?.pathToTake}
                </p>
              </div>
            ) : null}
            {project?.details?.data?.stageIn ? (
              <div className="flex flex-row gap-2 max-sm:flex-col items-start justify-start">
                <div className="flex flex-row gap-3 justify-start items-start">
                  <StageIcon className="w-6 h-6 max-w-6 max-h-[24px] min-w-6 min-h-[24px] text-black dark:text-zinc-100" />
                  <p className="font-bold leading-normal text-black dark:text-zinc-100">
                    Stage
                  </p>
                </div>
                <p className="font-normal text-base leading-normal text-black dark:text-zinc-100">
                  {project?.details?.data?.stageIn}
                </p>
              </div>
            ) : null}
          </div>
          {project?.details?.data?.raisedMoney ? (
            <div className="flex flex-row gap-2 max-sm:flex-col items-start justify-start">
              <div className="flex flex-row gap-3 justify-start items-start">
                <FundsRaisedIcon className="w-6 h-6 max-w-6 max-h-[24px] min-w-6 min-h-[24px] text-black dark:text-zinc-100" />
                <p className="font-bold leading-normal text-black dark:text-zinc-100">
                  Total Funds Raised
                </p>
              </div>
              <p className="font-normal text-base leading-normal text-black dark:text-zinc-100">
                {project?.details?.data?.raisedMoney}
              </p>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
};
