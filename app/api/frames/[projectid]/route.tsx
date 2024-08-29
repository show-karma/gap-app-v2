import { Button } from "frames.js/next/pages-router/server";
import { envVars } from "@/utilities/enviromentVars";
import { frames } from "@/utilities/frames";

const handleRequest = frames(async (ctx) => {
  const url = new URL(ctx.request.url);
  const urlSafeBase64ProjectInfo = url.searchParams.get(
    "projectInfo"
  ) as string;
  const projectId = url.pathname.split("/").pop();

  if (ctx.message?.transactionId) {
    let txHash = ctx.message?.transactionId;

    return {
      image: (
        <div tw="bg-zinc-100 text-zinc-900 w-full h-full text-center justify-center items-center flex flex-col">
          <div tw="flex mb-2">
            <img
              src="https://gap.karmahq.xyz/logo/karma-gap-logo.svg"
              alt=""
              width={550}
              height={135}
            />
          </div>
          <div tw="flex font-bold">
            Donation to {projectId} has been successful.
          </div>
          <div tw="flex">An endorsement attestation has been issued.</div>
          <div tw="mt-2 text-3xl flex">
            Tx: {txHash.slice(0, 8)}...{txHash.slice(-8)}
          </div>
        </div>
      ),
      imageOptions: {
        aspectRatio: "1.91:1",
      },
      buttons: [
        <Button
          key={1}
          action="link"
          target={`https://www.onceupon.gg/tx/${txHash}`}
        >
          View Tx
        </Button>,
        <Button
          key={2}
          action="link"
          target={`${envVars.VERCEL_URL}/project/${projectId}`}
        >
          View on GAP
        </Button>,
      ],
    };
  } else {
    // Get project info from URL query params - base64 decode
    const projectInfo = JSON.parse(
      Buffer.from(
        decodeURIComponent(urlSafeBase64ProjectInfo) as string,
        "base64"
      ).toString()
    );

    return {
      image: (
        <div tw="flex flex-col justify-between items-between px-15">
          <div tw="flex flex-row justify-between items-start pb-5">
            <div tw="flex flex-col">
              <img
                src="https://gap.karmahq.xyz/logo/karma-gap-logo.svg"
                alt="logo"
                tw="mt-2"
                width={400}
                height={100}
              />
            </div>
            <div tw="flex flex-row items-start justify-between p-2 ">
              <div tw="flex flex-col items-end border-r-2 border-zinc-400 pr-2 rounded-xl">
                <div tw="font-bold text-3xl">Endorsements</div>
                <div tw="flex font-black text-6xl gap-2 items-center">
                  {projectInfo?.endorsements}
                </div>
              </div>
              <div tw="flex flex-col items-end ml-4 border-r-2 border-zinc-400 pr-2 rounded-xl">
                <div tw="font-bold text-3xl">Impacts</div>
                <div tw="flex font-black text-6xl gap-2 items-center">
                  {projectInfo?.impacts}
                </div>
              </div>
              <div tw="flex flex-col items-end ml-4 border-r-2 border-zinc-400 pr-2 rounded-xl">
                <div tw="font-bold text-3xl">Grants</div>
                <div tw="flex font-black text-6xl gap-2 items-center">
                  {projectInfo?.grants}
                </div>
              </div>
            </div>
          </div>

          <div tw="flex flex-col items-start justify-center mt-10">
            <div
              style={{
                fontWeight: "black",
              }}
              tw="text-7xl font-black font-serif"
            >
              {projectInfo?.title}
            </div>
            <div tw="flex text-4xl mt-5 text-justify">
              {projectInfo?.description.slice(0, 270) + "  -- Read more on GAP"}
            </div>
          </div>
        </div>
      ),
      imageOptions: {
        aspectRatio: "1.91:1",
      },
      textInput: "Enter the amount",
      buttons: [
        <Button
          key={1}
          action="tx"
          target={`${envVars.VERCEL_URL}/api/frames/${projectId}/txdata?projectId=${projectId}&recipient=${projectInfo?.recipient}&refuid=${projectInfo?.uid}&chainID=${projectInfo?.chainID}`}
          post_url={`/${projectId}`}
        >
          Donate
        </Button>,
        <Button
          key={2}
          action="link"
          target={`${envVars.VERCEL_URL}/project/${projectId}`}
        >
          View on GAP
        </Button>,
      ],
    };
  }
});

export const GET = handleRequest;
export const POST = handleRequest;
