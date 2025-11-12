/* eslint-disable @next/next/no-img-element */
import { gapIndexerApi } from "@/utilities/gapIndexerApi";
import { getTotalProjects } from "@/utilities/karma/totalProjects";
import { getGrants, getProjectById } from "@/utilities/sdk";
import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import pluralize from "pluralize";
import { PROJECT_NAME } from "@/constants/brand";
// App router includes @vercel/og.
// No need to install it.

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ communityId: string }> }
) {
  const communityId = (await context.params).communityId;
  const [community, grantsData, projects] = await Promise.all([
    gapIndexerApi
      .communityBySlug(communityId)
      .then((res) => res.data)
      .catch(() => null),
    getGrants(
      communityId as `0x${string}`,
      {
        sortBy: "recent",
        status: "all",
        categories: [],
      },
      {
        page: 1,
        pageLimit: 1,
      }
    ),
    getTotalProjects(communityId),
  ]);

  if (!community) {
    return new Response("Not found", { status: 404 });
  }

  const grants = grantsData.pageInfo?.totalItems || 0;

  const stats = [
    {
      title: pluralize("Grant", grants),
      value: grants || 0,
      icon: "https://karmahq.xyz/icons/funding-lg.png",
    },
    {
      title: pluralize("Project", projects),
      value: projects || 0,
      icon: "https://karmahq.xyz/icons/projects.png",
    },
  ];

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
        <div
          tw="bg-white w-full h-full flex flex-row justify-between items-center pr-[42px] pl-[68px]"
          style={{
            backgroundImage: `url(https://karmahq.xyz/assets/previews/background.png)`,
          }}
        >
          <div tw="flex flex-col items-start justify-start w-[520px] pb-[40px]">
            {community?.details?.data.imageURL ? (
              <img
                alt={community?.details?.data.name}
                src={community?.details?.data.imageURL}
                width={120}
                height={120}
                tw="rounded-full object-contain"
                style={{
                  objectFit: "contain",
                }}
              />
            ) : null}
            <span tw="text-white text-5xl font-extrabold font-body w-full text-start flex flex-col items-start justify-start mt-10 mb-1">
              {community?.details?.data.name}
            </span>
            <p tw="text-white text-2xl font-normal font-body mt-4 break-normal text-wrap whitespace-nowrap">
              {`Discover how ${community?.details?.data.name} is fueling innovation: ${projects}+ projects supported through grants!`}
            </p>
            <div tw="flex flex-row items-center justify-end w-full pr-[80px]">
              <img
                alt={`${PROJECT_NAME} Logo`}
                src="https://karmahq.xyz/logo/karma-logo-dark.svg"
                style={{
                  width: 158,
                  height: 40,
                }}
                width={158}
                height={40}
              />
            </div>
          </div>
          <div tw="flex flex-col w-[360px]">
            {stats.map((item, index) => (
              <div
                key={item.title}
                style={{
                  marginBottom: index === stats.length - 1 ? 0 : 20,
                }}
                tw="flex flex-col w-full h-max bg-[#FFFFFF] rounded-tl-none rounded-bl-none rounded-tr-lg rounded-br-lg border border-[#EAECf0] dark:border-zinc-600 border-l-[#155EEF] border-l-[6px] px-6 py-6 items-start"
              >
                <p tw="text-black text-4xl font-bold bg-[#EFF4FF] rounded-lg px-4 py-2 flex justify-center items-center min-w-[40px] w-max h-[50px]">
                  {item.value}
                </p>
                <div tw="flex flex-row items-center h-[40px]">
                  <p tw="font-normal text-brand-gray text-[26px] h-max mr-3">
                    {item.title}
                  </p>
                  <img
                    src={item.icon}
                    alt={item.title}
                    width={35}
                    height={35}
                  />
                </div>
              </div>
            ))}
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
