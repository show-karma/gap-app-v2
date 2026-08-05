/**
 * The project profile's visible-shell / streamed-body contract (DEV-612).
 *
 * This is deliberately NOT a renderToString test. `renderToString` has no
 * concept of a Suspense boundary flushing early — it resolves everything
 * before returning a single string — so it cannot tell "in the initially
 * visible HTML" apart from "streamed in later as a hidden chunk", which is
 * the only distinction this file exists to protect. It also cannot assert on
 * source text, which would prove nothing about what a crawler receives.
 *
 * So we drive the real layouts through `renderToPipeableStream` and take two
 * snapshots of the same render:
 *
 *   - `shellHtml`  — everything React had flushed at `onShellReady`, before
 *                    the page body resolved. This is what a reader without
 *                    JavaScript sees, and what a crawler indexes if it gives
 *                    up on the response early.
 *   - `fullHtml`   — the complete response at `onAllReady`, including the
 *                    `<div hidden id="S:n">` chunks that only the React swap
 *                    script reveals.
 *
 * The contract: the project's identity is in `shellHtml`; the tab body is
 * not, and arrives in `fullHtml` inside a hidden chunk.
 */
import { PassThrough } from "node:stream";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Suspense, use } from "react";
import { renderToPipeableStream } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  notFound: vi.fn(),
  redirect: vi.fn(),
  unstable_rethrow: vi.fn(),
  usePathname: () => "/project/test-project",
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({ projectId: "test-project" }),
}));

// Auth-dependent client hooks reach for the Privy bridge, which has no
// server-side equivalent. They gate interactive controls, not indexable
// content, so they are stubbed to their unauthenticated resting state.
vi.mock("@/hooks/useProjectPermissions", () => ({
  useProjectPermissions: () => ({ isProjectOwner: false, isProjectAdmin: false }),
}));

// The side panel's wallet-gated controls (subscribe, endorse, donate) call
// wagmi hooks, which need a WagmiProvider this render has no reason to stand
// up. Disconnected is the correct resting state for the anonymous/no-JS
// reader this test is about.
vi.mock("wagmi", () => ({
  useAccount: () => ({ address: undefined, isConnected: false, chain: undefined }),
  useChainId: () => 10,
  useSwitchChain: () => ({ switchChainAsync: vi.fn(), switchChain: vi.fn() }),
}));

vi.mock("@/components/Pages/Project/ProjectShareDialogMount", () => ({
  ProjectShareDialogMount: () => null,
}));

vi.mock("@/components/Utilities/E2EStoreExposer", () => ({
  E2EStoreExposer: () => null,
}));

vi.mock("@/utilities/queries/getProjectCachedData", () => ({
  getProjectCachedData: vi.fn(),
}));

vi.mock("@/utilities/metadata/projectMetadata", () => ({
  generateProjectOverviewMetadata: vi.fn(() => ({})),
}));

import type { Project } from "@/types/v2/project";
import { getProjectCachedData } from "@/utilities/queries/getProjectCachedData";

const mockGetProjectCachedData = vi.mocked(getProjectCachedData);

const PROJECT_TITLE = "Streaming Shell Test Project";
const PROJECT_DESCRIPTION =
  "A public goods project that funds open-source maintainers and publishes verifiable milestone reports every quarter.";
const PROJECT_WEBSITE = "https://example.org/streaming-shell";

/** Marker rendered by the suspended page body — must NOT be in the shell. */
const BODY_MARKER = "streamed-tab-body-marker";

function createMockProject(): Project {
  return {
    uid: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef" as `0x${string}`,
    chainID: 10,
    owner: "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd" as `0x${string}`,
    details: {
      title: PROJECT_TITLE,
      slug: "test-project",
      description: PROJECT_DESCRIPTION,
      links: [{ type: "website", url: PROJECT_WEBSITE }],
    },
    members: [],
    pointers: [],
    createdAt: "2024-01-01",
  } as unknown as Project;
}

