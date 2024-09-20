import dynamic from "next/dynamic";

import { Metadata } from "next";
import { LoadingPrograms } from "@/components/Pages/ProgramRegistry/Loading/Programs";

export const metadata: Metadata = {
  title: `Karma GAP - Grant Program Aggregator`,
  description: `Find all the funding opportunities across web3 ecosystem.`,
};

const ProgramsExplorer = dynamic(
  () =>
    import("@/components/Pages/ProgramRegistry/ProgramsExplorer").then(
      (mod) => mod.ProgramsExplorer
    ),
  {
    loading: () => <LoadingPrograms />,
  }
);

const GrantProgramRegistry = () => {
  return <ProgramsExplorer />;
};

export default GrantProgramRegistry;
