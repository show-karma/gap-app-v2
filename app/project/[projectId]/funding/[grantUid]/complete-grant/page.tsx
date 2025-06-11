"use client";
import { DefaultLoading } from "@/components/Utilities/DefaultLoading";
import { useProjectContext } from "@/contexts/ProjectContext";
import dynamic from "next/dynamic";

const GrantCompletion = dynamic(
  () =>
    import(
      "@/components/Pages/GrantMilestonesAndUpdates/screens/MilestonesAndUpdates/CompleteGrant"
    ).then((mod) => mod.GrantCompletion),
  {
    loading: () => <DefaultLoading />,
  }
);
export default function Page() {
  // Connect to project context for future use
  let contextProject = null;
  try {
    const contextData = useProjectContext();
    contextProject = contextData?.project;
  } catch {
    // Not within ProjectProvider context, contextProject remains null
  }
  
  return <GrantCompletion />;
}
