import type { ReactNode } from "react";

/**
 * Marketing-surface install steps for the landing-page Connector tabs.
 *
 * The dedicated /connect/{claude,chatgpt} pages own the long-form setup
 * walkthrough; these mirror the same three-step shape with shorter prose
 * suitable for the inline widget on the landing page.
 */

interface InstallStep {
  badge: string;
  text: ReactNode;
  code?: string;
}

interface InstallConfig {
  label: string;
  steps: InstallStep[];
  foot: string;
}

export const INSTALL_CONFIGS = {
  claude: {
    label: "Claude",
    steps: [
      {
        badge: "01",
        text: (
          <>
            Open Claude &rarr; <code>Settings</code> &rarr; <code>Customize</code> &rarr;{" "}
            <code>Connectors</code> &rarr; <code>+</code> &rarr; <code>Add custom connector</code>.
          </>
        ),
      },
      {
        badge: "02",
        text: (
          <>
            Name it <code>Karma Find Funders</code>, paste the MCP server URL below, and click{" "}
            <code>Add</code>. Sign in with your Karma account to authorize.
          </>
        ),
        code: "https://gapapi.karmahq.xyz/mcp",
      },
      {
        badge: "03",
        text: (
          <>
            In a new chat, click <code>+</code> in the composer, open <code>Connectors</code>, and
            toggle <code>Karma Find Funders</code> on.
          </>
        ),
      },
    ],
    foot: "Free, Pro, Max, Team, and Enterprise plans · Streamable HTTP · OAuth 2.1 · Beta",
  },
  chatgpt: {
    label: "ChatGPT",
    steps: [
      {
        badge: "01",
        text: (
          <>
            In ChatGPT, open <code>Settings</code> &rarr; <code>Apps &amp; Connectors</code> &rarr;{" "}
            <code>Advanced settings</code> and turn on <code>Developer mode</code>.
          </>
        ),
      },
      {
        badge: "02",
        text: (
          <>
            Back on <code>Apps &amp; Connectors</code>, click <code>Create</code>, name it{" "}
            <code>Karma Find Funders</code>, paste the MCP server URL below, leave auth on{" "}
            <code>OAuth</code>, and click <code>Create</code>.
          </>
        ),
        code: "https://gapapi.karmahq.xyz/mcp",
      },
      {
        badge: "03",
        text: (
          <>
            In a new chat, click <code>+</code> &rarr; <code>More</code> and pick{" "}
            <code>Karma Find Funders</code>. Read-only on Plus/Pro; read/write on Business,
            Enterprise, and Edu.
          </>
        ),
      },
    ],
    foot: "Plus, Pro, Business, Enterprise, and Edu plans · Streamable HTTP · OAuth 2.1 · Beta",
  },
  api: {
    label: "API / Other tools",
    steps: [
      {
        badge: "01",
        text: (
          <>
            Generate a key under <code>Settings &rarr; API</code>. Free tier includes 500
            queries/month.
          </>
        ),
      },
      {
        badge: "02",
        text: (
          <>
            POST a natural-language query. Every response includes <code>citations[]</code> pointing
            to the exact filing page.
          </>
        ),
        code: `curl https://gapapi.karmahq.xyz/v2/philanthropy/agent-query \\\n  -H "Content-Type: application/json" \\\n  -d '{"query": "Family foundations funding literacy in Ohio under $10M"}'`,
      },
      {
        badge: "03",
        text: (
          <>
            Or pull it into Cursor, Raycast, or your own agent stack &mdash; anything that speaks
            MCP.
          </>
        ),
      },
    ],
    foot: "REST · JSON · Streaming SSE · MCP-compatible",
  },
} satisfies Record<string, InstallConfig>;

export type InstallTab = keyof typeof INSTALL_CONFIGS;
