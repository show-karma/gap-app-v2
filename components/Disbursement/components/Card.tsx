import type React from "react";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  titleIcon?: React.ReactNode;
  titleEmoji?: string;
}

interface CardHeaderProps {
  title: string;
  icon?: React.ReactNode;
  emoji?: string;
}

const CardHeader: React.FC<CardHeaderProps> = ({ title, icon, emoji }) => (
  <div className="flex items-center mb-6">
    {icon && <div className="bg-indigo-100 dark:bg-indigo-900 rounded-lg p-2 mr-3">{icon}</div>}
    <h2 className="text-xl font-semibold text-gray-900 dark:text-zinc-100">
      {emoji && `${emoji} `}
      {title}
    </h2>
  </div>
);

export const Card: React.FC<CardProps> = ({
  children,
  className = "",
  title,
  titleIcon,
  titleEmoji,
}) => {
  return (
    <div
      className={`bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-gray-200 dark:border-zinc-700 p-6 ${className}`}
    >
      {title && <CardHeader title={title} icon={titleIcon} emoji={titleEmoji} />}
      {children}
    </div>
  );
};
