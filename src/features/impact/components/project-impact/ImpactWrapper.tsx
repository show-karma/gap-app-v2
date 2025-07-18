"use client";

import { OutputsAndOutcomesLoading } from "@/src/features/projects/components/loading/OutputsAndOutcomes";
import dynamic from "next/dynamic";

const ImpactComponent = dynamic(
  () =>
    import("@/components/Pages/Project/Impact").then(
      (mod) => mod.ImpactComponent
    ),
  {
    loading: () => <OutputsAndOutcomesLoading />,
  }
);
const ImpactWrapper = () => {
  return (
    <div className="pt-5 pb-20">
      <ImpactComponent />
    </div>
  );
};

export default ImpactWrapper;
