import { getProjectById } from "@/utilities/sdk";
import { da } from "date-fns/locale";
import { createFrames, Button } from "frames.js/next/pages-router/server";
import { frames } from "./frame";
import { getGapClient } from "@/hooks";

const handleRequest = frames(async (ctx) => {
  const projectId = ctx.request.url.split("/").pop();
  const data = await getProjectById(projectId as string);
  const gl = data?.grants?.length.toString();
  const gap = getGapClient(data?.chainID as number);
  console.log(gap.findSchema("ProjectEndorsement").uid);

  if (ctx.message?.transactionId) {
    return {
      image: (
        <div tw="bg-purple-800 text-white w-full h-full justify-center items-center flex">
          Transaction submitted! {ctx.message.transactionId}
        </div>
      ),
      imageOptions: {
        aspectRatio: "1:1",
      },
      buttons: [
        <Button
          key={1}
          action="link"
          target={`https://www.onceupon.gg/tx/${ctx.message.transactionId}`}
        >
          View on block explorer
        </Button>,
      ],
    };
  }

  return {
    image: (
      <div
        style={{
          display: "flex",
          flexDirection: "column",

          width: `100%`,
          height: `100%`,
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            gap: 140,
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              padding: 60,
            }}
          >
            <img
              src="http://localhost:3000/logo/karma-gap-logo2.png"
              alt="logo"
              width={320}
            />
            <div
              style={{
                fontSize: 64,
                fontWeight: "bolder",
                paddingTop: 80,
                fontFamily: "sans-serif",
              }}
            >
              {data?.details?.title}
              {/* {gl} */}
            </div>
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              padding: 60,
              gap: 30,
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
              }}
            >
              <div
                style={{
                  fontSize: 30,
                  fontWeight: "bolder",
                }}
              >
                Grants
              </div>
              <div
                style={{
                  fontSize: 42,
                  display: "flex",
                  gap: 2,

                  fontWeight: "bolder",
                  alignItems: "center",
                }}
              >
                {data?.grants.length.toString()}{" "}
              </div>
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
              }}
            >
              <div
                style={{
                  fontSize: 30,
                  fontWeight: "bolder",
                }}
              >
                Impacts
              </div>
              <div
                style={{
                  fontSize: 42,
                  display: "flex",
                  gap: 2,

                  fontWeight: "bolder",
                  alignItems: "center",
                }}
              >
                {data?.impacts.length.toString()}{" "}
              </div>
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
              }}
            >
              <div
                style={{
                  fontSize: 30,
                  fontWeight: "bolder",
                }}
              >
                Endorsement
              </div>
              <div
                style={{
                  fontSize: 42,
                  display: "flex",
                  gap: 2,

                  fontWeight: "bolder",
                  alignItems: "center",
                }}
              >
                {data?.endorsements.length.toString()}{" "}
              </div>
            </div>
          </div>
        </div>
        <div
          style={{
            fontSize: 32,
            paddingLeft: 50,
            paddingRight: 50,
          }}
        >
          {data?.details?.description.slice(0, 280) + "... view more on GAP"}
        </div>
      </div>
    ),
    textInput: "Enter the amount",
    buttons: [
      <Button
        key={1}
        action="tx"
        target={`http://localhost:3000/api/frames/${projectId}/txdata?projectId=${projectId}&recipient=${data?.recipient}&refuid=${data?.refUID}&chainID=${data?.chainID}`}
        post_url={`/${projectId}`}
      >
        Donate
      </Button>,
      <Button
        key={2}
        action="link"
        target={`https://gap.karmahq.xyz/project/${projectId}`}
      >
        View on GAP
      </Button>,
    ],
  };
});

export default handleRequest;
