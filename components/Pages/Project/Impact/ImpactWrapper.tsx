"use client";

import dynamic from "next/dynamic";
import { ProjectImpactLoading } from "../Loading/Impact";

const ImpactComponent = dynamic(
  () =>
    import("@/components/Pages/Project/Impact").then(
      (mod) => mod.ImpactComponent
    ),
  {
    loading: () => <ProjectImpactLoading />,
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
