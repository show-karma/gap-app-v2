import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import {
  InvalidToolArgumentsError,
  ToolExecutionError,
  NoSuchToolError,
  streamText,
  smoothStream,
  tool,
} from "ai";
import axios, { AxiosError } from "axios";
import { envVars } from "@/utilities/enviromentVars";
import { INDEXER } from "@/utilities/indexer";
import { IProjectResponse } from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";

async function getProjectsUsingEmbeddings(
  query: string,
  projectsInProgram: { uid: string; chainId: number }[] | undefined
) {
  try {
    const { data } = await axios.post<{ projects: any[] }>(
      `${envVars.NEXT_PUBLIC_GAP_INDEXER_URL}/projects/by-embeddings`,
      {
        projectsInProgram,
        query,
      }
    );
    return JSON.stringify(data);
  } catch (error) {
    console.error("Error fetching projects using embeddings:", error);
    return [];
  }
}

async function getGrantsOfProject(projectUid: string) {
  try {
    const { data } = await axios.get<IProjectResponse>(
      `${envVars.NEXT_PUBLIC_GAP_INDEXER_URL}${INDEXER.PROJECT.GET(projectUid)}`
    );
    return JSON.stringify(
      data.grants.map((grant) => ({
        ...grant?.details?.data,
      }))
    );
  } catch (error) {
    console.error("Error fetching grants:", error);
    return [];
  }
}

async function getImpactsOfProject(projectUid: string) {
  try {
    const { data } = await axios.get<IProjectResponse>(
      `${envVars.NEXT_PUBLIC_GAP_INDEXER_URL}${INDEXER.PROJECT.GET(projectUid)}`
    );
    return JSON.stringify(
      data.impacts.map((impact) => ({
        ...impact?.data,
        createdAt: impact?.createdAt,
      }))
    );
  } catch (error) {
    console.error("Error fetching impacts:", error);
    return [];
  }
}

async function getMilestonesOfProject(projectUid: string) {
  try {
    const { data } = await axios.get<IProjectResponse>(
      `${envVars.NEXT_PUBLIC_GAP_INDEXER_URL}${INDEXER.PROJECT.GET(projectUid)}`
    );
    return JSON.stringify(
      data.milestones.map((milestone) => ({
        ...milestone?.data,
        createdAt: milestone?.createdAt,
      }))
    );
  } catch (error) {
    console.error("Error fetching milestones:", error);
    return [];
  }
}

async function getMembersOfProject(projectUid: string) {
  try {
    const { data } = await axios.get<IProjectResponse>(
      `${envVars.NEXT_PUBLIC_GAP_INDEXER_URL}${INDEXER.PROJECT.GET(projectUid)}`
    );
    return JSON.stringify(data.members.map((member) => member?.recipient));
  } catch (error) {
    console.error("Error fetching members:", error);
    return [];
  }
}

async function getUpdatesOfProject(projectUid: string) {
  try {
    const { data } = await axios.get(
      `${envVars.NEXT_PUBLIC_GAP_INDEXER_URL}${INDEXER.PROJECT.GET(projectUid)}`
    );
    return JSON.stringify(
      data.updates.map((update: any) => ({
        ...update?.data,
        createdAt: update?.createdAt,
      }))
    );
  } catch (error) {
    console.error("Error fetching updates:", error);
    return [];
  }
}

async function getCategoriesOfProject(projectUid: string) {
  try {
    const { data } = await axios.get<
      IProjectResponse & { category: { name: string }[] }
    >(
      `${envVars.NEXT_PUBLIC_GAP_INDEXER_URL}${INDEXER.PROJECT.GET(projectUid)}`
    );
    return JSON.stringify(data.category.map((category) => category.name));
  } catch (error) {
    console.error("Error fetching categories:", error);
    return [];
  }
}

async function getProject(projectUid: string) {
  try {
    const { data } = await axios.get<
      IProjectResponse & {
        category: { name: string }[];
        project_milestones: any[];
      }
    >(
      `${envVars.NEXT_PUBLIC_GAP_INDEXER_URL}${INDEXER.PROJECT.GET(projectUid)}`
    );
    const impacts = data.impacts.map((impact) => ({
      ...impact?.data,
      createdAt: impact?.createdAt,
    }));
    const milestones = data.project_milestones.map((milestone) => ({
      ...milestone?.data,
      createdAt: milestone?.createdAt,
    }));
    const members = data.members.map((member) => member?.recipient);
    const updates = data.updates.map((update: any) => ({
      ...update?.data,
      createdAt: update?.createdAt,
    }));
    const grants = data.grants.map((grant) => ({
      ...grant?.details?.data,
      createdAt: grant?.createdAt,
    }));
    const project = {
      uid: data.uid,
      createdAt: data.createdAt,
      createdBy: data.recipient,
      category: data?.category,
      details: data?.details?.data,
      grants,
      impacts,
      milestones,
      members,
      updates,
    };
    return JSON.stringify(project);
  } catch (error) {
    console.error("Error fetching project:", error);
    return null;
  }
}

