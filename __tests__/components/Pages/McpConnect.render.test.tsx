import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";

describe("McpConnectPage mcpUrl construction", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.doUnmock("@/utilities/enviromentVars");
    vi.resetModules();
  });

  it("renders the MCP server URL without a double slash when the indexer URL has a trailing slash", async () => {
    vi.doMock("@/utilities/enviromentVars", () => ({
      envVars: { NEXT_PUBLIC_GAP_INDEXER_URL: "https://gapapi.karmahq.xyz/" },
    }));

    const { McpConnectPage } = await import("@/components/Pages/McpConnect/McpConnectPage");
    render(<McpConnectPage />);

    const mcpUrl = screen.getByText("https://gapapi.karmahq.xyz/mcp");
    expect(mcpUrl).toBeInTheDocument();
    expect(mcpUrl.textContent).not.toContain("//mcp");
    expect(mcpUrl.textContent).toBe("https://gapapi.karmahq.xyz/mcp");
  });

  it("renders the MCP server URL without a double slash when the indexer URL has no trailing slash", async () => {
    vi.doMock("@/utilities/enviromentVars", () => ({
      envVars: { NEXT_PUBLIC_GAP_INDEXER_URL: "https://gapapi.karmahq.xyz" },
    }));

    const { McpConnectPage } = await import("@/components/Pages/McpConnect/McpConnectPage");
    render(<McpConnectPage />);

    expect(screen.getByText("https://gapapi.karmahq.xyz/mcp")).toBeInTheDocument();
  });

  it("renders the MCP server URL without the query string when the indexer URL carries one", async () => {
    vi.doMock("@/utilities/enviromentVars", () => ({
      envVars: { NEXT_PUBLIC_GAP_INDEXER_URL: "https://gapapi.karmahq.xyz/?tenant=x" },
    }));

    const { McpConnectPage } = await import("@/components/Pages/McpConnect/McpConnectPage");
    render(<McpConnectPage />);

    const mcpUrl = screen.getByText("https://gapapi.karmahq.xyz/mcp");
    expect(mcpUrl).toBeInTheDocument();
    expect(mcpUrl.textContent).not.toContain("tenant=x");
  });
});
