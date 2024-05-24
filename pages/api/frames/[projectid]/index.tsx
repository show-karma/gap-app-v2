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
            gap: 100,
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
              width={264}
            />
            <div
              style={{
                fontSize: 64,
                fontWeight: "bolder",
                paddingTop: 80,
              }}
            >
              {data?.details?.title}
              {/* {gl} */}
            </div>
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              padding: 60,
              gap: 20,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 50,
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
                  No of Grants
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
                  No of Impacts
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
              </div>{" "}
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 50,
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
                  Chain
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
                  {data?.details?.chainID.toString()}{" "}
                </div>
              </div>{" "}
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
                  No of Endorsement
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
        </div>
        <div
          style={{
            fontSize: 26,
            padding: 60,
          }}
        >
          {data?.details?.description.slice(0, 400)}
        </div>
      </div>
    ),
    buttons: [<Button action="post">Click me</Button>],
  };
});

export default handleRequest;
