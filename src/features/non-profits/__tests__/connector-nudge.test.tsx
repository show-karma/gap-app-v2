import { fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ConnectorNudge } from "../components/connector-nudge";

vi.mock("@/src/components/navigation/Link", () => ({
  Link: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
    className?: string;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

describe("ConnectorNudge", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  afterEach(() => {
    window.sessionStorage.clear();
  });

  it("routes the Claude and ChatGPT buttons to their dedicated setup guides", () => {
    render(<ConnectorNudge />);

    const claudeLink = screen.getByRole("link", { name: /Add to Claude/i });
    const chatgptLink = screen.getByRole("link", { name: /Add to ChatGPT/i });

    expect(claudeLink).toHaveAttribute("href", "/non-profits/find-funders/connect/claude");
    expect(chatgptLink).toHaveAttribute("href", "/non-profits/find-funders/connect/chatgpt");
  });

  it("hides the banner once dismissed and remembers the dismissal via sessionStorage", () => {
    const { rerender } = render(<ConnectorNudge />);

    expect(screen.getByText(/Take this agent with you/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Dismiss/i }));

    expect(screen.queryByText(/Take this agent with you/i)).not.toBeInTheDocument();
    expect(window.sessionStorage.getItem("np-connector-nudge-dismissed")).toBe("1");

    rerender(<ConnectorNudge />);
    expect(screen.queryByText(/Take this agent with you/i)).not.toBeInTheDocument();
  });
});
