import * as React from "react";
import { ReactNode } from "react";

interface Props {
  children: ReactNode;
}

const ProjectPage = () => {
  return <div>This is the Project&apos;s landing page</div>;
};

export const NestedLayout = ({ children }: Props) => {
  return <>{children}</>;
};

export const ProjectPageLayout = (page: any) => (
  <NestedLayout>{page}</NestedLayout>
);

ProjectPage.getLayout = ProjectPageLayout;

export default ProjectPage;
