/* eslint-disable @next/next/no-img-element */

import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";
import pluralize from "pluralize";
import { PROJECT_NAME } from "@/constants/brand";
import { getProjectGrants } from "@/services/project-grants.service";
import { cleanMarkdownForPlainText } from "@/utilities/markdown";
import { getProjectCachedData } from "@/utilities/queries/getProjectCachedData";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ projectId: string }> }
) {
  const projectId = (await context.params).projectId;
  const [project, grants] = await Promise.all([
    getProjectCachedData(projectId),
    getProjectGrants(projectId),
  ]);
  if (!project) {
    return new Response("Not found", { status: 404 });
  }

  const projectTitle = project?.details?.title || "";
  const title =
    projectTitle && projectTitle.length > 30 ? projectTitle.substring(0, 30) + "..." : projectTitle;

  const description = cleanMarkdownForPlainText(project?.details?.description || "", 200);

  const milestonesCompleted = grants.reduce((acc, grant) => {
    return acc + (grant.milestones?.filter((milestone) => milestone.completed)?.length ?? 0);
  }, 0);

  const stats = [
    {
      title: pluralize("Grant", grants.length),
      value: grants.length,
      icon: "https://karmahq.xyz/icons/funding-lg.png",
    },
    {
      title: `${pluralize("Milestone", milestonesCompleted || 0)} completed`,
      value: milestonesCompleted || 0,
      icon: "https://karmahq.xyz/icons/impact.png",
    },
    {
      title: pluralize("Endorsement", project?.endorsements?.length || 0),
      value: project?.endorsements?.length || 0,
      icon: "https://karmahq.xyz/icons/endorsements-lg.png",
    },
  ];

  return new ImageResponse(
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
        <div tw="flex flex-col items-start justify-center mt-8 w-[520px] pb-[80px]">
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
          <span tw="text-white text-5xl font-extrabold font-body mt-8">{title}</span>
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
                <p tw="font-normal text-brand-gray text-[26px] h-max mr-3">{item.title}</p>
                <img src={item.icon} alt={item.title} width={35} height={35} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>,
    {
      width: 1200,
      height: 630,
    }
  );
}
