import type { ReactNode } from "react";

interface LayoutProps {
  children: ReactNode;
}

/**
 * Layout for individual application pages.
 * Provides the community-scoped context for application detail/edit pages.
 */
export default function ApplicationLayout({ children }: LayoutProps) {
  return <>{children}</>;
}
