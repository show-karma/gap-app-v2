"use client";

import dynamic from "next/dynamic";
import { OutputsAndOutcomesLoading } from "../Loading/OutputsAndOutcomes";

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
