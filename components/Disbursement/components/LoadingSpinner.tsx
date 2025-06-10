import React from "react";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  color?: "blue" | "white" | "gray";
  message?: string;
}

const sizeClasses = {
  sm: "h-4 w-4",
  md: "h-6 w-6",
  lg: "h-8 w-8",
};

const colorClasses = {
  blue: "border-blue-600",
  white: "border-white",
  gray: "border-gray-600",
};

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = "md",
  color = "blue",
  message,
}) => {
  const spinnerClasses = `animate-spin rounded-full border-b-2 ${sizeClasses[size]} ${colorClasses[color]}`;

  if (message) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className={`${spinnerClasses} mr-3`}></div>
        <span
          className={`font-medium ${
            color === "white" ? "text-white" : `text-${color}-600`
          }`}
        >
          {message}
        </span>
      </div>
    );
  }

  return <div className={spinnerClasses}></div>;
};
