import { cn } from "@/utilities/tailwind";
import Image from "next/image";

interface ActivityStatusProps {
  type: string;
  completed?: boolean;
  className?: string;
}

export const ActivityStatus = ({
  type,
  completed,
  className,
}: ActivityStatusProps) => {
  const getStatusColor = (label: string) => {
    switch (label) {
      case "ProjectUpdate":
        return "bg-[#EFF4FF] text-black dark:bg-[#EFF4FF] dark:text-black";
      case "GrantUpdate":
        return "bg-[#DCFAE6] text-black dark:bg-[#DCFAE6] dark:text-black";
      case "ProjectImpact":
        return "bg-[#FBE8FF] text-black dark:bg-[#FBE8FF] dark:text-black";
      case "Milestone":
      case "ProjectMilestone":
        return "bg-[#FFEFE0] text-black dark:bg-[#FFEFE0] dark:text-black";
      default:
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300";
    }
  };

  const getStatusIcon = (label: string) => {
    switch (label) {
      case "ProjectUpdate":
        return "/icons/activity.svg";
      case "GrantUpdate":
        return "/icons/grant-update.svg";
      case "ProjectImpact":
        return "/icons/project-impact.svg";
      case "Milestone":
      case "ProjectMilestone":
        return "/icons/milestone.svg";
      default:
        return "/icons/project-update.svg";
    }
  };

  const getStatusText = () => {
    const labelDictionary = {
      ProjectUpdate: "Project Activity",
      GrantUpdate: "Grant Update",
      Milestone: "Milestone",
      ProjectMilestone: "Milestone",
      ProjectImpact: "Project Impact",
    };
    return labelDictionary[type as keyof typeof labelDictionary] || "UPDATE";
  };

  // For milestones, handle completion status differently
  if (type === "Milestone" && completed !== undefined) {
    const getCompletionStatusColor = () => {
      if (completed) return "text-[#067647] bg-[#ECFDF3]";
      return "bg-[#FFFAEB] text-[#B54708] dark:bg-[#FFFAEB]/10 dark:text-orange-100";
    };

    const getCompletionStatusText = () => {
      return completed ? "Completed" : "Pending";
    };

    return (
      <p
        className={cn(
          "px-3 py-1 rounded-[4px] text-xs font-semibold",
          getCompletionStatusColor(),
          className
        )}
      >
        {getCompletionStatusText()}
      </p>
    );
  }

  return (
    <span
      className={cn(
        "px-3 py-1.5 rounded-full text-sm w-max flex flex-row gap-2 font-semibold items-center",
        getStatusColor(type),
        className
      )}
    >
      <Image
        src={getStatusIcon(type)}
        alt={getStatusText()}
        width={20}
        height={20}
      />
      {getStatusText()}
    </span>
  );
};
