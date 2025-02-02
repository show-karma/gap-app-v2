// import { openai } from "@ai-sdk/openai";
import { OpenAI } from "openai";
import { z } from "zod";
import {
  InvalidToolArgumentsError,
  ToolExecutionError,
  NoSuchToolError,
  streamText,
  smoothStream,
  tool,
  StepResult,
} from "ai";
import { AxiosError } from "axios";
import {
  getCategoriesWithCache,
  getGrantsWithCache,
  getMembersWithCache,
  getMilestonesWithCache,
  getProjectWithCache,
  getUpdatesWithCache,
  isPopulated,
  populateProjectData,
  setPopulated,
} from "./cache-util";
import { getImpactsWithCache } from "./cache-util";
import {
  getCategoriesInProgram,
  getGrantsOfProject,
  getProjectsUsingEmbeddings,
  getUpdatesOfProject,
} from "./util";
import {
  ChatCompletionMessageParam,
  ChatCompletionTool,
} from "openai/resources/chat/completions.mjs";

// Allow streaming responses up to 60 seconds, can set to max 360 seconds
export const maxDuration = 60;

const chatRequestSchema = z.object({
  messages: z.array(
    z.object({
      content: z.string(),
      role: z.enum(["user", "assistant", "system"]),
    })
  ),
  projectsInProgram: z.array(
    z.object({
      uid: z.string(),
      chainId: z.number(),
      projectTitle: z.string(),
      projectCategories: z.array(z.string()),
    })
  ),
});

