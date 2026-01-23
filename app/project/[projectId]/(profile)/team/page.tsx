"use client";

import dynamic from "next/dynamic";

const TeamContent = dynamic(
  () =>
    import("@/components/Pages/Project/v2/TeamContent/TeamContent").then((mod) => mod.TeamContent),
  {
    loading: () => <div className="animate-pulse text-gray-500">Loading team...</div>,
  }
);

/**
 * Team page - displays the list of team members for the project.
 */
export default function TeamPage() {
  return <TeamContent />;
}
