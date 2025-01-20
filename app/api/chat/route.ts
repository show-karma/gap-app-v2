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
    system: `You are Karma Co-pilot. Karma GAP is a web3 Grantee Accountability Protocol. You will help evaluators with project details and other grant related questions. Check your knowledge base before answering any questions.
    Only respond to questions using information from tool calls.
    if no relevant information is found in the tool calls, respond, "Sorry, I don't know. This is the programId to use incase you need to make any calls to any tool that requires it: ${programId}"`,
    tools: {
      getProjectsWithData: tool({
        description: `Get projects with data like name, metadata, milestones, updates, and impact.`,
        parameters: z.object({
          query: z.string().describe("the users query"),
          programId: z.string().describe("the program id"),
        }),
        execute: async ({ query, programId }) =>
          getProjectsWithData(query, programId),
      }),
    },
  });

  return result.toDataStreamResponse();
}
