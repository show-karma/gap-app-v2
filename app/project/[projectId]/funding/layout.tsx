import { GrantsLayout } from "@/components/Pages/Project/Grants/Layout";
import { Suspense } from "react";
import { ProjectGrantsLayoutLoading } from "@/components/Pages/Project/Loading/Grants/Layout";

const Page = ({ children }: { children: React.ReactNode }) => {
  return (
    <Suspense fallback={<ProjectGrantsLayoutLoading>{children}</ProjectGrantsLayoutLoading>}>
      <GrantsLayout>{children}</GrantsLayout>
    </Suspense>
  );
};

export default Page;
