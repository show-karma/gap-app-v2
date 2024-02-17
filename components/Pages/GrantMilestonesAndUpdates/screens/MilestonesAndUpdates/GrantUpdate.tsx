import { ReadMore, formatDate } from "@/utilities";
import type { FC } from "react";

interface UpdateTagProps {
  index: number;
}
const FlagIcon = () => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
    >
      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path>
      <line x1="4" x2="4" y1="22" y2="15"></line>
    </svg>
  );
};
const UpdateTag: FC<UpdateTagProps> = ({ index }) => {
  return (
    <div className="flex w-max flex-row gap-3 rounded-full  bg-[#F5F3FF] px-3 py-1 text-[#5720B7] dark:text-violet-100 dark:bg-purple-700">
      <FlagIcon />
      <p className="text-xs font-bold text-[#5720B7] dark:text-violet-100">
        UPDATE {index}
      </p>
    </div>
  );
};

interface GrantUpdateProps {
  title: string;
  description: string;
  index: number;
  date: Date | number;
}

export const GrantUpdate: FC<GrantUpdateProps> = ({
  title,
  description,
  index,
  date,
}) => {
  return (
    <div className="flex w-full flex-1 flex-col gap-4 rounded-lg border border-zinc-200 dark:bg-zinc-800 dark:border-zinc-700 bg-white p-4 transition-all duration-200 ease-in-out  max-sm:px-2">
      <div className="flex flex-row items-center justify-between">
        <UpdateTag index={index} />
        <p className="text-sm font-semibold text-gray-500 dark:text-zinc-300 max-sm:text-xs">
          Posted on {formatDate(date)}
        </p>
      </div>
      {title ? (
        <p className="text-lg font-semibold text-black dark:text-zinc-100 max-sm:text-base">
          {title}
        </p>
      ) : null}
      <div>
        <ReadMore
          readLessText="Read less update"
          readMoreText="Read full update"
        >
          {description}
        </ReadMore>
      </div>
    </div>
  );
};
