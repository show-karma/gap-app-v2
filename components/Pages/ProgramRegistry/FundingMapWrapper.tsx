"use client";
import { LoadingPrograms } from "@/components/Pages/ProgramRegistry/Loading/Programs";
import dynamic from "next/dynamic";

const ProgramsExplorer = dynamic(
  () =>
    import("@/components/Pages/ProgramRegistry/ProgramsExplorer").then(
      (mod) => mod.ProgramsExplorer
    ),
  {
    loading: () => <LoadingPrograms />,
  }
);
export const FundingMapWrapper = () => {
  return <ProgramsExplorer />;
};
