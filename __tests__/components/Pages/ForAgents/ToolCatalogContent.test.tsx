import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { ToolCatalogContent } from "@/components/Pages/ForAgents/sections/ToolCatalogSection";
import type { PublicToolMetadata } from "@/components/Pages/ForAgents/types";

function buildTool(overrides: Partial<PublicToolMetadata>): PublicToolMetadata {
  return {
    name: "get_project_details",
    alias: "karma_project_get_details",
    description: "Get full project details.",
    category: "project",
    requiresAuth: false,
    ...overrides,
  };
}

describe("ToolCatalogContent", () => {
  it("renders tools grouped under their category headings", () => {
    const tools: PublicToolMetadata[] = [
      buildTool({ name: "get_project_details", category: "project" }),
      buildTool({
        name: "list_funding_programs",
        alias: "karma_program_list",
        category: "program",
        description: "List programs.",
      }),
    ];

    render(<ToolCatalogContent tools={tools} />);

    expect(screen.getByRole("heading", { level: 3, name: "Projects" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 3, name: "Programs" })).toBeInTheDocument();
  });

  it("renders empty-category sections nowhere — only categories with tools appear", () => {
    const tools: PublicToolMetadata[] = [
      buildTool({ name: "get_project_details", category: "project" }),
    ];

    render(<ToolCatalogContent tools={tools} />);

    expect(screen.queryByRole("heading", { name: "Programs" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Milestones" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Payouts" })).not.toBeInTheDocument();
  });

  it("renders the alias under the canonical name when alias is present", () => {
    const tools: PublicToolMetadata[] = [
      buildTool({
        name: "get_project_details",
        alias: "karma_project_get_details",
      }),
    ];

    render(<ToolCatalogContent tools={tools} />);

    expect(screen.getByText("get_project_details")).toBeInTheDocument();
    expect(screen.getByText("karma_project_get_details")).toBeInTheDocument();
  });

  it("omits the alias element when alias is undefined", () => {
    const tools: PublicToolMetadata[] = [
      buildTool({
        name: "search_knowledge_base",
        alias: undefined,
        category: "knowledge",
      }),
    ];

    render(<ToolCatalogContent tools={tools} />);

    expect(screen.getByText("search_knowledge_base")).toBeInTheDocument();
    expect(screen.queryByText(/^karma_/)).not.toBeInTheDocument();
  });

  it("renders the description text for each tool", () => {
    const tools: PublicToolMetadata[] = [
      buildTool({
        name: "get_project_details",
        description: "Returns title, description, members, and milestone counts.",
      }),
    ];

    render(<ToolCatalogContent tools={tools} />);

    expect(
      screen.getByText("Returns title, description, members, and milestone counts.")
    ).toBeInTheDocument();
  });

  it("shows pluralized tool counts per category (1 tool vs N tools)", () => {
    const tools: PublicToolMetadata[] = [
      buildTool({ name: "get_project_details", category: "project" }),
      buildTool({ name: "search_projects", category: "project" }),
      buildTool({ name: "list_funding_programs", category: "program" }),
    ];

    render(<ToolCatalogContent tools={tools} />);

    expect(screen.getByText("2 tools")).toBeInTheDocument();
    expect(screen.getByText("1 tool")).toBeInTheDocument();
  });

  it("renders the empty-state CTA when given no tools", () => {
    render(<ToolCatalogContent tools={[]} />);

    expect(screen.getByText(/temporarily unavailable/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /OpenAPI/i })).toBeInTheDocument();
  });

  it("respects the curated category display order (project before program before milestone)", () => {
    const tools: PublicToolMetadata[] = [
      buildTool({ name: "list_milestones", category: "milestone" }),
      buildTool({ name: "list_funding_programs", category: "program" }),
      buildTool({ name: "get_project_details", category: "project" }),
    ];

    render(<ToolCatalogContent tools={tools} />);

    const headings = screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent);
    const projectIdx = headings.indexOf("Projects");
    const programIdx = headings.indexOf("Programs");
    const milestoneIdx = headings.indexOf("Milestones");
    expect(projectIdx).toBeGreaterThanOrEqual(0);
    expect(projectIdx).toBeLessThan(programIdx);
    expect(programIdx).toBeLessThan(milestoneIdx);
  });

  it("places multiple tools under the same category in a single list", () => {
    const tools: PublicToolMetadata[] = [
      buildTool({ name: "get_project_details", category: "project" }),
      buildTool({ name: "search_projects", category: "project" }),
    ];

    render(<ToolCatalogContent tools={tools} />);

    expect(screen.getAllByRole("heading", { level: 3, name: "Projects" })).toHaveLength(1);
    expect(screen.getByText("get_project_details")).toBeInTheDocument();
    expect(screen.getByText("search_projects")).toBeInTheDocument();
    expect(screen.getByText("2 tools")).toBeInTheDocument();
  });
});