const tools = [
  {
    type: "function",
    function: {
      name: "fetchCategoriesInProgram",
      description: "Get all categories in the program/round",
      parameters: {
        type: "object",
        properties: {},
        required: [],
        additionalProperties: false,
      },
      strict: true,
    },
  },
  {
    type: "function",
    function: {
      name: "fetchProjectsBySemanticSearch",
      description:
        "Use only when user wants to search for projects by name or description",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "the query",
          },
        },
        additionalProperties: false,
        required: ["query"],
        strict: true,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "fetchGrantsOfProject",
      description: "Retrieves all grants of a project",
      parameters: {
        type: "object",
        properties: {
          projectUid: {
            type: "string",
            description: "the project id (e.g., project-1)",
          },
        },
        required: ["projectUid"],
        additionalProperties: false,
      },
      strict: true,
    },
  },
  {
    type: "function",
    function: {
      name: "fetchImpactsOfProject",
      description: "Retrieves all impacts of a project",
      parameters: {
        type: "object",
        properties: {
          projectUid: {
            type: "string",
            description: "the project id (e.g., project-1)",
          },
        },
        additionalProperties: false,
        required: ["projectUid"],
      },
      strict: true,
    },
  },
  {
    type: "function",
    function: {
      name: "fetchMilestonesOfProject",
      description: "Retrieves all milestones of a project",
      parameters: {
        type: "object",
        properties: {
          projectUid: {
            type: "string",
            description: "the project id (e.g., project-1)",
          },
        },
        additionalProperties: false,
        required: ["projectUid"],
      },
      strict: true,
    },
  },
  {
    type: "function",
    function: {
      name: "fetchMembersOfProject",
      description: "Retrieves all members of a project",
      parameters: {
        type: "object",
        properties: {
          projectUid: {
            type: "string",
            description: "the project id (e.g., project-1)",
          },
        },
        additionalProperties: false,
        required: ["projectUid"],
      },
      strict: true,
    },
  },
  {
    type: "function",
    function: {
      name: "fetchUpdatesOfProject",
      description: "Retrieves all updates of a project",
      parameters: {
        type: "object",
        properties: {
          projectUid: {
            type: "string",
            description: "the project id (e.g., project-1)",
          },
        },
        required: ["projectUid"],
        additionalProperties: false,
      },
      strict: true,
    },
  },
  {
    type: "function",
    function: {
      name: "fetchCategoriesOfProject",
      description: "Retrieves all categories of a project",
      parameters: {
        type: "object",
        properties: {
          projectUid: {
            type: "string",
            description: "the project id (e.g., project-1)",
          },
        },
        required: ["projectUid"],
        additionalProperties: false,
      },
      strict: true,
    },
  },
  {
    type: "function",
    function: {
      name: "fetchProject",
      description: "Retrieves all available data about a project at once",
      parameters: {
        type: "object",
        properties: {
          projectUid: {
            type: "string",
            description: "the project id (e.g., project-1)",
          },
        },
        required: ["projectUid"],
        additionalProperties: false,
      },
      strict: true,
    },
  },
  {
    type: "function",
    function: {
      name: "fetchDataAcrossProjects",
      description: "Get data across multiple projects",
      parameters: {
        type: "object",
        properties: {
          projectUids: {
            type: "array",
            items: {
              type: "string",
            },
            description:
              "the project ids (e.g., project-1, project-2) or mention ALL for all projects",
          },
        },
        required: ["projectUids"],
        additionalProperties: false,
      },
      strict: true,
    },
  },
];

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const validatedData = chatRequestSchema.parse(body);
    const { messages, projectsInProgram } = validatedData;

    // Create a mapping of UIDs to simple identifiers
    const projectMapping = projectsInProgram.reduce((acc, project, index) => {
      acc[project.uid] = `project-${index + 1}`;
      return acc;
    }, {} as Record<string, string>);

    // Create reverse mapping for tool usage
    const reverseProjectMapping = Object.entries(projectMapping).reduce(
      (acc, [uid, id]) => {
        acc[id] = uid;
        return acc;
      },
      {} as Record<string, string>
    );

    // Helper function to get UUID from project ID
    const getProjectUid = (projectId: string) => {
      const uid = reverseProjectMapping[projectId];
      console.log(
        `[Project Mapping] Converting projectId ${projectId} to uid: ${uid}`
      );
      if (!uid) throw new Error(`Invalid project ID: ${projectId}`);
      return uid;
    };

    // Create a simplified project list for the system prompt
    const simplifiedProjects = projectsInProgram.map((project, index) => ({
      id: `project-${index + 1}`,
      title: project.projectTitle,
    }));

    // Populate cache only for new projects
    const unpopulatedProjects = projectsInProgram.filter(
      (p) => !isPopulated(p.uid)
    );
    if (unpopulatedProjects.length > 0) {
      const cacheStartTime = performance.now();
      console.log(
        `[Cache Population] Starting for ${unpopulatedProjects.length} new projects`
      );

      for (const project of unpopulatedProjects) {
        await populateProjectData(project);
        setPopulated(project.uid);
      }

      const cacheEndTime = performance.now();
      console.log(
        `[Cache Population] Completed new projects. Total time: ${(
          cacheEndTime - cacheStartTime
        ).toFixed(2)}ms`
      );
    }
    const openai = new OpenAI();

    const systemMessage = `You are Karma Beacon, an AI assistant for the Karma Grantee Accountability Protocol (GAP) - a web3 platform that helps track and evaluate grant-funded projects.

Core Responsibilities:
- Answer user queries using the tools provided and provide the best possible response.
- If user asks for a project by name, search for the project in the program and confirm with user if it is the correct project based on the title of the project.

- If projects semantic search is used - only use projects returned on the tool call. Never talk abt projects that are not part of the projectsInProgram
- If project not found, suggest similar projects based on name and description matches

3. Response Guidelines
   - Structure responses with clear headings and sections
   - Use numbered lists for better readability
   - Include specific metrics and data points when available
   - Format responses in markdown for better presentation
   - If no data is found, respond with "Sorry, I don't know"

   Example Output formats:

   ## 1. Project Overview
   **Project:** [Project Name](https://project-link)  
   **Categories:** [Category 1], [Category 2], ...  
   **Description:** [Project Description]  
   **Status:** [Active/Completed/On Hold]  
   **Chain:** [Chain Name]  
   **Website:** [Website URL](https://website-url)  
   **Repository:** [Repository URL](https://repository-url)  

   ## 2. Milestones
   ### [Date/Quarter]: [Milestone Title]
   - **Status:** [Not Started/In Progress/Completed/Delayed]
   - **Due Date:** [Target Date]
   - **Description:** [Detailed Description]
   - **Deliverables:** [Expected Outcomes]
   - **Progress:** [Progress Details]
   - **Dependencies:** [Any Dependencies]
   - **Links:** [Relevant Links](https://link-url)

   ## 3. Grants
   ### Grant [ID/Name]
   - **Amount:** [Amount] [Token Symbol]
   - **Status:** [Pending/Approved/Disbursed/Completed]
   - **Application Date:** [Date]
   - **Approval Date:** [Date]
   - **Disbursement Date:** [Date]
   - **Purpose:** [Grant Purpose]
   - **Milestones:** [Associated Milestones]
   - **Contract Address:** [Address]
   - **Transaction:** [Transaction Hash](https://explorer-url)

   ## 4. Team Members
   ### [Name] - [Primary Role]
   - **Roles:** [All Roles]
   - **Bio:** [Brief Biography]
   - **Experience:** [Relevant Experience]
   - **Contact:** 
     - **Email:** [Email](mailto:email@example.com)
     - **Discord:** [Discord Handle]
     - **Telegram:** [Telegram Handle]
   - **Social:** 
     - [Twitter](https://twitter.com/handle)
     - [GitHub](https://github.com/handle)
     - [LinkedIn](https://linkedin.com/in/handle)
   - **Wallet Address:** [Address]

   ## 5. Project Updates
   ### [Date]: [Update Title]
   - **Type:** [Regular Update/Milestone Update/Grant Report]
   - **Status:** [On Track/Delayed/Completed/Blocked]
   - **Summary:** [Brief Summary]
   - **Details:** [Detailed Update Content]
   - **Achievements:** [Key Achievements]
   - **Challenges:** [Challenges Faced]
   - **Next Steps:** [Planned Actions]
   - **Resources:** 
     - [Documentation](https://docs-url)
     - [Demo](https://demo-url)
     - [Code](https://code-url)
   - **Media:** 
     - [Images](https://image-url)
     - [Videos](https://video-url)

   ## 6. Impact Metrics
   ### [Metric Category]
   - **Metric Name:** [Name]
   - **Value:** [Current Value] [Unit]
   - **Previous Value:** [Previous Value] [Unit]
   - **Change:** [Percentage/Absolute Change]
   - **Time Period:** [Measurement Period]
   - **Description:** [Metric Description]
   - **Methodology:** [How it's Measured]
   - **Source:** [Data Source](https://source-url)
   - **Verification:** [Verification Method]
   - **Impact Area:** [Area of Impact]

   ## 7. Categories in Program
   ### [Category Name]
   - **Description:** [Category Description]
   - **Projects Count:** [Number of Projects]
   - **Total Grants:** [Total Grant Amount] [Token]
   - **Focus Areas:** [Key Focus Points]
   - **Requirements:** [Category Requirements]
   - **Success Metrics:** [Expected Outcomes]
   - **Related Categories:** [Similar/Related Categories]
   - **Projects:** 
     - [Project 1](https://project1-url)
     - [Project 2](https://project2-url)

TOOL USAGE:
- To get complete data about a project, use fetchProject tool
- Use specific tools (fetchGrants, fetchImpacts, etc.) for targeted data
- Always verify project existence in program before proceeding
- If project is not in program, inform user: "This project is not in the current program"
- Call the tools you have in parallel when required to get the data faster.
  

<project-list>
${
  projectsInProgram
    ? `PROJECTS IN THIS PROGRAM/ROUND: ${JSON.stringify(simplifiedProjects)}`
    : "NO PROJECT FILTER ACTIVE"
}
</project-list>

Think step by step before you generate a response. Do parallel tool calls when required to get the data faster.

`;

    let currentMessages = [
      { role: "system", content: systemMessage },
      ...messages,
    ] as ChatCompletionMessageParam[];

    let finalResponse = null;
    let continueLoop = true;
    let allMessages: ChatCompletionMessageParam[] = [];

    while (continueLoop) {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: currentMessages,
        tools: tools as ChatCompletionTool[],
        tool_choice: "auto",
      });

      console.log("---------------------");
      console.log(JSON.stringify(completion.choices, null, 2));

      const responseMessage = completion.choices[0].message;

      // Add assistant's message to allMessages
      allMessages.push(responseMessage);

      if (!responseMessage.tool_calls) {
        // If no tool calls, we have our final response
        finalResponse = responseMessage;
        continueLoop = false;
        continue;
      }

      // Handle tool calls
      const toolResults = await Promise.all(
        responseMessage.tool_calls.map(async (toolCall) => {
          const functionName = toolCall.function.name;
          const args = JSON.parse(toolCall.function.arguments);

          try {
            let result;
            switch (functionName) {
              case "fetchCategoriesInProgram":
                result = await getCategoriesInProgram(projectsInProgram);
                break;
              case "fetchProjectsBySemanticSearch":
                result = await getProjectsUsingEmbeddings(
                  args.query,
                  projectsInProgram
                );
                break;
              case "fetchGrantsOfProject":
                result = await getGrantsWithCache(
                  getProjectUid(args.projectUid)
                );
                break;
              case "fetchImpactsOfProject":
                result = await getImpactsWithCache(
                  getProjectUid(args.projectUid)
                );
                break;
              case "fetchMilestonesOfProject":
                result = await getMilestonesWithCache(
                  getProjectUid(args.projectUid)
                );
                break;
              case "fetchMembersOfProject":
                result = await getMembersWithCache(
                  getProjectUid(args.projectUid)
                );
                break;
              case "fetchUpdatesOfProject":
                result = await getUpdatesWithCache(
                  getProjectUid(args.projectUid)
                );
                break;
              case "fetchCategoriesOfProject":
                result = await getCategoriesWithCache(
                  getProjectUid(args.projectUid)
                );
                break;
              case "fetchProject":
                result = await getProjectWithCache(
                  getProjectUid(args.projectUid)
                );
                break;
              case "fetchDataAcrossProjects":
                if (args.projectUids.includes("ALL")) {
                  result = await Promise.all(
                    projectsInProgram.map(async (project) => {
                      return await getProjectWithCache(project.uid);
                    })
                  );
                } else {
                  result = await Promise.all(
                    args.projectUids.map(async (projectUid: string) => {
                      return await getProjectWithCache(
                        getProjectUid(projectUid)
                      );
                    })
                  );
                }

                break;
              default:
                throw new Error(`Unknown function: ${functionName}`);
            }
            return {
              tool_call_id: toolCall.id,
              result,
            };
          } catch (error) {
            console.error(`Error executing ${functionName}:`, error);
            throw new ToolExecutionError({
              message: `Error executing ${functionName}: ${
                error instanceof Error ? error.message : String(error)
              }`,
              toolName: functionName,
              toolArgs: args,
              toolCallId: toolCall.id,
              cause: error,
            });
          }
        })
      );

      // Add the assistant's message and tool results to the conversation
      currentMessages.push(responseMessage);

      // Add tool results to both currentMessages and allMessages
      toolResults.forEach((toolResult) => {
        const toolMessage = {
          role: "tool",
          tool_call_id: toolResult.tool_call_id,
          content: JSON.stringify(toolResult.result),
        } as ChatCompletionMessageParam;
        
        currentMessages.push(toolMessage);
        allMessages.push(toolMessage);
      });
    }

    // Return the final response along with the complete message history
    return new Response(
      JSON.stringify({ 
        message: finalResponse,
        history: allMessages 
      }), {
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Chat API Error:", error);

    if (error instanceof z.ZodError) {
      return new Response(
        JSON.stringify({
          error: "Invalid request format",
          details: error.errors,
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (error instanceof AxiosError) {
      return new Response(
        JSON.stringify({
          error: "External API error",
          details: error.message,
        }),
        {
          status: error.response?.status || 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

export async function GET(req: Request) {
  try {
    // Extract projectUids from URL parameters
    const { searchParams } = new URL(req.url);
    const projectUids = searchParams.get("projectUids")?.split(",") || [];

    if (projectUids.length === 0) {
      return new Response(
        JSON.stringify({ error: "No project UIDs provided" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const cacheStartTime = performance.now();
    console.log(
      `[Cache Population] Starting for ${projectUids.length} projects`
    );

    // Filter out already populated projects
    const unpopulatedProjects = projectUids.filter((uid) => !isPopulated(uid));

    // Populate cache for new projects
    await Promise.all(
      unpopulatedProjects.map(async (uid) => {
        await populateProjectData({ uid });
        setPopulated(uid);
      })
    );

    const cacheEndTime = performance.now();
    const timeTaken = (cacheEndTime - cacheStartTime).toFixed(2);
    console.log(`[Cache Population] Completed. Total time: ${timeTaken}ms`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Cache populated for ${unpopulatedProjects.length} new projects`,
        timeTaken: `${timeTaken}ms`,
        alreadyPopulated: projectUids.length - unpopulatedProjects.length,
        newlyPopulated: unpopulatedProjects.length,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[Cache Population] Error:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
