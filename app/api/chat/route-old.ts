import { openai } from "@ai-sdk/openai";
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
import { getCategoriesWithCache, getGrantsWithCache, getMembersWithCache, getMilestonesWithCache, getProjectWithCache, getUpdatesWithCache, isPopulated, populateProjectData, setPopulated } from "./cache-util"
import { getImpactsWithCache } from "./cache-util";
import { getCategoriesInProgram, getGrantsOfProject, getProjectsUsingEmbeddings, getUpdatesOfProject } from "./util";

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

    // Create a mapping of UIDs to simple identifiers
    const projectMapping = projectsInProgram.reduce((acc, project, index) => {
      acc[project.uid] = `project-${index + 1}`;
      return acc;
    }, {} as Record<string, string>);

    // Create reverse mapping for tool usage
    const reverseProjectMapping = Object.entries(projectMapping).reduce((acc, [uid, id]) => {
      acc[id] = uid;
      return acc;
    }, {} as Record<string, string>);

    // Helper function to get UUID from project ID
    const getProjectUid = (projectId: string) => {
      const uid = reverseProjectMapping[projectId];
      console.log(`[Project Mapping] Converting projectId ${projectId} to uid: ${uid}`);
      if (!uid) throw new Error(`Invalid project ID: ${projectId}`);
      return uid;
    };

    // Create a simplified project list for the system prompt
    const simplifiedProjects = projectsInProgram.map((project, index) => ({
      id: `project-${index + 1}`,
      title: project.projectTitle,
    }));

    // Populate cache only for new projects
    const unpopulatedProjects = projectsInProgram.filter(p => !isPopulated(p.uid));
    if (unpopulatedProjects.length > 0) {
      const cacheStartTime = performance.now();
      console.log(`[Cache Population] Starting for ${unpopulatedProjects.length} new projects`);
      
      for(const project of unpopulatedProjects) {
        await populateProjectData(project);
        setPopulated(project.uid);
      }
      
      const cacheEndTime = performance.now();
      console.log(`[Cache Population] Completed new projects. Total time: ${(cacheEndTime - cacheStartTime).toFixed(2)}ms`);
    }

    const result = streamText({
      maxSteps: 3,
      onFinish: ({ text, toolCalls, toolResults, finishReason, usage }) => {},
      model: openai("gpt-4o"),
      // experimental_transform: smoothStream(),
      messages: messages,
      system: `
      
You are Karma Beacon, an AI assistant for the Karma Grantee Accountability Protocol (GAP) - a web3 platform that helps track and evaluate grant-funded projects.

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
   - If user mentions a project by name, search for the project in the program and confirm with user if it is the correct project based on the title of the project.

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
- Use fetchProject only for comprehensive project information better to use specific tools for targeted data even if need to use multiple tools.
- Use specific tools (fetchGrants, fetchImpacts, etc.) for targeted data
- Always verify project existence in program before proceeding
- If project is not in program, inform user: "This project is not in the current program"
- Call the fetchProject tool first to get all the data about the project. 
- Call the tools you have in parallel when required to get the data faster.
  
<project-list>
${
  projectsInProgram
    ? `PROJECTS IN THIS PROGRAM/ROUND: ${JSON.stringify(simplifiedProjects)}`
    : "NO PROJECT FILTER ACTIVE"
}
</project-list>

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
            projectUid: z.string().describe("the project id (e.g., project-1)"),
          }),
          execute: async ({ projectUid }) => getGrantsWithCache(getProjectUid(projectUid)),
        }),
        fetchImpactsOfProject: tool({
          description: `Retrieves all impacts of a project`,
          parameters: z.object({
            projectUid: z.string().describe("the project id (e.g., project-1)"),
          }),
          execute: async ({ projectUid }) => getImpactsWithCache(getProjectUid(projectUid)),
        }),
        fetchMilestonesOfProject: tool({
          description: `Retrieves all milestones of a project`,
          parameters: z.object({
            projectUid: z.string().describe("the project id (e.g., project-1)"),
          }),
          execute: async ({ projectUid }) => getMilestonesWithCache(getProjectUid(projectUid)),
        }),
        fetchMembersOfProject: tool({
          description: `Retrieves all members of a project`,
          parameters: z.object({
            projectUid: z.string().describe("the project id (e.g., project-1)"),
          }),
          execute: async ({ projectUid }) => getMembersWithCache(getProjectUid(projectUid)),
        }),
        fetchUpdatesOfProject: tool({
          description: `Retrieves all updates of a project`,
          parameters: z.object({
            projectUid: z.string().describe("the project id (e.g., project-1)"),
          }),
          execute: async ({ projectUid }) => getUpdatesWithCache(getProjectUid(projectUid)),
        }),
        fetchCategoriesOfProject: tool({
          description: `Retrieves all categories of a project`,
          parameters: z.object({
            projectUid: z.string().describe("the project id (e.g., project-1)"),
          }),
          execute: async ({ projectUid }) => getCategoriesWithCache(getProjectUid(projectUid)),
        }),
        fetchProject: tool({
          description: `Retrieves all available data about a project at once`,
          parameters: z.object({
            projectUid: z.string().describe("the project id (e.g., project-1)"),
          }),
          execute: async ({ projectUid }) => getProjectWithCache(getProjectUid(projectUid)),
        }),
      },
      onStepFinish: (event) => {
        console.log("event", JSON.stringify(event, null, 2));
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

export async function GET(req: Request) {
  try {
    // Extract projectUids from URL parameters
    const { searchParams } = new URL(req.url);
    const projectUids = searchParams.get('projectUids')?.split(',') || [];

    if (projectUids.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No project UIDs provided' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const cacheStartTime = performance.now();
    console.log(`[Cache Population] Starting for ${projectUids.length} projects`);

    // Filter out already populated projects
    const unpopulatedProjects = projectUids.filter(uid => !isPopulated(uid));
    
    // Populate cache for new projects
    await Promise.all(unpopulatedProjects.map(async (uid) => {
      await populateProjectData({ uid });
      setPopulated(uid);
    }));

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
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Cache Population] Error:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
