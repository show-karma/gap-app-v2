import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { useDraftFollowUpTargets } from "@/hooks/useFollowUpTargets";
import type { FollowUpTarget } from "@/types/follow-up-target";

const service = vi.hoisted(() => ({ suggestDraftFollowUpTargets: vi.fn() }));

vi.mock("@/services/milestoneActionItemsService", () => ({
  suggestDraftFollowUpTargets: service.suggestDraftFollowUpTargets,
  getFollowUpChannels: vi.fn(),
  getFollowUpWorkspaces: vi.fn(),
  searchFollowUpMembers: vi.fn(),
  setFollowUpTargets: vi.fn(),
  suggestFollowUpTargets: vi.fn(),
}));

const TARGET = { kind: "milestone" as const, id: "ms-1" };
const SUGGESTED: FollowUpTarget = {
  kind: "dm",
  teamId: "T1",
  slackUserId: "U1",
  displayName: "Mahesh",
  matchedBy: "program_reviewer",
  personName: "Mahesh",
  source: "suggested",
};
const PICKED: FollowUpTarget = {
  kind: "channel",
  teamId: "T1",
  channelId: "C1",
  channelName: "grants",
  source: "manual",
};

let queryClient: QueryClient;

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

function renderDraft(content: string, enabled: boolean) {
  return renderHook(({ text, on }) => useDraftFollowUpTargets("filecoin", TARGET, text, on), {
    wrapper,
    initialProps: { text: content, on: enabled },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  service.suggestDraftFollowUpTargets.mockResolvedValue([SUGGESTED]);
});

afterEach(() => {
  queryClient.clear();
});

describe("useDraftFollowUpTargets", () => {
  it("suggests from the settled draft text once opted in", async () => {
    const { result } = renderDraft("  Pinged Mahesh  ", true);

    await waitFor(() => expect(result.current.targets).toEqual([SUGGESTED]), { timeout: 2000 });
    expect(service.suggestDraftFollowUpTargets).toHaveBeenCalledWith(
      "filecoin",
      TARGET,
      "Pinged Mahesh"
    );
    expect(result.current.isFinding).toBe(false);
  });

  it("does not suggest while the note is not opted in", async () => {
    const { result } = renderDraft("Pinged Mahesh", false);

    await new Promise((resolve) => setTimeout(resolve, 900));

    expect(service.suggestDraftFollowUpTargets).not.toHaveBeenCalled();
    expect(result.current.targets).toEqual([]);
  });

  it("asks nothing of the server for an empty draft", async () => {
    const { result } = renderDraft("   ", true);

    await new Promise((resolve) => setTimeout(resolve, 900));

    expect(service.suggestDraftFollowUpTargets).not.toHaveBeenCalled();
    expect(result.current.targets).toEqual([]);
    expect(result.current.isFinding).toBe(false);
  });

  it("reports finding while the author is still typing", () => {
    const { result } = renderDraft("Pinged", true);

    expect(result.current.isFinding).toBe(true);
  });

  it("keeps a pick and stops suggesting as the text changes", async () => {
    const { result, rerender } = renderDraft("Pinged Mahesh", true);
    await waitFor(() => expect(result.current.targets).toEqual([SUGGESTED]), { timeout: 2000 });

    act(() => result.current.pick([PICKED]));
    rerender({ text: "Pinged Mahesh and Bruno", on: true });
    await new Promise((resolve) => setTimeout(resolve, 900));

    expect(result.current.targets).toEqual([PICKED]);
    expect(service.suggestDraftFollowUpTargets).toHaveBeenCalledTimes(1);
  });

  it("goes back to suggesting after a reset", async () => {
    const { result } = renderDraft("Pinged Mahesh", true);
    await waitFor(() => expect(result.current.targets).toEqual([SUGGESTED]), { timeout: 2000 });
    act(() => result.current.pick([PICKED]));

    act(() => result.current.reset());

    expect(result.current.targets).toEqual([SUGGESTED]);
  });
});
