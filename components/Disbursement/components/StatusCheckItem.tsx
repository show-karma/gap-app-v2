import type React from "react";

type CheckStatus = boolean | null;

interface StatusCheckItemProps {
  status: CheckStatus;
  title: string;
  successMessage: string;
  failureMessage: string;
  pendingMessage: string;
  icon: string; // Emoji icon for the check type
}

const getStatusConfig = (status: CheckStatus) => {
  if (status === true) {
    return {
      bgColor: "bg-green-50 dark:bg-green-950",
      borderColor: "border-green-200 dark:border-green-800",
      textColor: "text-green-700 dark:text-green-400",
      statusIcon: "✅",
    };
  } else if (status === false) {
    return {
      bgColor: "bg-red-50 dark:bg-red-950",
      borderColor: "border-red-200 dark:border-red-800",
      textColor: "text-red-700 dark:text-red-400",
      statusIcon: "❌",
    };
  } else {
    return {
      bgColor: "bg-gray-50 dark:bg-zinc-800",
      borderColor: "border-gray-200 dark:border-zinc-700",
      textColor: "text-gray-600 dark:text-zinc-400",
      statusIcon: "⏳",
    };
  }
};

export const StatusCheckItem: React.FC<StatusCheckItemProps> = ({
  status,
  title,
  successMessage,
  failureMessage,
  pendingMessage,
  icon,
}) => {
  const config = getStatusConfig(status);

  const getMessage = () => {
    if (status === true) return successMessage;
    if (status === false) return failureMessage;
    return pendingMessage;
  };

  return (
    <div
      className={`flex items-center p-3 rounded-lg border ${config.bgColor} ${config.borderColor} ${config.textColor}`}
    >
      <span className="text-lg mr-3">{config.statusIcon}</span>
      <div>
        <div className="font-medium">
          {icon} {title}
        </div>
        <div className="text-sm">{getMessage()}</div>
      </div>
    </div>
  );
};