async function getCategoriesInProgram(
  projectsInProgram: {
    uid: string;
    chainId: number;
    projectCategories: string[];
  }[]
) {
  const categories = projectsInProgram.flatMap(
    (project) => project.projectCategories
  );
  return JSON.stringify(categories);
}

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

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const validatedData = chatRequestSchema.parse(body);
    const { messages, projectsInProgram } = validatedData;

    const result = streamText({
      maxSteps: 3,
      onFinish: ({ text, toolCalls, toolResults, finishReason, usage }) => {},
      model: openai("gpt-4o"),
      experimental_transform: smoothStream(),
      messages: messages,
      system: `You are Karma Beacon, an AI assistant for the Karma Grantee Accountability Protocol (GAP) - a web3 platform that helps track and evaluate grant-funded projects.

ROLE AND CONTEXT:
- You assist evaluators in assessing projects in a grant program/round
- You have access to comprehensive project data through specialized tools
- You provide data-driven insights and evaluation recommendations
- You maintain a professional yet approachable tone

CORE RESPONSIBILITIES:
1. Project Analysis
   - Review project details, milestones, and impacts
   - Evaluate project progress and outcomes
   - Analyze project updates and member activities
   - Compare projects when requested

2. Data Management
   - Use appropriate tools to fetch specific project information 
   - Return accurate, up-to-date information
   - Handle missing or incomplete data gracefully
   - If projects semantic search is used - only use projects returned on the tool call. Never talk abt projects that are not part of the projectsInProgram
   - If project not found, suggest similar projects based on name and description matches

3. Response Guidelines
   - Structure responses with clear headings and sections
   - Use numbered lists for better readability
   - Include specific metrics and data points when available
   - Format responses in markdown for better presentation
   - If no data is found, respond with "Sorry, I don't know"

TOOL USAGE:
- Use fetchProject for comprehensive project information
- Use specific tools (fetchGrants, fetchImpacts, etc.) for targeted data
- Always verify project existence in program before proceeding
- If project is not in program, inform user: "This project is not in the current program"
- Call the fetchProject tool first to get all the data about the project. 

${
  projectsInProgram
    ? `PROJECTS IN THIS PROGRAM/ROUND: ${JSON.stringify(projectsInProgram)}`
    : "NO PROJECT FILTER ACTIVE"
}

IMPORTANT:
- Always verify data accuracy before responding
- Maintain user privacy and data confidentiality
- Provide objective, fact-based analysis
- Focus on actionable insights and recommendations`,
      tools: {
        fetchCategoriesInProgram: tool({
          description: `Get all categories in the program/round`,
          parameters: z.object({}),
          execute: async () => getCategoriesInProgram(projectsInProgram),
        }),
        fetchProjectsBySemanticSearch: tool({
          description: `Retrieves projects by a semantic search. Use this only if you are not sure about the project name or description. Or need to get a group of projects. Also use this when you need a list of projects under a category.`,
          parameters: z.object({
            query: z.string().describe("the query"),
          }),
          execute: async ({ query }) =>
            getProjectsUsingEmbeddings(query, projectsInProgram),
        }),
        fetchGrantsOfProject: tool({
          description: `Retrieves all grants of a project`,
          parameters: z.object({
            projectUid: z.string().describe("the project uid"),
          }),
          execute: async ({ projectUid }) => {
            return getGrantsOfProject(projectUid);
          },
        }),
        fetchImpactsOfProject: tool({
          description: `Retrieves all impacts of a project`,
          parameters: z.object({
            projectUid: z.string().describe("the project uid"),
          }),
          execute: async ({ projectUid }) => getImpactsOfProject(projectUid),
        }),
        fetchMilestonesOfProject: tool({
          description: `Retrieves all milestones of a project`,
          parameters: z.object({
            projectUid: z.string().describe("the project uid"),
          }),
          execute: async ({ projectUid }) => getMilestonesOfProject(projectUid),
        }),
        fetchMembersOfProject: tool({
          description: `Retrieves all members of a project`,
          parameters: z.object({
            projectUid: z.string().describe("the project uid"),
          }),
          execute: async ({ projectUid }) => getMembersOfProject(projectUid),
        }),
        fetchUpdatesOfProject: tool({
          description: `Retrieves all updates of a project`,
          parameters: z.object({
            projectUid: z.string().describe("the project uid"),
          }),
          execute: async ({ projectUid }) => getUpdatesOfProject(projectUid),
        }),
        fetchCategoriesOfProject: tool({
          description: `Retrieves all categories of a project`,
          parameters: z.object({
            projectUid: z.string().describe("the project uid"),
          }),
          execute: async ({ projectUid }) => getCategoriesOfProject(projectUid),
        }),
        fetchProject: tool({
          description: `Retrieves all available data about a project at once - grants, impacts, milestones, updates, categories, members`,
          parameters: z.object({
            projectUid: z.string().describe("the project uid"),
          }),
          execute: async ({ projectUid }) => getProject(projectUid),
        }),
      },
    });

    return result.toDataStreamResponse({
      getErrorMessage: (error) => {
        if (NoSuchToolError.isInstance(error)) {
          return "The model tried to call a unknown tool.";
        } else if (InvalidToolArgumentsError.isInstance(error)) {
          return "The model called a tool with invalid arguments.";
        } else if (ToolExecutionError.isInstance(error)) {
          return "An error occurred during tool execution.";
        } else {
          return "An unknown error occurred.";
        }
      },
    });
  } catch (error) {
    console.error("Chat API Error:", error);

    if (error instanceof z.ZodError) {
      return new Response(
        JSON.stringify({
          error: "Invalid request format",
          details: error.errors,
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
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
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
