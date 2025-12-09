import { CommunityAdminPage } from "@/components/Pages/Communities/CommunityAdminPage";
import { defaultMetadata } from "@/utilities/meta";

export const metadata = defaultMetadata;

interface Props {
  params: Promise<{ communityId: string }>;
}

export default async function Page(props: Props) {
  const { communityId } = await props.params;

  return <CommunityAdminPage communityId={communityId} />;
}
