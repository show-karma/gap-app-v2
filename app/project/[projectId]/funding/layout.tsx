import { GrantsLayout } from "@/features/projects/components/Grants/Layout";
import { Suspense } from "react";
import { ProjectGrantsLayoutLoading } from "@/features/projects/components/Loading/Grants/Layout";

const Page = ({ children }: { children: React.ReactNode }) => {
  return (
    <Suspense fallback={<ProjectGrantsLayoutLoading>{children}</ProjectGrantsLayoutLoading>}>
      <GrantsLayout>{children}</GrantsLayout>
    </Suspense>
  );
};

export default Page;
