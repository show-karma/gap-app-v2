import { Skeleton } from "@/components/Utilities/Skeleton";
import { cn } from "@/lib/utils/cn";

const headClasses =
  "text-black dark:text-white text-xs font-medium uppercase text-left px-6 py-3 font-body";
const cellClasses =
  "py-4 border-t border-t-black dark:border-t-white pr-6 px-6 max-w-[420px] max-sm:min-w-[200px]";

const SkeletonRow = () => {
  return (
    <tr className="">
      <td className="pr-2">
        <p className="w-36 max-w-max text-gray-500 text-sm font-medium ">
          <Skeleton className="w-36 h-4" />
        </p>
      </td>
      <td className="pr-2 max-sm:pr-2 border-l border-l-zinc-400" />
      <td className={cellClasses}>
        <Skeleton className="w-full h-4" />
      </td>
      <td className={cellClasses}>
        <Skeleton className="w-full h-4" />
      </td>
      <td className={cellClasses}>
        <Skeleton className="w-full h-4" />
      </td>
      <td className={cn(cellClasses, "px-3")}>
        <Skeleton className="w-full h-4" />
      </td>
    </tr>
  );
};

export const ProjectImpactLoading = () => {
  const emptyArray = Array.from({ length: 5 }, (_, index) => index);
  return (
    <table className="overflow-x-auto w-full">
      <thead>
        <tr>
          <th className={cn(headClasses, "pr-8 w-36")}></th>
          <th className={cn(headClasses, "w-20")}></th>
          <th className={cn("", headClasses)}>Work</th>
          <th className={cn("", headClasses)}>Impact</th>
          <th className={cn("", headClasses)}>Proof</th>
          <th className={cn("", headClasses)}>Verifications</th>
        </tr>
      </thead>
      <tbody className="">
        {emptyArray.map((item, index) => (
          <SkeletonRow key={index} />
        ))}
      </tbody>
    </table>
  );
};
