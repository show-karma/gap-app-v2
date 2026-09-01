import type { Metadata } from "next";
import MyProjects from "@/components/Pages/MyProjects";
import { customMetadata } from "@/utilities/meta";

export const metadata: Metadata = customMetadata({
  title: "My Projects",
  description:
    "Manage your projects on Karma. Track grants, update milestones, and build your project reputation.",
  path: "/my-projects",
  robots: { index: false, follow: true },
});

export default function Page() {
  return <MyProjects />;
}
