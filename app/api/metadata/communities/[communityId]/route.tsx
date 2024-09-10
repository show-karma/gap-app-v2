/* eslint-disable @next/next/no-img-element */
import { gapIndexerApi } from "@/utilities/gapIndexerApi";
import { getProjectById } from "@/utilities/sdk";
import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
// App router includes @vercel/og.
// No need to install it.

export async function GET(
  request: NextRequest,
  context: { params: { communityId: string } }
) {
  const communityId = context.params.communityId;
  let community = await gapIndexerApi
    .communityBySlug(communityId)
    .then((res) => res.data)
    .catch(() => null);
  if (!community) {
    return new Response("Not found", { status: 404 });
  }
  const description =
    community?.details?.data.description &&
    community?.details?.data.description?.length > 270
      ? community?.details?.data.description.substring(0, 270) +
        "...  -- Read more on GAP"
      : community?.details?.data.description;
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "white",
        }}
      >
        <div tw="bg-white w-full h-full flex flex-col justify-start items-start">
          <div tw="flex flex-row gap-2 justify-between items-center w-full pl-4 pr-8">
            <img
              className="w-[360px] h-[80px]"
              src="https://gap.karmahq.xyz/logo/karma-gap-logo.svg"
              alt="Gap"
              width={360}
              height={80}
            />
            <div tw="flex flex-row gap-2 items-center mt-4 h-max">
              <div tw="flex flex-col mr-4 w-max h-max rounded border border-[#EAECf0] dark:border-zinc-600 border-l-[#155EEF] dark:border-l-[#155EEF] border-l-[4px] px-4 py-1 items-start">
                <p tw="text-black dark:text-zinc-300 dark:bg-zinc-800 text-4xl font-bold bg-[#EFF4FF] rounded-lg px-2 py-1 flex justify-center items-center min-w-[40px] w-max h-[40px]">
                  {community?.grants.length || 0}
                </p>
                <div tw="flex flex-row items-center h-[40px]">
                  <p tw="font-normal text-[#344054] text-3xl mr-2 h-max">
                    Grants
                  </p>
                  <img
                    src={"https://gap.karmahq.xyz/icons/funding.png"}
                    alt="Grants"
                    width={20}
                    height={20}
                  />
                </div>
              </div>
            </div>
          </div>
          <div tw="flex flex-col gap-2 items-start justify-center px-8 mt-8">
            {/* <img
              src={community?.details?.data?.imageURL}
              alt="Grants"
              width={160}
              height={160}
              tw="rounded-full h-40 w-40"
            /> */}
            <span tw="text-7xl font-bold line-clamp-1">
              {community?.details?.data.name}
              img: {community?.details?.data?.imageURL}
            </span>
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
