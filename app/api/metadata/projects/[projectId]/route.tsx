/* eslint-disable @next/next/no-img-element */
import { gapIndexerApi } from "@/utilities/gapIndexerApi";
import { cleanMarkdownForPlainText } from "@/utilities/markdown";
import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import pluralize from "pluralize";
// App router includes @vercel/og.
// No need to install it.

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ projectId: string }> }
) {
  const projectId = (await context.params).projectId;
  let project = await gapIndexerApi
    .projectBySlug(projectId)
    .then((res) => res.data)
    .catch(() => null);
  if (!project) {
    return new Response("Not found", { status: 404 });
  }

  // project.details.data.title = "Rimuru Tempest Rimuru Tempest Rimuru Tempest";

  const title =
    project?.details?.data.title && project?.details?.data.title.length > 30
      ? project?.details?.data.title.substring(0, 30) + "..."
      : project?.details?.data.title;

  const description = cleanMarkdownForPlainText(
    project?.details?.data?.description || "",
    200
  );

  const milestonesCompleted = project.grants.reduce((acc, grant) => {
    return (
      acc + grant.milestones.filter((milestone) => milestone.completed).length
    );
  }, 0);

  const stats = [
    {
      title: pluralize("Grant", project?.grants.length || 0),
      value: project?.grants.length || 0,
      icon: "https://gap.karmahq.xyz/icons/funding-lg.png",
    },
    {
      title: `${pluralize("Milestone", milestonesCompleted || 0)} completed`,
      value: milestonesCompleted || 0,
      icon: "https://gap.karmahq.xyz/icons/impact.png",
    },
    {
      title: pluralize("Endorsement", project?.endorsements.length || 0),
      value: project?.endorsements.length || 0,
      icon: "https://gap.karmahq.xyz/icons/endorsements-lg.png",
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
            backgroundImage: `url(https://gap.karmahq.xyz/assets/previews/background.png)`,
          }}
        >
          <div tw="flex flex-col items-start justify-center mt-8 w-[520px]">
            <img
              alt="Karma GAP Logo"
              src="https://gap.karmahq.xyz/assets/previews/karma-gap-logo-glow.png"
              style={{
                width: 292,
                height: 50,
              }}
              width={292}
              height={50}
            />
            <span tw="text-white text-5xl font-extrabold font-body mt-8">
              {title}
            </span>
            <p tw="text-white text-2xl font-normal font-body mt-4 break-normal text-wrap whitespace-nowrap">
              {description}
            </p>
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
