import type { ReactNode } from "react";
import { cn } from "@/utilities/tailwind";

interface SectionContainerProps {
  children: ReactNode;
  className?: string;
  maxWidth?: "default" | "wide" | "full";
}

const maxWidthClasses = {
  default: "max-w-[1120px]",
  wide: "max-w-[1536px]",
  full: "max-w-full",
};

export function SectionContainer({
  children,
  className,
  maxWidth = "default",
}: SectionContainerProps) {
  return (
    <div className={cn(maxWidthClasses[maxWidth], "mx-auto w-full", className)}>{children}</div>
  );
}
