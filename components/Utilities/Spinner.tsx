import { cn } from "@/utilities";
import { FC } from "react";

interface SpinnerProps {
  className?: string;
}

export const Spinner: FC<SpinnerProps> = ({ className = "" }) => (
  <div
    className={cn(
      "h-16 w-16 animate-spin rounded-full border-4 border-dashed border-blue-300 dark:border-violet-400",
      className
    )}
  />
);
