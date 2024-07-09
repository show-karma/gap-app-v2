"use client";

import formatCurrency from "@/utilities/formatCurrency";
import { cn } from "@/utilities/tailwind";
import { ExclamationTriangleIcon } from "@heroicons/react/24/solid";
import Link from "next/link";
import { usePathname } from "next/navigation";

export const ProjectNavigator = ({
  tabs,
  hasContactInfo,
  grantsLength,
}: {
  tabs: { name: string; href: string }[];
  hasContactInfo: boolean;
  grantsLength: number;
}) => {
  const pathname = usePathname();
  return (
    <nav className="gap-10 flex flex-row w-full items-center max-lg:gap-8 overflow-x-auto">
      {tabs.map((tab) => (
        <Link
          key={tab.name}
          href={tab.href}
          className={cn(
            "whitespace-nowrap border-b-2 pb-2 text-base flex flex-row gap-2 items-center",
            tab.href.split("/")[3]?.split("?")[0] === pathname.split("/")[3]
              ? "border-blue-600 text-gray-700 font-bold px-0 dark:text-gray-200 max-lg:border-b-2"
              : "border-transparent text-gray-600  px-0 hover:border-gray-300 hover:text-gray-700 dark:text-gray-200 font-normal"
          )}
        >
          {tab.name}
          {tab.name === "Contact Info" && !hasContactInfo ? (
            <ExclamationTriangleIcon className="w-4 h-4 text-yellow-500" />
          ) : null}
          {tab.name === "Grants" && grantsLength ? (
            <p className="rounded-2xl bg-gray-200 px-2.5 py-[2px] text-center text-sm font-medium leading-tight text-slate-700 dark:bg-slate-700 dark:text-zinc-300">
              {formatCurrency(grantsLength || 0)}
            </p>
          ) : null}
        </Link>
      ))}
    </nav>
  );
};
