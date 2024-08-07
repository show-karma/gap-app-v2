import { cn } from "@/utilities/tailwind";
import React from "react";

interface SkeletonProps {
  className?: string;
  animation?: "pulse" | "wave" | "none";
}

export function Skeleton({
  className = "",
  animation = "pulse",
}: SkeletonProps) {
  const baseClasses = "bg-gray-200 dark:bg-gray-700 h-4 w-full rounded";
  const animationClasses = {
    pulse: "animate-pulse",
    wave: "animate-shimmer",
    none: "",
  };

  return (
    <div className={cn(baseClasses, animationClasses[animation], className)} />
  );
}
