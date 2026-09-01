import { redirect } from "next/navigation";

// /applications → /dashboard
// Primary redirect handled by middleware. This is a fallback for direct access.
export default async function UserApplicationsPage() {
  redirect("/dashboard");
}
