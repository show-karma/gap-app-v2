import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Regression guard for the "New chat" bounce-back bug: from a loaded
// conversation, clicking "New chat" flashed an empty page and then snapped back
// to the previous search. Cause: the seeding effect depended on
// `messages.length`, so reset() re-fired it while the URL (searchId) was still
// the OLD id (router.replace is async) — re-fetching and re-hydrating the old
// conversation. This test pins the invariant: after "New chat", the old
// conversation must NOT be re-fetched via searchHistoryService.getById.

// vi.mock factories are hoisted above the module body, so the spies they close
// over must be created via vi.hoisted (which runs first).
const { replace, search, abort, getById } = vi.hoisted(() => ({
  replace: vi.fn(),
  // Stable search/abort identities so the seeding effect doesn't re-run on their
  // account (only `searchId` should drive it).
  search: vi.fn(),
  abort: vi.fn(),
  getById: vi.fn(() => ({ match: vi.fn() })),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, push: vi.fn(), prefetch: vi.fn() }),
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ authenticated: true, login: vi.fn() }),
}));

vi.mock("../hooks/use-philanthropy-stream", () => ({
  usePhilanthropySearch: () => ({ search, abort }),
}));

vi.mock("../services/search-history.service", () => ({
  searchHistoryService: { getById },
}));

// Thin stubs for child components — irrelevant to the navigation logic.
vi.mock("@/components/ui/spinner", () => ({ Spinner: () => <div /> }));
vi.mock("@/src/components/ai-elements/conversation", () => ({
  Conversation: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  ConversationContent: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  ConversationEmptyState: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  ConversationScrollButton: () => <div />,
}));
vi.mock("@/src/components/ai-elements/message", () => ({
  Message: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  MessageContent: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock("@/src/components/ai-elements/prompt-input", () => ({
  PromptInput: ({ children }: { children?: React.ReactNode }) => <form>{children}</form>,
  PromptInputBody: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  PromptInputFooter: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  PromptInputSubmit: () => <button type="submit">send</button>,
  PromptInputTextarea: () => <textarea />,
  PromptInputTools: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock("../components/attachments-panel", () => ({ AttachmentsPanel: () => <div /> }));
vi.mock("../components/bookmarks-drawer", () => ({ BookmarksDrawer: () => <div /> }));
vi.mock("../components/composer-lock-notice", () => ({ ComposerLockNotice: () => <div /> }));
vi.mock("../components/connector-nudge", () => ({ ConnectorNudge: () => <div /> }));
vi.mock("../components/entity-list", () => ({ EntityList: () => <div /> }));
vi.mock("../components/narrative-block", () => ({ NarrativeBlock: () => <div /> }));
vi.mock("../components/progress-view", () => ({ ProgressView: () => <div /> }));
vi.mock("../components/search-feedback", () => ({ SearchFeedback: () => <div /> }));
vi.mock("../components/search-history-panel", () => ({ SearchHistoryPanel: () => <div /> }));

import { ChatView } from "../components/chat-view-client";
import { usePhilanthropyStore } from "../store/philanthropy";
import { useSearchSessionStore } from "../store/search-session";

const turnA = {
  id: "turn-1",
  userQuery: "climate funders in CA",
  narrative: "Here are some funders.",
  entities: [],
  citations: [],
  traceId: null,
  pagination: null,
  status: "done" as const,
  error: null,
  progress: null,
  attachments: [],
};

describe("ChatView — New chat does not resurrect the previous conversation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    usePhilanthropyStore.getState().reset();
    // Session "A" exists (so the buggy path would have a query to re-run) but is
    // NOT marked fresh — a revisit, i.e. exactly the case that re-fetches.
    useSearchSessionStore.getState().setSession("A", "climate funders in CA");
    // Store already holds session A's loaded thread.
    usePhilanthropyStore.setState({ messages: [turnA], threadId: "A" });
  });

  afterEach(() => {
    usePhilanthropyStore.getState().reset();
  });

  it("does not call searchHistoryService.getById for the old id after New chat", () => {
    render(<ChatView searchId="A" />);

    // Mount adopts the in-memory thread for A — no fetch.
    expect(getById).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "New chat" }));

    // router.replace fired (navigation to the fresh session was requested)...
    expect(replace).toHaveBeenCalledTimes(1);
    // ...but the OLD conversation must NOT be re-fetched. With `messages.length`
    // back in the effect deps, reset() re-ran the effect against the stale
    // searchId="A" and called getById("A"), hydrating the old chat back in.
    expect(getById).not.toHaveBeenCalled();
  });
});
