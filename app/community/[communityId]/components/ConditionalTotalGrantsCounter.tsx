"use client";

import { TotalGrantsCounter } from "@/components/TotalGrantsCounter";
import { usePathname, useSearchParams } from "next/navigation";

type Props = {
  position: "header" | "content";
  overrideGrantsNo?: string;
  overrideProjectsNo?: string;
};

export const ConditionalTotalGrantsCounter = ({
  position,
  overrideGrantsNo,
  overrideProjectsNo,
}: Props) => {
  const searchParams = useSearchParams();
  const programId = searchParams.get("programId");
  const pathname = usePathname();
  const isImpactPage = pathname.includes("/impact");

  if (isImpactPage) {
    return <TotalGrantsCounter />;
  }

  // Show in header only if no programId
  if (position === "header" && programId) return null;

  // Show in content only if programId exists
  if (position === "content" && !programId) return null;

  return (
    <TotalGrantsCounter
      overrideGrantsNo={overrideGrantsNo}
      overrideProjectsNo={overrideProjectsNo}
    />
  );
};
