import roundNumberWithPlus from "@/utilities/roundNumberWithPlus";

interface StatsCardProps {
  title: string;
  value: string | number;
  shouldRound?: boolean;
}

export const StatsCard = ({ title, value, shouldRound = false }: StatsCardProps) => {
  return (
    <div className="flex flex-col items-center h-[112px] justify-center p-5 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-sm shadow-sm">
      <div className="text-4xl font-semibold text-black dark:text-white">
        {roundNumberWithPlus(value, shouldRound)}
      </div>
      <div className="text-lg font-semibold text-black dark:text-white text-center">{title}</div>
    </div>
  );
};
