import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { KycSettingsPage } from "@/components/Pages/Admin/KycSettingsPage";
import { Spinner } from "@/components/Utilities/Spinner";
import { customMetadata } from "@/utilities/meta";
import { getCommunityDetails } from "@/utilities/queries/v2/community";

export const metadata: Metadata = customMetadata({
  title: "KYC/KYB Settings",
});

interface Props {
  params: Promise<{ communityId: string }>;
}

export default async function Page(props: Props) {
  const { communityId } = await props.params;
  const community = await getCommunityDetails(communityId);

  if (!community) {
    notFound();
  }

  return (
    <Suspense
      fallback={
        <div className="flex w-full items-center justify-center">
          <Spinner />
        </div>
      }
    >
      <KycSettingsPage community={community} />
    </Suspense>
  );
}
