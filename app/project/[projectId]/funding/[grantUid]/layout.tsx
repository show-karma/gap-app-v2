import { Suspense } from "react";
import { GrantsLayout } from "@/components/Pages/Project/Grants/Layout";
import { ProjectGrantsLayoutLoading } from "@/components/Pages/Project/Loading/Grants/Layout";

/**
 * Grant Detail Layout
 *
 * This layout wraps all grant detail pages with the GrantsLayout component,
 * which provides the grants sidebar navigation and manages grant state.
 */
const GrantDetailLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <Suspense fallback={<ProjectGrantsLayoutLoading>{children}</ProjectGrantsLayoutLoading>}>
      <GrantsLayout>{children}</GrantsLayout>
    </Suspense>
  );
};

export default GrantDetailLayout;
