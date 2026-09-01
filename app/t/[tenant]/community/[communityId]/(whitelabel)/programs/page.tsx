import { redirect } from "next/navigation";

export default async function ProgramsRedirectPage({
  params,
}: {
  params: Promise<{ communityId: string }>;
}) {
  const { communityId } = await params;
  redirect(`/community/${communityId}/funding-opportunities`);
}
