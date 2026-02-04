import { type NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { ONBOARDING_SYSTEM_PROMPT } from "@/components/Pages/OnboardingAssistant/prompts";

const MAX_CONTENT_LENGTH = 10 * 1024; // 10KB cap for fetched URLs
const URL_FETCH_TIMEOUT = 10_000; // 10s timeout
const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour
const RATE_LIMIT_MAX = 20;
const MAX_MESSAGES = 20;

// Simple in-memory rate limiting
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return true;
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    return false;
  }

  entry.count++;
  return true;
}

function stripHtmlTags(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Minimum meaningful content length - below this, the page is likely a SPA shell
const MIN_CONTENT_LENGTH = 200;
const JINA_READER_PREFIX = "https://r.jina.ai/";

async function fetchWithTimeout(
  url: string,
  timeoutMs: number,
  headers?: Record<string, string>
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "KarmaGAP-OnboardingAssistant/1.0",
        ...headers,
      },
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

async function fetchViaJinaReader(url: string): Promise<string> {
  try {
    const response = await fetchWithTimeout(
      `${JINA_READER_PREFIX}${url}`,
      15_000, // Jina needs more time to render JS
      { Accept: "text/plain" }
    );

    if (!response.ok) {
      return `[Could not fetch URL via reader: HTTP ${response.status}]`;
    }

    const text = await response.text();
    return text.slice(0, MAX_CONTENT_LENGTH);
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      return "[Could not fetch URL: reader timed out]";
    }
    return "[Could not fetch URL: reader error]";
  }
}

async function fetchUrlContent(url: string): Promise<string> {
  try {
    const response = await fetchWithTimeout(url, URL_FETCH_TIMEOUT);

    if (!response.ok) {
      // Direct fetch failed - try Jina Reader as fallback
      return fetchViaJinaReader(url);
    }

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("text/html") && !contentType.includes("text/plain")) {
      return `[Could not fetch URL: unsupported content type ${contentType}]`;
    }

    const text = await response.text();
    const stripped = stripHtmlTags(text);

    // If the stripped content is too short, the page is likely a SPA
    // that renders content client-side. Fall back to Jina Reader
    // which renders JavaScript before extracting text.
    if (stripped.length < MIN_CONTENT_LENGTH) {
      return fetchViaJinaReader(url);
    }

    return stripped.slice(0, MAX_CONTENT_LENGTH);
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      // Direct fetch timed out - try Jina Reader
      return fetchViaJinaReader(url);
    }
    return "[Could not fetch URL: network error]";
  }
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "OpenAI API key not configured" }, { status: 503 });
  }

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";

  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Please try again later." },
      { status: 429 }
    );
  }

  let body: { messages: { role: string; content: string }[]; urls?: string[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!body.messages || !Array.isArray(body.messages) || body.messages.length === 0) {
    return NextResponse.json({ error: "Messages array is required" }, { status: 400 });
  }

  // Trim to system prompt + last N messages
  const trimmedMessages = body.messages.slice(-MAX_MESSAGES);

  // Fetch URL contents if provided
  let urlContext = "";
  if (body.urls && body.urls.length > 0) {
    const urlResults = await Promise.all(
      body.urls.slice(0, 3).map(async (url) => {
        const content = await fetchUrlContent(url);
        return `\n---\nContent from ${url}:\n${content}\n---`;
      })
    );
    urlContext = urlResults.join("\n");
  }

  const openai = new OpenAI({ apiKey });
  const model = process.env.OPENAI_MODEL || "gpt-4o";
  const loopId = crypto.randomUUID();

  const systemMessage = urlContext
    ? `${ONBOARDING_SYSTEM_PROMPT}\n\nThe user provided the following URL content for reference:${urlContext}`
    : ONBOARDING_SYSTEM_PROMPT;

  try {
    const stream = await openai.chat.completions.create({
      model,
      stream: true,
      messages: [
        { role: "system" as const, content: systemMessage },
        ...trimmedMessages.map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
      ],
      temperature: 0.7,
      max_tokens: 2048,
    });

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          let fullContent = "";
          for await (const chunk of stream) {
            const delta = chunk.choices[0]?.delta?.content;
            if (delta) {
              fullContent += delta;
              const sseData = JSON.stringify({
                type: "content",
                content: delta,
                loopId,
              });
              controller.enqueue(encoder.encode(`data: ${sseData}\n\n`));
            }
          }

          // Send final message with full content
          const finalData = JSON.stringify({
            type: "final",
            content: fullContent,
            loopId,
          });
          controller.enqueue(encoder.encode(`data: ${finalData}\n\n`));
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (error) {
          const errorData = JSON.stringify({
            type: "error",
            content: "An error occurred while generating the response.",
            loopId,
          });
          controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("OpenAI API error:", error);
    return NextResponse.json(
      { error: "AI service is temporarily unavailable. Please try again." },
      { status: 503 }
    );
  }
}
