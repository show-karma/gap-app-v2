// import { openai } from "@ai-sdk/openai";
import { OpenAI } from "openai";
import { z } from "zod";
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
import { getCategoriesInProgram, getProjectsUsingEmbeddings } from "./util";
import {
  ChatCompletionMessageParam,
  ChatCompletionTool,
} from "openai/resources/chat/completions.mjs";
import { executeToolCall, tools } from "./tools";
import { getSystemMessage } from "./prompt";

// Allow streaming responses up to 60 seconds, can set to max 360 seconds
export const maxDuration = 60;

const chatRequestSchema = z.object({
  messages: z.array(
    z.object({
      content: z.string(),
      role: z.enum(["user", "assistant", "system", "tool"]),
      tool_call_id: z.string().optional(),
      tool_calls: z
        .array(
          z.object({
            id: z.string(),
            function: z.object({
              name: z.string(),
              arguments: z.string(),
            }),
          })
        )
        .optional(),
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
    console.log("[Chat API] Starting new chat request");
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

      await Promise.all(
        unpopulatedProjects.map(async (project) => {
          await populateProjectData(project);
          setPopulated(project.uid);
        })
      );

      const cacheEndTime = performance.now();
      console.log(
        `[Cache Population] Completed new projects. Total time: ${(
          cacheEndTime - cacheStartTime
        ).toFixed(2)}ms`
      );
    }
    const openai = new OpenAI();
    console.log("[Chat API] Created OpenAI instance");

    let currentMessages = [
      {
        role: "system",
        content: getSystemMessage(projectsInProgram, simplifiedProjects),
      },
      ...messages,
    ] as ChatCompletionMessageParam[];

    const encoder = new TextEncoder();
    const stream = new TransformStream();
    const writer = stream.writable.getWriter();

    const streamResponse = new Response(stream.readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });

    (async () => {
      let step = 0;
      try {
        console.log("[Chat API] Starting chat completion stream");
        while (true) {
          const loopId = crypto.randomUUID(); // Generate unique ID for this loop

          const completion = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: currentMessages,
            tools: tools as ChatCompletionTool[],
            stream: true,
          });

          let hasToolCalls = false;
          const finalToolCalls: Record<number, any> = {};
          let currentContent = "";

          // Create assistant message without tool_calls initially
          const assistantMessage: ChatCompletionMessageParam = {
            role: "assistant",
            content: "",
          };

          for await (const chunk of completion) {
            const delta = chunk.choices[0].delta;

            if (delta.tool_calls) {
              // Add tool_calls array only when we have tool calls
              if (!assistantMessage.tool_calls) {
                assistantMessage.tool_calls = [];
              }
              for (const toolCall of delta.tool_calls) {
                const { index } = toolCall;
                if (!finalToolCalls[index]) {
                  finalToolCalls[index] = {
                    id: toolCall.id,
                    type: toolCall.type,
                    index: toolCall.index,
                    function: {
                      name: toolCall.function?.name || "",
                      arguments: toolCall.function?.arguments || "",
                    },
                  };
                } else {
                  if (toolCall.function?.name) {
                    finalToolCalls[index].function.name =
                      toolCall.function.name;
                  }
                  if (toolCall.function?.arguments) {
                    finalToolCalls[index].function.arguments +=
                      toolCall.function.arguments;
                  }
                }
              }
            }

            if (delta.content) {
              currentContent += delta.content;
              assistantMessage.content = currentContent;
              if (delta.content.trim()) {
                await writer.write(
                  encoder.encode(
                    `data: ${JSON.stringify({
                      type: "content",
                      content: delta.content,
                      loopId,
                    })}\n\n`
                  )
                );
              }
            }
          }

          console.log("[Chat API] Final tool calls:", finalToolCalls);

          // Process tool calls after the streaming is complete
          const completeTools = Object.values(finalToolCalls).filter((t) => {
            try {
              return (
                t.function?.name &&
                t.function?.arguments &&
                JSON.parse(t.function.arguments)
              );
            } catch {
              return false;
            }
          });

          console.log("[Chat API] Complete tools:", completeTools);

          if (completeTools.length > 0) {
            hasToolCalls = true;
            assistantMessage.tool_calls = completeTools;
            currentMessages.push(assistantMessage);
            const toolResults = await Promise.all(
              completeTools.map(async (toolCall) => {
                const result = await executeToolCall(
                  toolCall,
                  getProjectUid,
                  projectsInProgram
                );
                const toolResponse = {
                  tool_call_id: toolCall.id,
                  role: "tool" as const,
                  content: JSON.stringify(result),
                };
                if (result) {
                  await writer.write(
                    encoder.encode(
                      `data: ${JSON.stringify({
                        type: "tool",
                        loopId, // Include the loop ID
                        ...toolResponse,
                      })}\n\n`
                    )
                  );
                }
                return toolResponse;
              })
            );
            currentMessages = [...currentMessages, ...toolResults];
          }
          if (currentContent.length > 0) {
            console.log("[Chat API] Current content:", currentContent);
          }
          console.log(
            "---------------------------------step-------------",
            step
          );
          step++;
          if (!hasToolCalls) {
            break;
          }
        }

        console.log("[Chat API] Stream completed");
        await writer.write(encoder.encode("data: [DONE]\n\n"));
        await writer.close();
      } catch (error) {
        console.error("[Chat API] Streaming error:", error);
        await writer.abort(error);
      }
    })();

    console.log("[Chat API] Returning stream response");
    return streamResponse;
  } catch (error) {
    console.error("[Chat API] Request error:", error);

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
