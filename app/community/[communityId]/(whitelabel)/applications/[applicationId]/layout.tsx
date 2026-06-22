import type { ReactNode } from "react";
import { ApplicationViewBoundary } from "./components/ApplicationViewBoundary";

interface LayoutProps {
  children: ReactNode;
}

/**
 * Layout for individual application pages.
 * Provides the community-scoped context for application detail/edit pages.
 *
 * The view subtree is wrapped in {@link ApplicationViewBoundary} so a transient
 * React 19 streaming/Suspense-resume reconciliation crash (triggered by browser
 * translation/extensions mutating React-owned DOM) recovers the subtree instead
 * of throwing an uncaught top-level error.
 */
export default function ApplicationLayout({ children }: LayoutProps) {
  return <ApplicationViewBoundary>{children}</ApplicationViewBoundary>;
}