/** Visible text a reader sees with JavaScript disabled. */
function visibleText(html: string): string {
  return html
    .replace(/<(script|style|noscript|template)\b[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function headings(html: string): string[] {
  return [...html.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)].map((match) => visibleText(match[1]));
}

/**
 * Stream the real layouts and snapshot the shell separately from the full
 * response. The page body suspends on a promise this helper controls, so the
 * shell snapshot is taken at a moment that genuinely precedes the body — not
 * by racing a timer.
 */
async function renderProfileStream(): Promise<{ shellHtml: string; fullHtml: string }> {
  let releaseBody: () => void = () => {};
  const bodyGate = new Promise<void>((resolve) => {
    releaseBody = resolve;
  });

  function SlowTabBody() {
    use(bodyGate);
    return <article data-testid={BODY_MARKER}>{BODY_MARKER}</article>;
  }

  const params = Promise.resolve({ projectId: "test-project" });

  const { default: ProfileLayout } = await import("@/app/project/[projectId]/(profile)/layout");
  const { default: ProjectLayout } = await import("@/app/project/[projectId]/layout");

  const profileTree = await ProfileLayout({
    children: <SlowTabBody />,
    params,
  });
  const tree = await ProjectLayout({
    children: profileTree,
    params,
  });

  // A single QueryClient shared by the layout's HydrationBoundary and the
  // client shell's useProject — the production arrangement, and the one that
  // proves the shell renders from the project record alone while the
  // grants/updates/impacts queries are still absent.
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  const chunks: Buffer[] = [];
  const sink = new PassThrough();
  sink.on("data", (chunk: Buffer) => chunks.push(chunk));

  let shellHtml = "";

  const fullHtml = await new Promise<string>((resolve, reject) => {
    sink.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    sink.on("error", reject);

    const { pipe } = renderToPipeableStream(
      <QueryClientProvider client={queryClient}>
        <Suspense fallback={null}>{tree}</Suspense>
      </QueryClientProvider>,
      {
        onShellReady() {
          pipe(sink);
          // Let the shell bytes land in `chunks` before snapshotting, then
          // release the body so the rest streams in behind it.
          setImmediate(() => {
            shellHtml = Buffer.concat(chunks).toString("utf8");
            releaseBody();
          });
        },
        onError: reject,
      }
    );
  });

  return { shellHtml, fullHtml };
}

describe("project profile — visible shell vs streamed tab body (DEV-612)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetProjectCachedData.mockResolvedValue(createMockProject());
    process.env.NEXT_PUBLIC_E2E_AUTH_BYPASS = "false";
  });

  it("puts the project's identity in the initially visible HTML", async () => {
    const { shellHtml } = await renderProfileStream();
    const text = visibleText(shellHtml);

    // Exactly one h1, and it is the project — not a tab heading, not a
    // "Project Not Found" fallback.
    expect(headings(shellHtml)).toEqual([PROJECT_TITLE]);

    // The real name and description, from SidebarProfileCardStatic.
    expect(text).toContain(PROJECT_TITLE);
    expect(text).toContain(PROJECT_DESCRIPTION.slice(0, 120));

    // Primary crawlable link off the identity card.
    expect(shellHtml).toContain(`href="${PROJECT_WEBSITE}"`);
  });

  it("holds the tab body back behind the scoped Suspense boundary", async () => {
    const { shellHtml } = await renderProfileStream();

    expect(shellHtml).not.toContain(BODY_MARKER);
    // The boundary's fallback stands in for it, and announces itself: an
    // <output> element carries implicit role="status" + aria-live="polite".
    expect(shellHtml).toContain("project-tab-content-skeleton");
    expect(shellHtml).toMatch(/<output[^>]*aria-label="Loading project content"/);
  });

  it("delivers the tab body later, as a hidden streamed chunk", async () => {
    const { shellHtml, fullHtml } = await renderProfileStream();

    expect(fullHtml).toContain(BODY_MARKER);
    expect(fullHtml.length).toBeGreaterThan(shellHtml.length);
    // The late content arrives in the hidden-div + swap-script form, which is
    // exactly what a no-JS reader cannot see — the trade this design makes.
    expect(fullHtml).toMatch(/<div hidden id="S:\d+"/);
  });

  it("renders the shell from the project record alone, with no grants/updates/impacts data", async () => {
    const { shellHtml } = await renderProfileStream();

    // Those queries never resolve in this render, so the counter badges must
    // be absent rather than rendered as zeros (CLAUDE.md: hide count-based
    // blocks at 0). The tab labels themselves may or may not be present
    // depending on viewport classes; the counts must not be.
    expect(shellHtml).not.toContain("tab-funding-count");
    expect(shellHtml).not.toContain("tab-team-count");
  });
});
