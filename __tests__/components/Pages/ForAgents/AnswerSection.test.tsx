import { render, screen } from "@testing-library/react";
import { AnswerSection } from "@/components/Pages/ForAgents/sections/AnswerSection";

describe("AnswerSection", () => {
  beforeEach(() => {
    render(<AnswerSection />);
  });

  it("states the MCP server endpoint as a direct answer", () => {
    expect(screen.getAllByText(/\/mcp$/).length).toBeGreaterThanOrEqual(1);
    expect(
      screen.getByText(/provides a public MCP \(Model Context Protocol\) server/i)
    ).toBeInTheDocument();
  });

  it("answers which operations need authentication", () => {
    expect(
      screen.getByRole("heading", { name: /which operations need authentication/i })
    ).toBeInTheDocument();
    expect(screen.getByText(/every tool call requires a signed-in session/i)).toBeInTheDocument();
  });

  it("answers the Claude and ChatGPT connection question with guide links", () => {
    expect(
      screen.getByRole("heading", { name: /connect from Claude or ChatGPT/i })
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /claude guide/i })).toHaveAttribute(
      "href",
      "/nonprofits/find-funders/connect/claude"
    );
    expect(screen.getByRole("link", { name: /chatgpt guide/i })).toHaveAttribute(
      "href",
      "/nonprofits/find-funders/connect/chatgpt"
    );
  });

  it("answers whether an agent can draft and submit an application", () => {
    expect(
      screen.getByRole("heading", { name: /draft and submit a grant application/i })
    ).toBeInTheDocument();
    expect(screen.getByText(/yes, with your permission/i)).toBeInTheDocument();
  });

  it("positions against conventional grant platforms without naming competitors", () => {
    const comparison = screen.getByText(/conventional grants-management platforms/i);
    expect(comparison).toBeInTheDocument();
    for (const competitor of ["Fluxx", "Submittable", "Candid", "Instrumentl", "Blackbaud"]) {
      expect(comparison.textContent).not.toContain(competitor);
    }
  });
});
