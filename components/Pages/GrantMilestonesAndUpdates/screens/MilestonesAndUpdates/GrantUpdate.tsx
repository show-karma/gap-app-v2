import { ReadMore, formatDate } from "@/utilities";
import { FlagIcon } from "@heroicons/react/24/outline";
import type { FC } from "react";

interface UpdateTagProps {
  index: number;
}
const UpdateTag: FC<UpdateTagProps> = ({ index }) => {
  return (
    <div className="flex w-max flex-row gap-3 rounded-full bg-blue-50 px-3 py-1 text-violet-800 dark:text-violet-200 dark:bg-purple-700">
      <FlagIcon className="h-4 w-4" />
      <p className="text-xs font-bold text-violet-800">UPDATE {index}</p>
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
