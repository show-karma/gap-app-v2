import { GrantsLayout } from "@/features/projects/components/grants/Layout";
import { ProjectGrantsLayoutLoading } from "@/features/projects/components/loading/Grants/Layout";
import { Suspense } from "react";

const Page = ({ children }: { children: React.ReactNode }) => {
  return (
    <Suspense
      fallback={
        <ProjectGrantsLayoutLoading>{children}</ProjectGrantsLayoutLoading>
      }
    >
      <GrantsLayout>{children}</GrantsLayout>
    </Suspense>
  );
};

export default Page;
