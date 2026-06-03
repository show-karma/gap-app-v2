"use client";
import { useSearchParams } from "next/navigation";
import type { FC } from "react";
import { OutputsAndOutcomes } from "@/components/Pages/Project/Impact/OutputsAndOutcomes";
import { useProjectAuthorization } from "@/hooks/useProjectAuthorization";
import { AddImpactScreen } from "./AddImpactScreen";

type ImpactComponentProps = {};

export const ImpactComponent: FC<ImpactComponentProps> = () => {
  const isAuthorized = useProjectAuthorization();

  const searchParams = useSearchParams();
  const grantScreen = searchParams?.get("tab");

  if (grantScreen === "add-impact" && isAuthorized) {
    return <AddImpactScreen />;
  }

  return (
    <section>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-black dark:text-white">Outputs and Outcomes</h2>
      </div>
      <div className="flex flex-col gap-4">
        <OutputsAndOutcomes />
      </div>
    </section>
  );
};
