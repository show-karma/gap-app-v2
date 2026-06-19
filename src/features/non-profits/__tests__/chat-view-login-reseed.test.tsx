import { render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Regression guard: opening a conversation that's private to your account while
// logged OUT fails getById (403 → "Conversation not found"). After signing in,
// the saved chat becomes readable, but the seeding effect keys on `searchId` and
// previously didn't re-fetch — the user had to refresh. ChatView must re-seed on
// the logged-out → in transition.

const { replace, search, abort, getById, authState } = vi.hoisted(() => ({
  replace: vi.fn(),
  search: vi.fn(),
  abort: vi.fn(),
  // Without a ready wallet (no token) → 403; with an address → an existing
  // (empty-turn) entry that resolves to a non-not-found state. We assert the
  // RE-FETCH, not the hydration.
  getById: vi.fn((_id: string) => ({
    match: (
      ok: (entry: { turns: unknown[]; query: string }) => void,
      err: (e: { type: string; status: number; message: string }) => void
    ) => {
      if (authState.address) ok({ turns: [], query: "climate funders" });
      else err({ type: "ApiError", status: 403, message: "forbidden" });
      return Promise.resolve();
    },
  })),
  // Models the Privy hydration race: `authenticated` flips true before the
  // wallet `address` (and thus the auth token) is populated.
  authState: { value: false, address: undefined as string | undefined },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, push: vi.fn(), prefetch: vi.fn() }),
}));
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ authenticated: authState.value, address: authState.address, login: vi.fn() }),
}));
vi.mock("../hooks/use-philanthropy-stream", () => ({
  usePhilanthropySearch: () => ({ search, abort }),
}));
vi.mock("../services/search-history.service", () => ({
  searchHistoryService: { getById },
}));

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

describe("ChatView — re-seeds a private conversation after sign-in", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authState.value = false;
    authState.address = undefined;
    usePhilanthropyStore.getState().reset();
    useSearchSessionStore.setState({ sessions: {} });
  });

  afterEach(() => {
    usePhilanthropyStore.getState().reset();
  });

  it("waits for the wallet address (not just authenticated) before re-fetching", () => {
    // Logged out: the private conversation 403s → "not found".
    const { rerender } = render(<ChatView searchId="B" />);
    expect(getById).toHaveBeenCalledTimes(1);
    expect(usePhilanthropyStore.getState().notFound).toBe(true);

    // Privy flips `authenticated` true, but the address/token haven't hydrated
    // yet. Re-fetching now would 401 again, so we must NOT re-seed here.
    authState.value = true;
    rerender(<ChatView searchId="B" />);
    expect(getById).toHaveBeenCalledTimes(1);
    expect(usePhilanthropyStore.getState().notFound).toBe(true);

    // The wallet address becomes available — auth is truly ready.
    authState.address = "0xabc";
    rerender(<ChatView searchId="B" />);

    // Now the conversation is re-fetched and not-found is cleared, no refresh.
    expect(getById).toHaveBeenCalledTimes(2);
    expect(usePhilanthropyStore.getState().notFound).toBe(false);
  });
});
