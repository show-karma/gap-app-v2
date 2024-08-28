import { DefaultLoading } from "@/components/Utilities/DefaultLoading";
import dynamic from "next/dynamic";

const ProjectPage = dynamic(
  () => import("@/components/Pages/Project/ProjectPage"),
  {
    loading: () => <DefaultLoading />,
  }
);

const ProjectPageIndex = () => {
  return <ProjectPage />;
};

export default ProjectPageIndex;
