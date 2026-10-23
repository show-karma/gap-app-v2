import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { DiligenceResponseContext } from "@/types/diligence";
import { HttpError } from "@/utilities/api/errors";

const mockUseDiligenceResponseContext = vi.fn();

vi.mock("@/hooks/useDiligence", () => ({
  useDiligenceResponseContext: (token: string) => mockUseDiligenceResponseContext(token),
  // The form imports this; stub it so the page test doesn't pull the real hook.
  useSubmitDiligenceResponse: () => ({ mutate: vi.fn(), isPending: false }),
}));

import { DiligenceResponsePage } from "../DiligenceResponsePage";

const baseContext: DiligenceResponseContext = {
  orgName: "Helping Hands",
  questions: [
    { id: "q1", text: "What is your mission?" },
    { id: "q2", text: "How do you measure impact?" },
  ],
  alreadySubmitted: false,
  expiresAt: "2026-12-31",
};

function mockState(overrides: Partial<ReturnType<typeof mockUseDiligenceResponseContext>>) {
  mockUseDiligenceResponseContext.mockReturnValue({
    data: undefined,
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
    ...overrides,
  });
}

describe("DiligenceResponsePage", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("renders a skeleton while loading", () => {
    mockState({ isLoading: true });
    const { container } = render(<DiligenceResponsePage token="tok" />);
    expect(container.querySelector(".animate-pulse")).toBeInTheDocument();
  });

  it("renders an error card with a retry button", () => {
    const refetch = vi.fn();
    mockState({ isError: true, refetch });
    render(<DiligenceResponsePage token="tok" />);
    expect(screen.getByText("Couldn't load this request")).toBeInTheDocument();
    screen.getByRole("button", { name: "Try again" }).click();
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it("renders the paused state (no retry, not 'invalid link') on the kill-switch 503", () => {
    const error = new HttpError(503, {
      endpoint: "/v2/donor-research/diligence-response/tok",
      method: "get",
      body: {
        error: "donor_research_disabled",
        message: "Donor research is temporarily disabled.",
      },
    });
    mockState({ isError: true, error });
    render(<DiligenceResponsePage token="tok" />);
    expect(
      screen.getByRole("heading", { level: 1, name: "This request is temporarily unavailable" })
    ).toBeInTheDocument();
    expect(screen.queryByText("Couldn't load this request")).not.toBeInTheDocument();
    expect(screen.queryByText("This link is no longer valid")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Try again" })).not.toBeInTheDocument();
  });

  it("keeps the generic error card for a 503 without the kill-switch code", () => {
    const error = new HttpError(503, { endpoint: "/x", method: "get" });
    mockState({ isError: true, error });
    render(<DiligenceResponsePage token="tok" />);
    expect(screen.getByText("Couldn't load this request")).toBeInTheDocument();
  });

  it("renders the generic invalid-link state when data is null, with a document h1", () => {
    mockState({ data: null });
    render(<DiligenceResponsePage token="tok" />);
    // The route's only document heading — the visible EmptyState title is an
    // h3 (see TokenPageShell's sr-only h1 above it).
    expect(
      screen.getByRole("heading", { level: 1, name: "This link is no longer valid" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 3, name: "This link is no longer valid" })
    ).toBeInTheDocument();
  });

  it("renders the thank-you state when already submitted and hides the form", () => {
    mockState({ data: { ...baseContext, alreadySubmitted: true } });
    render(<DiligenceResponsePage token="tok" />);
    expect(screen.getByText("Thanks — your answers were received")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Submit/ })).not.toBeInTheDocument();
  });

  it("renders the header with org name and the response form", () => {
    mockState({ data: baseContext });
    render(<DiligenceResponsePage token="tok" />);
    expect(screen.getByText(/You've received a research request/)).toBeInTheDocument();
    expect(screen.getByText("Helping Hands")).toBeInTheDocument();
    expect(screen.getByText("What is your mission?")).toBeInTheDocument();
    expect(screen.getByText(/This link expires on/)).toBeInTheDocument();
  });

  it("renders gracefully when org name is null", () => {
    mockState({ data: { ...baseContext, orgName: null } });
    render(<DiligenceResponsePage token="tok" />);
    expect(screen.getByText(/You've received a research request/)).toBeInTheDocument();
    expect(screen.queryByText("Helping Hands")).not.toBeInTheDocument();
  });
});
