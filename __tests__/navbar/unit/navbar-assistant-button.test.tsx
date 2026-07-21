/**
 * Unit Tests: NavbarAssistantButton
 *
 * The Karma Assistant moved from a floating bottom-right bubble to a
 * top-level navbar control. These cover the trigger's contract:
 * it drives the shared agent-chat store, exposes correct dialog-trigger
 * semantics, and stays out of the way on the full-page assistant route.
 */

const mockPathname = vi.hoisted(() => ({ value: "/" }));

vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname.value,
}));

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { KARMA_ASSISTANT_PANEL_ID } from "@/components/AgentChat/panel-id";
import { NavbarAssistantButton } from "@/src/components/navbar/navbar-assistant-button";
import { useAgentChatStore } from "@/store/agentChat";

describe("NavbarAssistantButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPathname.value = "/";
    useAgentChatStore.setState({ isOpen: false });
  });

  it("should render a labelled trigger at the top level", () => {
    render(<NavbarAssistantButton />);
    expect(screen.getByRole("button", { name: "Ask Karma" })).toBeInTheDocument();
  });

  it("should open the assistant on click", async () => {
    const user = userEvent.setup();
    render(<NavbarAssistantButton />);

    await user.click(screen.getByRole("button", { name: "Ask Karma" }));

    expect(useAgentChatStore.getState().isOpen).toBe(true);
  });

  it("should close the assistant when clicked while open", async () => {
    const user = userEvent.setup();
    useAgentChatStore.setState({ isOpen: true });
    render(<NavbarAssistantButton />);

    await user.click(screen.getByRole("button", { name: "Ask Karma" }));

    expect(useAgentChatStore.getState().isOpen).toBe(false);
  });

  it("should report collapsed state and point at the panel it controls", () => {
    render(<NavbarAssistantButton />);

    const button = screen.getByRole("button", { name: "Ask Karma" });
    expect(button).toHaveAttribute("aria-expanded", "false");
    expect(button).toHaveAttribute("aria-controls", KARMA_ASSISTANT_PANEL_ID);
  });

  it("should report expanded state when the panel is open", () => {
    useAgentChatStore.setState({ isOpen: true });
    render(<NavbarAssistantButton />);

    expect(screen.getByRole("button", { name: "Ask Karma" })).toHaveAttribute(
      "aria-expanded",
      "true"
    );
  });

  it("should keep an accessible name in compact (icon-only) mode", () => {
    render(<NavbarAssistantButton compact />);
    expect(screen.getByRole("button", { name: "Ask Karma" })).toBeInTheDocument();
  });

  it.each(["/ask-karma", "/community/gitcoin/ask-karma"])(
    "should not render on the full-page assistant route %s",
    (pathname) => {
      mockPathname.value = pathname;
      render(<NavbarAssistantButton />);
      expect(screen.queryByRole("button", { name: "Ask Karma" })).not.toBeInTheDocument();
    }
  );

  it("should still render on other community routes", () => {
    mockPathname.value = "/community/gitcoin";
    render(<NavbarAssistantButton />);
    expect(screen.getByRole("button", { name: "Ask Karma" })).toBeInTheDocument();
  });
});
