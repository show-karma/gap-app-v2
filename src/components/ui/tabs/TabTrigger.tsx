import { ReactNode } from "react";
import { cn } from "@/utilities/tailwind";

import { Button } from "../button";
import { useTabsContext } from "./Tabs";

type TabTriggerProps = {
  value: string;
  className?: string;
  disabled?: boolean;
  icon?: ReactNode;
  children: ReactNode;
};

export const TabTrigger = ({
  value,
  className,
  icon,
  children,
  disabled = false,
}: TabTriggerProps) => {
  const { activeTab, setActiveTab } = useTabsContext();

  const isActive = activeTab === value;

  return (
    <Button
      disabled={disabled}
      className={cn(
        "flex flex-row my-0.5 items-center gap-2 bg-transparent px-2 py-1 font-medium text-black hover:bg-white hover:text-black max-sm:text-sm",
        isActive
          ? "text-black bg-white dark:bg-zinc-600 dark:text-white"
          : "text-gray-500",
        className
      )}
      onClick={() => setActiveTab(value)}
    >
      {children}
      {icon ? (
        <p
          className={cn(
            "rounded-full px-2.5",
            isActive ? "text-[#155EEF] bg-[#F2F4F7]" : "text-[#667085]"
          )}
        >
          {icon}
        </p>
      ) : null}
    </Button>
  );
};
