import { fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { describe, expect, it, vi } from "vitest";
import { ConnectGuide } from "../components/connect-guide";

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

const copyMock = vi.fn(() => Promise.resolve(true));

vi.mock("@/hooks/useCopyToClipboard", () => ({
  useCopyToClipboard: () => [null, copyMock],
}));

describe("ConnectGuide", () => {
  it("renders the Claude setup guide with MCP URL and cross-link to ChatGPT", () => {
    render(<ConnectGuide provider="claude" />);

    expect(
      screen.getByRole("heading", { level: 1, name: /Add Karma Find Funders to Claude/i })
    ).toBeInTheDocument();
    expect(screen.getAllByText("https://gapapi.karmahq.xyz/mcp").length).toBeGreaterThan(0);
    expect(screen.getByRole("link", { name: /Using ChatGPT instead/i })).toHaveAttribute(
      "href",
      "/non-profits/find-funders/connect/chatgpt"
    );
  });

  it("renders the ChatGPT setup guide with the Developer mode prerequisite", () => {
    render(<ConnectGuide provider="chatgpt" />);

    expect(
      screen.getByRole("heading", { level: 1, name: /Add Karma Find Funders to ChatGPT/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 3, name: /Enable Developer mode/i })
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Using Claude instead/i })).toHaveAttribute(
      "href",
      "/non-profits/find-funders/connect/claude"
    );
  });

  it("copies the MCP URL to the clipboard when the copy button is clicked", () => {
    render(<ConnectGuide provider="claude" />);
    copyMock.mockClear();

    fireEvent.click(screen.getByRole("button", { name: /Copy MCP URL/i }));

    expect(copyMock).toHaveBeenCalledWith("https://gapapi.karmahq.xyz/mcp", "Copied");
  });
});
