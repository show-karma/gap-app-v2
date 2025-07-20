"use client";
import dynamic from "next/dynamic";
import { LoadingPrograms } from "./Loading/Programs";

const ProgramsExplorer = dynamic(
  () =>
    import("@/features/program-registry/components/ProgramsExplorer").then(
      (mod) => mod.ProgramsExplorer
    ),
  {
    loading: () => <LoadingPrograms />,
  }
);
export const FundingMapWrapper = () => {
  return <ProgramsExplorer />;
};
