import { getProjectById } from "@/utilities/sdk";
import { da } from "date-fns/locale";
import { createFrames, Button } from "frames.js/next/pages-router/server";

const frames = createFrames({
  basePath: "/api/frames",
});

const handleRequest = frames(async (ctx) => {
  const projectId = ctx.request.url.split("/").pop();
  const data = await getProjectById(projectId as string);
  console.log(data);
  console.log(data?.details?.description);
  const gl = data?.grants?.length.toString();
  console.log(data?.impacts?.length);
  console.log(data?.endorsements?.length);
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
    buttons: [
      <Button action="tx" target="/txdata" post_url="/frames">
        Donate
      </Button>,
      <Button
        action="link"
        target={`https://gap.karmahq.xyz/project/${projectId}`}
      >
        View on GAP
      </Button>,
    ],
  };
});

export default handleRequest;
