import { zeroUID } from "@/utilities/commons";
import { gapIndexerApi } from "@/utilities/gapIndexerApi";
import { defaultMetadata } from "@/utilities/meta";
import Image from "next/image";
import { notFound } from "next/navigation";
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
        <div className={"h-14 w-14 relative"}>
          <Image
            alt={community?.details?.data?.name || ""}
            src={community?.details?.data?.imageURL || ""}
            className={"rounded-full"}
            layout="fill"
          />
        </div>

        <div className="mt-3 text-3xl font-black text-white w-max flex flex-row gap-2">
          <span>{community ? community.details?.data?.name : ""}</span> Admin
        </div>
      </div>
      {children}
    </div>
  );
}
