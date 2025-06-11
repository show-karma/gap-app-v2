"use client";
import { DefaultLoading } from "@/components/Utilities/DefaultLoading";
import { useGrantStore } from "@/store/grant";
import { useProjectContext } from "@/contexts/ProjectContext";
import dynamic from "next/dynamic";

const NewGrant = dynamic(
  () =>
    import(
      "@/components/Pages/GrantMilestonesAndUpdates/screens/NewGrant"
    ).then((mod) => mod.NewGrant),
  {
    loading: () => <DefaultLoading />,
  }
);
export default function Page() {
  const { grant } = useGrantStore();
  
  // Connect to project context for future use
  let contextProject = null;
  try {
    const contextData = useProjectContext();
    contextProject = contextData?.project;
  } catch {
    // Not within ProjectProvider context, contextProject remains null
  }
  
  return <NewGrant grantToEdit={grant} />;
}
