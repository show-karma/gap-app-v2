/* eslint-disable @next/next/no-img-element */
import CommunitiesToAdminPage from "@/features/admin/components/community-admin/CommunityAdmin";
import { defaultMetadata } from "@/lib/metadata/meta";

export const metadata = defaultMetadata;

export default function Page() {
  return <CommunitiesToAdminPage />;
}
