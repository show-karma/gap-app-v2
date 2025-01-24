import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import { streamText, tool } from "ai";
import axios from "axios";
import { envVars } from "@/utilities/enviromentVars";
import { INDEXER } from "@/utilities/indexer";
import { IProjectResponse } from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";

function getProjectsUsingEmbeddings(
  query: string,
  projectsFilter: { uid: string; chainId: number }[] | undefined
) {
  const response: any = axios
    .post(`${envVars.NEXT_PUBLIC_GAP_INDEXER_URL}/projects/by-embeddings`, {
      projectsFilter,
      query,
    })
    .then((res) => {
      return res.data;
    });
  return response;
}

function getGrantsOfProject(projectUidOrSlug: string) {
  const response: any = axios
    .get(INDEXER.PROJECT.GET(projectUidOrSlug))
    .then((res) => {
      const project: IProjectResponse = res.data;
      const grants = project.grants;
      const formattedGrants = grants.map((grant) => ({
        ...grant?.details?.data,
      }));
      return formattedGrants;
    });
  return response;
}

function getImpactsOfProject(projectUidOrSlug: string) {
  const response: any = axios
    .get(INDEXER.PROJECT.GET(projectUidOrSlug))
    .then((res) => {
      const project: IProjectResponse = res.data;
      const impacts = project.impacts;
      const formattedImpacts = impacts.map((impact) => ({
        ...impact?.data,
        createdAt: impact?.createdAt,
      }));
      return formattedImpacts;
    });
  return response;
}

function getMilestonesOfProject(projectUidOrSlug: string) {
  const response: any = axios
    .get(INDEXER.PROJECT.GET(projectUidOrSlug))
    .then((res) => {
      const project: IProjectResponse = res.data;
      const milestones = project.milestones;
      const formattedMilestones = milestones.map((milestone) => ({
        ...milestone?.data,
        createdAt: milestone?.createdAt,
      }));
      return formattedMilestones;
    });
  return response;
}

function getMemebersOfProject(projectUidOrSlug: string) {
  const response: any = axios
    .get(INDEXER.PROJECT.GET(projectUidOrSlug))
    .then((res) => {
      const project: IProjectResponse = res.data;
      const members = project.members;
      const formattedMembers = members.map((member) => member?.recipient);
      console.log("formattedMembers", formattedMembers);
      return formattedMembers;
    });
  return response;
}

function getUpdatesOfProject(projectUidOrSlug: string) {
  const response: any = axios
    .get(INDEXER.PROJECT.FEED(projectUidOrSlug))
    .then((res) => {
      const updates = res.data;
      const formattedUpdates = updates.map((update: any) => ({
        ...update?.data,
        createdAt: update?.createdAt,
      }));
      return formattedUpdates;
    });
  return response;
}

function getCategoriesOfProject(projectUidOrSlug: string) {
  const response: any = axios
    .get(INDEXER.PROJECT.GET(projectUidOrSlug))
    .then((res) => {
      const project = res.data as IProjectResponse & {
        categories: { name: string }[];
      };
      const categories = project.categories.map((category) => category.name);
      return categories;
    });
  return response;
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
  projectsFilter: z
    .array(
      z.object({
        uid: z.string(),
        chainId: z.number(),
      })
    )
    .optional(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const validatedData = chatRequestSchema.parse(body);
    const { messages, projectsFilter } = validatedData;

    const result = streamText({
      model: openai("gpt-4o"),
      messages,
      system: `You are Karma Co-pilot, an AI assistant for the Karma Grantee Accountability Protocol (GAP) - a web3 platform that helps track and evaluate grant-funded projects.
            You will help evaluators with project details and other grant related questions. Check your knowledge base before answering any questions.
            ${
              projectsFilter
                ? `Use this projects filter to make calls to the Projects Lookup tool: ${projectsFilter}`
                : ""
            }
            
            Your role is to assist evaluators by:
            1. Analyzing project details, milestones, impact, updates and members
            2. Providing insights on project progress and outcomes
            3. Helping compare different projects within programs
            4. Offering data-driven evaluation recommendations
            
            Important guidelines:
            1. Try to provide information obtained from tool calls to ensure accuracy
            2. Use numbered lists instead of bullet points in markdown responses where possible
            3. Structure responses clearly with relevant headings and sections
            4. Include specific metrics and data points when available
            5. Maintain a professional yet approachable tone
            
            Only respond to questions using information from tool calls. Incase you return markdown, avoid using bullet points- use numbered lists instead wherever possible.
            if no relevant information is found in the tool calls, respond, "Sorry, I don't know. "`,
      tools: {
        lookupProjects: tool({
          description: `Retrieve a list of projects based on given context rich query sentence against a vector store of project data embeddings which has context of project name, details, milestones, updates, work impact, funding program data. `,
          parameters: z.object({
            query: z.string().describe("Query for project search"),
          }),
          execute: async ({ query }) =>
            getProjectsUsingEmbeddings(query, projectsFilter),
        }),
        fetchGrantsOfProject: tool({
          description: `Retrieves all grants of a project`,
          parameters: z.object({
            projectUidOrSlug: z.string().describe("the project uid or slug"),
          }),
          execute: async ({ projectUidOrSlug }) =>
            getGrantsOfProject(projectUidOrSlug),
        }),
        fetchImpactsOfProject: tool({
          description: `Retrieves all impacts of a project`,
          parameters: z.object({
            projectUidOrSlug: z.string().describe("the project uid or slug"),
          }),
          execute: async ({ projectUidOrSlug }) =>
            getImpactsOfProject(projectUidOrSlug),
        }),
        fetchMilestonesOfProject: tool({
          description: `Retrieves all milestones of a project`,
          parameters: z.object({
            projectUidOrSlug: z.string().describe("the project uid or slug"),
          }),
          execute: async ({ projectUidOrSlug }) =>
            getMilestonesOfProject(projectUidOrSlug),
        }),
        fetchMembersOfProject: tool({
          description: `Retrieves all members of a project`,
          parameters: z.object({
            projectUidOrSlug: z.string().describe("the project uid or slug"),
          }),
          execute: async ({ projectUidOrSlug }) =>
            getMemebersOfProject(projectUidOrSlug),
        }),
        fetchUpdatesOfProject: tool({
          description: `Retrieves all updates of a project`,
          parameters: z.object({
            projectUidOrSlug: z.string().describe("the project uid or slug"),
          }),
          execute: async ({ projectUidOrSlug }) =>
            getUpdatesOfProject(projectUidOrSlug),
        }),
        fetchCategoriesOfProject: tool({
          description: `Retrieves all categories of a project`,
          parameters: z.object({
            projectUidOrSlug: z.string().describe("the project uid or slug"),
          }),
          execute: async ({ projectUidOrSlug }) =>
            getCategoriesOfProject(projectUidOrSlug),
        }),
      },
    });

    return result.toDataStreamResponse();
  } catch (error) {
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

    console.error("Chat API Error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
