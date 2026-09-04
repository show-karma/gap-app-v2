import { redirect } from "next/navigation";
import { PAGES } from "@/utilities/pages";

export default async function ProgramIdPage({
  params,
}: {
  params: Promise<{ communityId: string; programId: string }>;
}) {
  const { communityId, programId } = await params;
  redirect(PAGES.MANAGE.FUNDING_PLATFORM.QUESTION_BUILDER(communityId, programId));
}
