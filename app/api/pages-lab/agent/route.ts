import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { type NextRequest, NextResponse } from "next/server";

const DEFAULT_MODEL = process.env.PAGES_LAB_MODEL ?? "claude-sonnet-5-5";

/** Chosen per request so the two can be compared without a restart. */
const ALLOWED_MODELS = ["claude-haiku-5-5", "claude-sonnet-5-5", "claude-opus-5-5"];

function resolveModel(requested: unknown): string {
  return typeof requested === "string" && ALLOWED_MODELS.includes(requested)
    ? requested
    : DEFAULT_MODEL;
}
const MAX_TOOL_ROUNDS = 10;
const MAX_TOKENS = 64000;

const SYSTEM = `You author a single self-contained HTML page that a reviewer reads in a preview pane and marks up.

Rules:
- Reply with the HTML document only. No prose, no markdown fences.
- Emit one complete document: <!DOCTYPE html>, <head> with an inline <style>, <body>.
- Put data-pl-id on every top-level block in the body (sections, headers, cards, tables, paragraphs that stand alone). Use short kebab-case ids that describe the content, e.g. data-pl-id="funding-summary".
- When revising a page you were given, KEEP the existing data-pl-id of every block you did not rewrite. Those ids are what the reviewer's comments are pinned to. Only mint a new id for a genuinely new block.
- No <script>, no <iframe>, no inline event handlers. They are stripped before render.
- Style the page yourself in the inline <style>. Assume a white background and a readable serif or system font.`;

const CLIENT_BLOCK = "You are Claude Code, Anthropic's official CLI for Claude.";

interface AgentBody {
  prompt?: unknown;
  html?: unknown;
  comments?: unknown;
  model?: unknown;
}

interface ToolUse {
  type: "tool_use";
  id: string;
  name: string;
  input: Record<string, unknown>;
}

/**
 * The route spends model tokens and reads the Karma API on behalf of whoever
 * calls it, with no authentication — so it stays off unless an environment
 * explicitly turns it on. Previews opt in; production does not.
 */
const ENABLED = process.env.PAGES_LAB_ENABLED === "1";

/**
 * A generation with tool rounds runs well past a serverless function's default
 * ceiling, which would kill it on a deployed preview.
 */
export const maxDuration = 300;

/**
 * The panel reads production regardless of which indexer the surrounding app
 * points at, so a preview needs no extra configuration to show real numbers.
 * Reads only, and PAGES_LAB_API_URL overrides it when a branch needs staging.
 */
const PANELS_API_URL = (process.env.PAGES_LAB_API_URL ?? "https://gapapi.karmahq.xyz").replace(
  /\/+$/,
  ""
);

function apiHost(): string {
  try {
    return new URL(PANELS_API_URL).host;
  } catch {
    return PANELS_API_URL;
  }
}

export async function POST(request: NextRequest) {
  if (!ENABLED) return new NextResponse(null, { status: 404 });

  const body = (await request.json().catch(() => null)) as AgentBody | null;
  if (!body || typeof body.prompt !== "string") {
    return NextResponse.json({ kind: "error", message: "prompt is required" }, { status: 400 });
  }

  const html = typeof body.html === "string" ? body.html : null;
  const comments = Array.isArray(body.comments) ? body.comments : [];
  const userMessage = buildUserMessage(body.prompt, html, comments);
  const model = resolveModel(body.model);

  const auth = resolveAuth();
  if (!auth) {
    return NextResponse.json({
      kind: "dry",
      prompt: `${SYSTEM}\n\n---\n\n${userMessage}`,
    });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const emit = (event: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      };

      try {
        const text = await runAgent(auth, userMessage, model, emit);
        emit({ t: "done", html: stripFences(text), note: body.prompt, model });
      } catch (cause) {
        const fallback = resolveFallback(auth);
        if (fallback && isFallbackError(cause)) {
          try {
            const text = await runAgent(fallback, userMessage, model, emit);
            emit({ t: "done", html: stripFences(text), note: body.prompt, model });
          } catch (retry) {
            emit({ t: "error", message: messageOf(retry) });
          }
        } else {
          emit({ t: "error", message: messageOf(cause) });
        }
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
    },
  });
}

