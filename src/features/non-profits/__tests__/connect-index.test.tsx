import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { describe, expect, it, vi } from "vitest";
import { ConnectIndex } from "../components/connect-index";

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

describe("ConnectIndex", () => {
  it("links to both Claude and ChatGPT setup guides", () => {
    render(<ConnectIndex />);

    expect(
      screen.getByRole("heading", { level: 1, name: /Add Karma Find Funders to your AI tool/i })
    ).toBeInTheDocument();

    expect(screen.getByRole("link", { name: /Open the Claude guide/i })).toHaveAttribute(
      "href",
      "/nonprofits/find-funders/connect/claude"
    );
    expect(screen.getByRole("link", { name: /Open the ChatGPT guide/i })).toHaveAttribute(
      "href",
      "/nonprofits/find-funders/connect/chatgpt"
    );
    expect(screen.getByRole("link", { name: /Back to Find Funders/i })).toHaveAttribute(
      "href",
      "/nonprofits/find-funders"
    );
  });
});
