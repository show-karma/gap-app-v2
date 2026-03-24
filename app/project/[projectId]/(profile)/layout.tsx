import type { ReactNode } from "react";
import { ProfileLayoutClient } from "./ProfileLayoutClient";

interface ProfileLayoutProps {
  children: ReactNode;
}

/**
 * Shared layout for the main project profile pages (updates, about, funding, impact, team).
 * This layout provides the consistent header, sidebar, and tab navigation.
 *
 * This is a server component wrapper that delegates rendering to the client-side
 * ProfileLayoutClient component. Sub-page metadata is handled by each individual page.
 */
export default function ProfileLayout({ children }: ProfileLayoutProps) {
  return <ProfileLayoutClient>{children}</ProfileLayoutClient>;
}
