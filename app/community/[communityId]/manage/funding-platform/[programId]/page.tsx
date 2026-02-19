import { redirect } from "next/navigation";
import { PAGES } from "@/utilities/pages";

export default function ProgramIdPage({
  params,
}: {
  params: { communityId: string; programId: string };
}) {
  redirect(PAGES.MANAGE.FUNDING_PLATFORM.QUESTION_BUILDER(params.communityId, params.programId));
}