const messageOf = (cause: unknown) =>
  cause instanceof Error ? cause.message : "agent call failed";

function buildUserMessage(
  prompt: string,
  html: string | null,
  comments: { label?: unknown; id?: unknown; body?: unknown }[]
): string {
  if (!html) return `Build a page. Request:\n${prompt}`;

  const parts = [`Revise the page below.\n\nRequest:\n${prompt || "(apply the pinned comments)"}`];

  if (comments.length > 0) {
    const pinned = comments
      .map(
        (comment) =>
          `- [${String(comment.id)}] "${String(comment.label)}" → ${String(comment.body)}`
      )
      .join("\n");
    parts.push(`Comments pinned to blocks:\n${pinned}`);
  }

  parts.push(`Current page:\n${html}`);
  return parts.join("\n\n");
}

type Auth = { kind: "oauth"; token: string } | { kind: "apiKey"; key: string };

/**
 * Token-first, mirroring the indexer's anthropic-client.factory: an OAuth token
 * goes in `Authorization: Bearer` and an API key in `x-api-key` — the API
 * rejects each under the other header.
 */
function resolveAuth(): Auth | null {
  const token = process.env.ANTHROPIC_AUTH_TOKEN ?? process.env.CLAUDE_CODE_OAUTH_TOKEN;
  if (token) return { kind: "oauth", token };

  const local = readLocalClaudeToken();
  if (local) return local;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (apiKey) return { kind: "apiKey", key: apiKey };

  return null;
}

function resolveFallback(primary: Auth): Auth | null {
  if (primary.kind === "apiKey") return null;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  return apiKey ? { kind: "apiKey", key: apiKey } : null;
}

function readLocalClaudeToken(): Auth | null {
  if (process.env.PAGES_LAB_USE_LOCAL_CLAUDE !== "1") return null;

  try {
    const raw = readFileSync(join(homedir(), ".claude", ".credentials.json"), "utf8");
    const parsed = JSON.parse(raw) as {
      claudeAiOauth?: { accessToken?: string; expiresAt?: number };
    };
    const token = parsed.claudeAiOauth?.accessToken;
    if (!token) return null;

    const expiresAt = parsed.claudeAiOauth?.expiresAt;
    if (typeof expiresAt === "number" && expiresAt <= Date.now()) return null;

    return { kind: "oauth", token };
  } catch {
    return null;
  }
}

/**
 * An OAuth-authenticated request is refused (opaque 429) unless its first
 * system block identifies the official client, which is what the Agent SDK
 * sends. The breakpoint sits on the last block so tools + system cache as one
 * prefix.
 */
function systemFor(auth: Auth) {
  const lab = { type: "text" as const, text: SYSTEM, cache_control: { type: "ephemeral" } };
  if (auth.kind === "apiKey") return [lab];
  return [{ type: "text" as const, text: CLIENT_BLOCK }, lab];
}

function authHeaders(auth: Auth): Record<string, string> {
  if (auth.kind === "apiKey") return { "x-api-key": auth.key };
  return {
    authorization: `Bearer ${auth.token}`,
    "anthropic-beta": "oauth-2025-04-20",
  };
}

class AnthropicCallError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
  }
}

function isFallbackError(cause: unknown): boolean {
  return cause instanceof AnthropicCallError && (cause.status === 429 || cause.status === 401);
}

/**
 * A generation runs for the better part of a minute, so a dropped socket must
 * not lose it. Only transport failures are retried — an HTTP response, even an
 * error one, is handed back for the status checks to interpret.
 */
async function postWithRetry(headers: Record<string, string>, body: string): Promise<Response> {
  let lastCause: unknown;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers,
        body,
      });
    } catch (cause) {
      lastCause = cause;
      await new Promise((resolve) => setTimeout(resolve, 400 * (attempt + 1)));
    }
  }

  throw new AnthropicCallError(
    `could not reach the Anthropic API (${messageOf(lastCause)}) — retried 3 times`,
    0
  );
}

type Emit = (event: Record<string, unknown>) => void;

