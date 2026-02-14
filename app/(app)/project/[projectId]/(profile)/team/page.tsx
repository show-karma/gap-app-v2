"use client";

import dynamic from "next/dynamic";
import { TeamContentSkeleton } from "@/components/Pages/Project/v2/Skeletons";

const TeamContent = dynamic(
  () =>
    import("@/components/Pages/Project/v2/TeamContent/TeamContent").then((mod) => mod.TeamContent),
  {
    loading: () => <TeamContentSkeleton />,
  }
);

/**
 * Team page - displays the list of team members for the project.
 */
export default function TeamPage() {
  return <TeamContent />;
}
