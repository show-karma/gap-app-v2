import { fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ConnectorNudge } from "../components/connector-nudge";

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

    expect(claudeLink).toHaveAttribute("href", "/nonprofits/find-funders/connect/claude");
    expect(chatgptLink).toHaveAttribute("href", "/nonprofits/find-funders/connect/chatgpt");
  });

  it("opens the setup guides in a new tab so the conversation is never left", () => {
    render(<ConnectorNudge />);

    for (const name of [/Add to Claude/i, /Add to ChatGPT/i]) {
      const link = screen.getByRole("link", { name });
      expect(link).toHaveAttribute("target", "_blank");
      expect(link).toHaveAttribute("rel", expect.stringContaining("noopener"));
    }
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
