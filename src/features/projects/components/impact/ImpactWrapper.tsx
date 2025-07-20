"use client";

import dynamic from "next/dynamic";
import { OutputsAndOutcomesLoading } from "../loading/OutputsAndOutcomes";

const ImpactComponent = dynamic(
  () =>
    import("@/features/projects/components/impact").then(
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
