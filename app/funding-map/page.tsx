import { ProgramsExplorer } from "@/components/Pages/ProgramRegistry/ProgramsExplorer";
import { Suspense } from "react";
import { Spinner } from "@/components/Utilities/Spinner";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: `Karma GAP - Grant Program Aggregator`,
  description: `Find all the funding opportunities across web3 ecosystem.`,
};

const GrantProgramRegistry = () => {
  return (
    <Suspense fallback={<Spinner />}>
      <ProgramsExplorer />
    </Suspense>
  );
};

export default GrantProgramRegistry;
