import { getProjectById } from "@/utilities/sdk";
import { INDEXER } from "@/utilities/indexer";
import fetchData from "@/utilities/fetchData";
import { Button } from "frames.js/next/pages-router/server";
import { frames } from "./frame";
import { getGapClient } from "@/hooks";
import { envVars } from "@/utilities/enviromentVars";

const handleRequest = frames(async (ctx) => {
  const projectId = ctx.request.url.split("/").pop();

  const [data, error, pageInfo]: any = await fetchData(
    `${INDEXER.PROJECT.GET_INFO_FOR_FRAMES(projectId as string)}`
  );

  if (ctx.message?.transactionId) {
    let txHash = ctx.message?.transactionId;

    return {
      image: (
        <div tw="bg-zinc-100 text-zinc-900 w-full h-full text-center justify-center items-center flex flex-col">
          <div tw="flex mb-2">
            <img
              tw="h-32"
              src="https://gap.karmahq.xyz/logo/karma-gap-logo.svg"
              alt=""
            />
          </div>
          <div tw="flex font-bold">
            Donation to {data?.details?.title} has been successful.
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
          target={`${envVars.APP_URL}/project/${projectId}`}
        >
          View on GAP
        </Button>,
      ],
    };
  }

  return {
    image: (
      <div tw="flex flex-col justify-between items-between px-15">
        <div tw="flex flex-row justify-between items-start pb-5">
          <div tw="flex flex-col">
            <img
              src="http://localhost:3000/logo/karma-gap-logo2.png"
              alt="logo"
              tw="mt-2"
              width={400}
            />
          </div>
          <div tw="flex flex-row items-start justify-between p-2 ">
            <div tw="flex flex-col items-end border-r-2 border-zinc-400 pr-2 rounded-xl">
              <div tw="font-bold text-3xl">Endorsements</div>
              <div tw="flex font-black text-6xl gap-2 items-center">
                {data?.endorsements}
              </div>
            </div>
            <div tw="flex flex-col items-end ml-4 border-r-2 border-zinc-400 pr-2 rounded-xl">
              <div tw="font-bold text-3xl">Impacts</div>
              <div tw="flex font-black text-6xl gap-2 items-center">
                {data?.impacts}
              </div>
            </div>
            <div tw="flex flex-col items-end ml-4 border-r-2 border-zinc-400 pr-2 rounded-xl">
              <div tw="font-bold text-3xl">Grants</div>
              <div tw="flex font-black text-6xl gap-2 items-center">
                {data?.grants}
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
            {data?.name}
          </div>
          <div tw="flex text-4xl mt-5 text-justify">
            {data?.description.slice(0, 270) + "  -- Read more on GAP"}
          </div>
        </div>
      </div>
    ),
    textInput: "Enter the amount",
    buttons: [
      <Button
        key={1}
        action="tx"
        target={`${envVars.APP_URL}/api/frames/${projectId}/txdata?projectId=${projectId}&recipient=${data?.recipient}&refuid=${data?.refUID}&chainID=${data?.chainID}`}
        post_url={`/${projectId}`}
      >
        Donate
      </Button>,
      <Button
        key={2}
        action="link"
        target={`${envVars.APP_URL}/project/${projectId}`}
      >
        View on GAP
      </Button>,
    ],
  };
});

export default handleRequest;
