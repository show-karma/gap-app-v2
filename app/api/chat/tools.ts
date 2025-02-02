import {
  getGrantsWithCache,
  getImpactsWithCache,
  getProjectWithCache,
  getMilestonesWithCache,
  getMembersWithCache,
  getUpdatesWithCache,
  getCategoriesWithCache,
} from "./cache-util";
import { getProjectsUsingEmbeddings } from "./util";
import { getCategoriesInProgram } from "./util";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const tools = [
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
  {
    type: "function",
    function: {
      name: "do_indepth_reasoning",
      description: "Do indepth reasoning if required",
      parameters: {
        type: "object",
        properties: {
          context: {
            type: "string",
            description: "the context",
          },
          question: {
            type: "string",
            description: "the question",
          },
        },
        required: ["context", "question"],
        additionalProperties: false,
      },
      strict: true,
    },
  },
];

// Helper function to execute tool calls
export async function executeToolCall(
  toolCall: any,
  getProjectUid: (projectId: string) => string,
  projectsInProgram: any[]
) {
  const { name, arguments: args } = toolCall.function;

  try {
    console.log("[Chat API] Parsing tool arguments:", args);
    const parsedArgs = JSON.parse(args);
    console.log("[Chat API] Parsed arguments:", parsedArgs);

    console.log("[Chat API] Executing tool call:", name, parsedArgs);

    switch (name) {
      case "fetchCategoriesInProgram":
        return await getCategoriesInProgram(projectsInProgram);
      case "fetchProjectsBySemanticSearch":
        return await getProjectsUsingEmbeddings(
          parsedArgs.query,
          projectsInProgram
        );
      case "fetchGrantsOfProject":
        return await getGrantsWithCache(getProjectUid(parsedArgs.projectUid));
      case "fetchImpactsOfProject":
        return await getImpactsWithCache(getProjectUid(parsedArgs.projectUid));
      case "fetchMilestonesOfProject":
        return await getMilestonesWithCache(
          getProjectUid(parsedArgs.projectUid)
        );
      case "fetchMembersOfProject":
        return await getMembersWithCache(getProjectUid(parsedArgs.projectUid));
      case "fetchUpdatesOfProject":
        return await getUpdatesWithCache(getProjectUid(parsedArgs.projectUid));
      case "fetchCategoriesOfProject":
        return await getCategoriesWithCache(
          getProjectUid(parsedArgs.projectUid)
        );
      case "fetchProject":
        return await getProjectWithCache(getProjectUid(parsedArgs.projectUid));
      case "fetchDataAcrossProjects":
        if (parsedArgs.projectUids.includes("ALL")) {
          return await Promise.all(
            projectsInProgram.map(async (project) => {
              return await getProjectWithCache(project.uid);
            })
          );
        } else {
          return await Promise.all(
            parsedArgs.projectUids.map(async (projectUid: string) => {
              return await getProjectWithCache(getProjectUid(projectUid));
            })
          );
        }
      case "do_indepth_reasoning":
        return await doIndepthReasoning(
          parsedArgs.context,
          parsedArgs.question
        );
      default:
        throw new Error(`Unknown function: ${name}`);
    }
  } catch (error) {
    console.error("[Chat API] Error parsing tool arguments:", error);
    console.error("[Chat API] Raw arguments:", args);
    throw new Error(
      `Failed to parse tool arguments: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

async function doIndepthReasoning(context: string, question: string) {
  const response = await openai.chat.completions.create({
    model: "o3-mini",
    messages: [
      {
        role: "system",
        content:
          "You are a helpful assistant that provides detailed analysis and reasoning.",
      },
      {
        role: "user",
        content: `Context: ${context}\n\nQuestion: ${question}\n\nPlease provide detailed reasoning and analysis.`,
      },
    ],
  });

  return response.choices[0].message.content || "No response generated";
}
