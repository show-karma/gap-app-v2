import { redirect } from "next/navigation";
import { PAGES } from "@/utilities/pages";

export default function Page({ params }: { params: { projectId: string } }) {
  // Redirect users from the updates page to the roadmap page
  redirect(PAGES.PROJECT.ROADMAP.ROOT(params.projectId));
}
