"use client";

import { NextStudio } from "next-sanity/studio";
import config from "@/sanity.config";

// Sanity Studio embed. Auth is Sanity's own project-member login (built
// into the Studio) — there is no app-level RBAC gate here. When
// `NEXT_PUBLIC_SANITY_PROJECT_ID` is unset (local dev/CI without Sanity
// configured), the Studio itself renders its own "connect a project"
// prompt rather than the route crashing.
export default function StudioPage() {
  return <NextStudio config={config} />;
}