type StreamEvent =
  | {
      type: "content_block_start";
      index: number;
      content_block: { type: string; name?: string; id?: string };
    }
  | {
      type: "content_block_delta";
      index: number;
      delta:
        | { type: "text_delta"; text: string }
        | { type: "input_json_delta"; partial_json: string }
        | { type: string };
    }
  | { type: "message_delta"; delta: { stop_reason?: string } }
  | { type: "error"; error: { type?: string; message?: string } }
  | { type: string };

interface RoundResult {
  text: string;
  toolUses: ToolUse[];
  raw: unknown[];
  stopReason: string | null;
}

async function runAgent(
  auth: Auth,
  userMessage: string,
  model: string,
  emit: Emit
): Promise<string> {
  const dataToolEnabled = process.env.PAGES_LAB_DATA_TOOL === "1";
  const messages: { role: "user" | "assistant"; content: unknown }[] = [
    { role: "user", content: userMessage },
  ];

  for (let round = 0; round <= MAX_TOOL_ROUNDS; round += 1) {
    const payload: Record<string, unknown> = {
      model,
      max_tokens: MAX_TOKENS,
      stream: true,
      system: systemFor(auth),
      messages,
    };
    if (dataToolEnabled) payload.tools = KARMA_TOOLS;

    const response = await postWithRetry(
      {
        "content-type": "application/json",
        "anthropic-version": "2023-06-01",
        ...authHeaders(auth),
      },
      JSON.stringify(payload)
    );

    await assertOk(response, auth);
    const result = await readRound(response, emit);

    if (result.toolUses.length === 0) {
      if (result.stopReason === "max_tokens") {
        throw new Error(
          `the page hit the ${MAX_TOKENS}-token ceiling and is incomplete — ask for a shorter page`
        );
      }
      if (result.stopReason === "refusal") {
        throw new Error("the model declined this request");
      }
      return result.text;
    }

    messages.push({ role: "assistant", content: result.raw });
    messages.push({
      role: "user",
      content: await runToolBatch(result.toolUses, emit),
    });
    moveCacheBreakpoint(messages);
  }

  throw new Error("agent exceeded the tool-round budget");
}

async function assertOk(response: Response, auth: Auth): Promise<void> {
  if (response.ok) return;

  if (response.status === 429) {
    throw new AnthropicCallError(
      auth.kind === "oauth"
        ? "oauth token is rate limited — set ANTHROPIC_API_KEY to fall back"
        : "api key is rate limited",
      429
    );
  }

  if (response.status === 401) {
    throw new AnthropicCallError(
      auth.kind === "oauth" ? "oauth token rejected or revoked" : "api key rejected",
      401
    );
  }

  const detail = await response.text().catch(() => "");
  throw new AnthropicCallError(
    `anthropic ${response.status}: ${detail.slice(0, 300)}`,
    response.status
  );
}

/** Consume one SSE round, forwarding text deltas as they arrive. */
async function readRound(response: Response, emit: Emit): Promise<RoundResult> {
  const reader = response.body?.getReader();
  if (!reader) throw new Error("the API returned no stream");

  const decoder = new TextDecoder();
  const blocks = new Map<number, { type: string; name?: string; id?: string; buffer: string }>();
  let text = "";
  let pending = "";
  let stopReason: string | null = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    pending += decoder.decode(value, { stream: true });
    const lines = pending.split("\n");
    pending = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const event = JSON.parse(line.slice(6)) as StreamEvent;

      // A mid-stream error ends the SSE normally; without this the partial
      // text would be returned as if the page were finished.
      if (event.type === "error" && "error" in event) {
        throw new AnthropicCallError(
          `stream failed: ${event.error.type ?? "error"} ${event.error.message ?? ""}`.trim(),
          0
        );
      }

      if (event.type === "message_delta" && "delta" in event) {
        stopReason = event.delta.stop_reason ?? stopReason;
        continue;
      }

      if (event.type === "content_block_start" && "content_block" in event) {
        blocks.set(event.index, {
          type: event.content_block.type,
          name: event.content_block.name,
          id: event.content_block.id,
          buffer: "",
        });
        continue;
      }

      if (event.type !== "content_block_delta" || !("delta" in event)) continue;

      const block = blocks.get(event.index);
      if (!block) continue;

      if (event.delta.type === "text_delta" && "text" in event.delta) {
        text += event.delta.text;
        block.buffer += event.delta.text;
        emit({ t: "delta", text: event.delta.text });
      }

      if (event.delta.type === "input_json_delta" && "partial_json" in event.delta) {
        block.buffer += event.delta.partial_json;
      }
    }
  }

  const toolUses: ToolUse[] = [];
  const raw: unknown[] = [];

  for (const block of blocks.values()) {
    // An echoed text block must be non-empty; a tool round often produces one
    // with nothing in it.
    if (block.type === "text") {
      if (block.buffer.trim().length > 0) raw.push({ type: "text", text: block.buffer });
      continue;
    }
    if (block.type !== "tool_use") continue;

    const input = block.buffer.length > 0 ? safeParse(block.buffer) : {};
    const use: ToolUse = {
      type: "tool_use",
      id: block.id ?? "",
      name: block.name ?? "",
      input,
    };
    toolUses.push(use);
    raw.push(use);
  }

  return { text, toolUses, raw, stopReason };
}

