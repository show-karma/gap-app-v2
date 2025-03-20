import { cn } from "@/utilities/tailwind";
import React from "react";

interface Props {
  className?: string;
}

export const TwitterIcon = ({ className }: Props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 30 30"
    width="30px"
    height="30px"
    className={cn(className)}
    fill="currentColor"
  >
    <path d="M26.37,26l-8.795-12.822l0.015,0.012L25.52,4h-2.65l-6.46,7.48L11.28,4H4.33l8.211,11.971L12.54,15.97L3.88,26h2.65 l7.182-8.322L19.42,26H26.37z M10.23,6l12.34,18h-2.1L8.12,6H10.23z" />
  </svg>
);
