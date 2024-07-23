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
    <Suspense
      fallback={
        <div className="flex h-screen w-full items-center justify-center">
          <Spinner />
        </div>
      }
    >
      <ProgramsExplorer />
    </Suspense>
  );
};

export default GrantProgramRegistry;
