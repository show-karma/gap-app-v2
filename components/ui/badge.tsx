import * as React from "react";
import { XMarkIcon } from "@heroicons/react/24/solid";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "outline";
  onRemove?: () => void;
}

export function Badge({
  className,
  variant = "default",
  children,
  onRemove,
  ...props
}: BadgeProps) {
  const variantClasses = {
    default: "bg-blue-100 text-blue-800 hover:bg-blue-200",
    secondary: "bg-gray-100 text-gray-800 hover:bg-gray-200",
    outline:
      "bg-transparent border border-gray-200 text-gray-800 hover:bg-gray-100",
  };

  return (
    <div
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors ${variantClasses[variant]} ${className}`}
      {...props}
    >
      {children}
      {onRemove && (
        <button
          type="button"
          className="ml-1 rounded-full p-0.5 text-gray-500 hover:bg-gray-200 hover:text-gray-700"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
        >
          <XMarkIcon className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}
