"use client";
import { useOwnerStore, useProjectStore } from "@/store";
import { useSearchParams } from "next/navigation";
import { FC } from "react";
import { AddImpactScreen } from "./AddImpactScreen";
import { OutputsAndOutcomes } from "@/components/Pages/Project/Impact/OutputsAndOutcomes";

interface ImpactComponentProps {}

export const ImpactComponent: FC<ImpactComponentProps> = () => {
  const isOwner = useOwnerStore((state) => state.isOwner);
  const isProjectAdmin = useProjectStore((state) => state.isProjectAdmin);
  const isAuthorized = isOwner || isProjectAdmin;

  const searchParams = useSearchParams();
  const grantScreen = searchParams?.get("tab");

  if (grantScreen === "add-impact" && isAuthorized) {
    return <AddImpactScreen />;
  }

  return (
    <section>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-black dark:text-white">
          Outputs and Outcomes
        </h2>
      </div>
      <div className="flex flex-col gap-4">
        <OutputsAndOutcomes />
      </div>
    </section>
  );
};
