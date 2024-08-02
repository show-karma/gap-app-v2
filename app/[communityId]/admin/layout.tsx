import { defaultMetadata } from "@/utilities/meta";
import { notFound } from "next/navigation";
import { zeroUID } from "@/utilities/commons";
import { gapIndexerApi } from "@/utilities/gapIndexerApi";
import { cn } from "@/utilities/tailwind";

export const metadata = defaultMetadata;

interface Props {
  params: { communityId: string };
  children: React.ReactNode;
}

export default async function AdminLayout({ children, params }: Props) {
  const communityId = params.communityId;
  const { data: community } = await gapIndexerApi
    .communityBySlug(communityId)
    .catch(() => {
      notFound();
    });
  if (!community || community?.uid === zeroUID) {
    notFound();
  }
  return (
    <div className="px-4 sm:px-6 lg:px-12 py-5">
      <div className="py-8 rounded-xl bg-black border border-primary-800 text-center flex flex-col gap-2 justify-center w-full items-center">
        <div className="flex justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text */}
          <img
            src={community?.details?.data.imageURL}
            className={cn("h-14 w-14 rounded-full")}
          />
        </div>

        <div className="mt-3 text-3xl font-black text-white w-max flex flex-row gap-2">
          <span>{community ? community.details?.data.name : ""}</span> Admin
        </div>
      </div>
      {children}
    </div>
  );
}