function safeParse(value: string): Record<string, unknown> {
  try {
    return JSON.parse(value) as Record<string, unknown>;
  } catch {
    return {};
  }
}

/**
 * All results go back in one user message — splitting them teaches the model to
 * stop calling tools in parallel.
 */
async function runToolBatch(toolUses: ToolUse[], emit: Emit): Promise<unknown[]> {
  const results = await Promise.all(
    toolUses.map(async (use) => {
      emit({ t: "tool", name: use.name, detail: describeTool(use) });
      return {
        type: "tool_result",
        tool_use_id: use.id,
        content: await runTool(use.name, use.input),
      };
    })
  );

  return results;
}

/**
 * One breakpoint, always on the newest tool result, so each round reads the
 * transcript so far from cache. The API allows four in total and the system
 * block holds one, so the old marker has to be cleared rather than left behind.
 */
function moveCacheBreakpoint(messages: { role: string; content: unknown }[]): void {
  for (const message of messages) {
    if (!Array.isArray(message.content)) continue;
    for (const block of message.content) {
      if (block && typeof block === "object") {
        delete (block as Record<string, unknown>).cache_control;
      }
    }
  }

  const last = messages.at(-1);
  if (!last || !Array.isArray(last.content)) return;

  const block = last.content.at(-1);
  if (block && typeof block === "object") {
    (block as Record<string, unknown>).cache_control = { type: "ephemeral" };
  }
}

function describeTool(use: ToolUse): string {
  if (use.name === "karma_api_search_docs") return String(use.input.query ?? "");

  return `${apiHost()}${String(use.input.path ?? "")}`;
}

const KARMA_TOOLS = [
  {
    name: "karma_api_search_docs",
    description:
      "Search the Karma API's live OpenAPI spec for read operations. Returns matching operations, with full parameters for the closest matches, so one call is usually enough to build a request. Start here: the spec is the source of truth for what exists, so look the endpoint up instead of guessing a URL. You may call several tools at once when the calls are independent.",
    input_schema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Words to match against path, summary and tags, e.g. 'community programs'",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "karma_api_get_operation",
    description:
      "Full detail for one operation when the search result was not enough. Usually unnecessary — search already returns parameters for its best matches.",
    input_schema: {
      type: "object",
      properties: {
        path: { type: "string", description: "Spec path, e.g. /v2/projects/{identifier}" },
      },
      required: ["path"],
    },
  },
  {
    name: "karma_get",
    description:
      "Execute a GET against the Karma API and return the JSON. The path must be a GET the spec declares; a query string is allowed. Prefer narrow paths and paginate. You may call this several times at once for independent paths.",
    input_schema: {
      type: "object",
      properties: {
        path: { type: "string", description: "e.g. /v2/communities/filecoin/programs" },
      },
      required: ["path"],
    },
  },
];

interface OpenApiSpec {
  paths: Record<
    string,
    Record<
      string,
      { summary?: string; description?: string; tags?: string[]; parameters?: unknown }
    >
  >;
}

