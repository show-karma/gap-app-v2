import { render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Regression guard: opening a conversation that's private to your account while
// logged OUT fails getById (403 → "Conversation not found"). After signing in,
// the saved chat becomes readable, but the seeding effect keys on `searchId` and
// previously didn't re-fetch — the user had to refresh. ChatView must recover it.
//
// The recovery gates on the actual auth TOKEN (what apiFetch uses), not on
// `authenticated` or a wallet address: Privy flips `authenticated` true before
// the JWT is minted (and flickers during wagmi sync), and email/social logins
// never expose a wallet address. So we must NOT re-fetch until a token exists.

const { replace, search, abort, getById, getToken, authState } = vi.hoisted(() => ({
  replace: vi.fn(),
  search: vi.fn(),
  abort: vi.fn(),
  // With a token the server returns an existing (empty-turn) entry that resolves
  // to a non-not-found state; without one it 403s. We assert the RE-FETCH.
  getById: vi.fn((_id: string) => ({
    match: (
      ok: (entry: { turns: unknown[]; query: string }) => void,
      err: (e: { type: string; status: number; message: string }) => void
    ) => {
      if (authState.token) ok({ turns: [], query: "climate funders" });
      else err({ type: "ApiError", status: 403, message: "forbidden" });
      return Promise.resolve();
    },
  })),
  getToken: vi.fn(async () => authState.token),
  // `value` = Privy `authenticated`; `token` = the JWT, which lags and can be
  // absent while authenticated is already true (the flicker window).
  authState: { value: false, token: null as string | null },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, push: vi.fn(), prefetch: vi.fn() }),
}));
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ authenticated: authState.value, login: vi.fn() }),
}));
vi.mock("@/utilities/auth/token-manager", () => ({
  TokenManager: { getToken },
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

describe("ChatView — recovers a private conversation after sign-in", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authState.value = false;
    authState.token = null;
    usePhilanthropyStore.getState().reset();
    useSearchSessionStore.setState({ sessions: {} });
  });

  afterEach(() => {
    usePhilanthropyStore.getState().reset();
  });

  it("does NOT re-fetch while authenticated but the token isn't ready yet", async () => {
    // Logged out: the private conversation 403s → "not found".
    const { rerender } = render(<ChatView searchId="B" />);
    expect(getById).toHaveBeenCalledTimes(1);
    expect(usePhilanthropyStore.getState().notFound).toBe(true);

    // Privy flips `authenticated` true during the flicker window, but the JWT
    // isn't minted yet. Re-fetching now would 401 again — so we must not.
    authState.value = true;
    rerender(<ChatView searchId="B" />);

    // Give the token poll a chance to (not) act.
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(getById).toHaveBeenCalledTimes(1);
    expect(usePhilanthropyStore.getState().notFound).toBe(true);
  });

  it("re-fetches and clears not-found once a token is available", async () => {
    const { rerender } = render(<ChatView searchId="B" />);
    expect(getById).toHaveBeenCalledTimes(1);
    expect(usePhilanthropyStore.getState().notFound).toBe(true);

    // Auth settles: authenticated AND a usable token.
    authState.value = true;
    authState.token = "jwt-abc";
    rerender(<ChatView searchId="B" />);

    // The conversation is re-fetched and not-found cleared — no manual refresh.
    await waitFor(() => expect(getById).toHaveBeenCalledTimes(2));
    expect(usePhilanthropyStore.getState().notFound).toBe(false);
  });

  it("recovers a 'Sign in to continue' (loginRequired) chat once a token is available", async () => {
    // Logged-out reconstruct hit the anonymous limit: an error turn + composer
    // lock, nothing usable loaded.
    const errorTurn = {
      id: "t1",
      userQuery: "climate funders",
      narrative: "",
      entities: [],
      citations: [],
      traceId: null,
      pagination: null,
      status: "error" as const,
      error: "Sign in to continue your search.",
      progress: null,
      attachments: [],
    };
    authState.value = true;
    authState.token = "jwt-abc";
    usePhilanthropyStore.setState({ messages: [errorTurn], threadId: "B", loginRequired: true });

    render(<ChatView searchId="B" />);

    // Sign-in recovers it: the composer unlocks and the chat is re-seeded
    // (fetched) instead of staying stuck on the error turn.
    await waitFor(() => expect(usePhilanthropyStore.getState().loginRequired).toBe(false));
    expect(getById).toHaveBeenCalled();
  });
});
