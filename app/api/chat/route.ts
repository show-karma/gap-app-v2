import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import { streamText, tool } from "ai";
import axios from "axios";
import { envVars } from "@/utilities/enviromentVars";

function getProjectsWithData(query: string, programId: string) {
  const response: any = axios
    .get(
      `${envVars.NEXT_PUBLIC_GAP_INDEXER_URL}/projects/projects-by-embeddings?programId=${programId}&query=${query}`
    )
    .then((res) => {
      console.log(res);
      return res.data;
    });
  return response;
}

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages, programId } = await req.json();

  const result = streamText({
    model: openai("gpt-4o"),
    messages,
    system: `You are Karma Co-pilot, an AI assistant for the Karma Grantee Accountability Protocol (GAP) - a web3 platform that helps track and evaluate grant-funded projects.
    You will help evaluators with project details and other grant related questions. Check your knowledge base before answering any questions.
    This is the programId to use incase you need to make any calls to any tool that requires it: ${programId}

    Your role is to assist evaluators by:
    1. Analyzing project details, milestones and impact metrics
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
      getProjectsWithData: tool({
        description: `Retrieves comprehensive project information including project name, metadata, milestone progress, status updates, impact metrics, and evaluation data. This data is retrieved using semantic search based on the query provided.`,
        parameters: z.object({
          query: z.string().describe("the user's query"),
          programId: z.string().describe("the program id"),
        }),
        execute: async ({ query, programId }) =>
          getProjectsWithData(query, programId),
      }),
    },
  });

  return result.toDataStreamResponse();
}