let specCache: { spec: OpenApiSpec; at: number } | null = null;
const SPEC_TTL_MS = 10 * 60 * 1000;
const DETAILED_MATCHES = 3;
const MAX_BODY_CHARS = 40000;

async function loadSpec(): Promise<OpenApiSpec> {
  if (specCache && Date.now() - specCache.at < SPEC_TTL_MS) return specCache.spec;

  const response = await fetch(`${PANELS_API_URL}/v2/docs/json`);
  if (!response.ok) throw new Error(`spec fetch failed: ${response.status}`);

  const spec = (await response.json()) as OpenApiSpec;
  specCache = { spec, at: Date.now() };
  return spec;
}

function getOperations(spec: OpenApiSpec) {
  return Object.entries(spec.paths ?? {})
    .filter(([, methods]) => Boolean(methods.get))
    .map(([path, methods]) => ({
      path,
      summary: methods.get?.summary ?? "",
      tags: methods.get?.tags ?? [],
      parameters: methods.get?.parameters,
    }));
}

/** A spec path with {params} matches a concrete request path segment-wise. */
function specPathMatches(specPath: string, requestPath: string): boolean {
  const a = specPath.split("/");
  const b = requestPath.split("?")[0].split("/");
  if (a.length !== b.length) return false;
  return a.every((seg, i) =>
    seg.startsWith("{") && seg.endsWith("}") ? b[i].length > 0 : seg === b[i]
  );
}

async function runTool(name: string, input: Record<string, unknown>): Promise<string> {
  try {
    if (name === "karma_api_search_docs") return await searchDocs(String(input.query ?? ""));
    if (name === "karma_api_get_operation") return await getOperation(String(input.path ?? ""));
    if (name === "karma_get") return await karmaGet(String(input.path ?? ""));
    return `error: unknown tool ${name}`;
  } catch (cause) {
    return `error: ${messageOf(cause)}`;
  }
}

/** Top matches come back with their parameters, so a second lookup is rarely needed. */
async function searchDocs(query: string): Promise<string> {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  const scored = getOperations(await loadSpec())
    .map((op) => {
      const haystack = `${op.path} ${op.summary} ${op.tags.join(" ")}`.toLowerCase();
      return { op, score: terms.filter((term) => haystack.includes(term)).length };
    })
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 30);

  if (scored.length === 0) return `no GET operations match "${query}"`;

  const detailed = scored
    .slice(0, DETAILED_MATCHES)
    .map(({ op }) =>
      [
        `GET ${op.path} — ${op.summary}`,
        `  parameters: ${JSON.stringify(op.parameters ?? [])}`.slice(0, 1800),
      ].join("\n")
    );
  const rest = scored.slice(DETAILED_MATCHES).map(({ op }) => `GET ${op.path} — ${op.summary}`);

  return [...detailed, ...rest].join("\n");
}

async function getOperation(path: string): Promise<string> {
  const spec = await loadSpec();
  const operation = spec.paths?.[path]?.get;
  if (!operation) return `error: no GET operation at ${path}`;
  return JSON.stringify(
    {
      path,
      summary: operation.summary,
      description: operation.description,
      parameters: operation.parameters,
    },
    null,
    1
  ).slice(0, 8000);
}

async function karmaGet(path: string): Promise<string> {
  if (/\{[^}]+\}/.test(path)) {
    return `error: ${path} still contains a {placeholder} — substitute the real value before calling`;
  }

  const operations = getOperations(await loadSpec());
  if (!operations.some((op) => specPathMatches(op.path, path))) {
    return `error: ${path} is not a GET the spec declares — find it with karma_api_search_docs first`;
  }

  const response = await fetch(`${PANELS_API_URL}${path}`);
  if (!response.ok) return `error: ${response.status} ${response.statusText}`;

  const body = await response.text();
  if (body.length <= MAX_BODY_CHARS) return body;
  return `${body.slice(0, MAX_BODY_CHARS)}\n\n[truncated at ${MAX_BODY_CHARS} characters — narrow the path or paginate]`;
}

function stripFences(text: string): string {
  const fenced = text.match(/```(?:html)?\s*([\s\S]*?)```/);
  return (fenced ? fenced[1] : text).trim();
}
