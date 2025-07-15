/* eslint-disable @next/next/no-img-element */
import { defaultMetadata } from "@/utilities/meta";

import CommunitiesToAdminPage from "@/features/admin/components/CommunityAdmin";

export const metadata = defaultMetadata;

export default function Page() {
  return <CommunitiesToAdminPage />;
}
