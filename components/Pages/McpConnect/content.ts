/**
 * Shared content for /mcp/connect — surfaced both as visible UI and as
 * JSON-LD structured data (FAQPage, HowTo). Keeping this in a single
 * module guarantees the schema and the page never drift apart.
 */

interface FaqEntry {
  question: string;
  answer: string;
}

interface ConnectStep {
  name: string;
  text: string;
}

export const MCP_FAQS: FaqEntry[] = [
  {
    question: "Which AI apps can connect to Karma?",
    answer:
      "Cursor, Claude Desktop, Codex CLI, and any MCP-spec-compliant client (2025-11-25 or later).",
  },
  {
    question: "Does it cost anything to use the MCP server?",
    answer: "No. The Karma MCP server is free for individual builders and program admins.",
  },
  {
    question: "What data can an AI agent see?",
    answer:
      "Public project and grant data without sign-in. With OAuth, an agent sees what your Karma account can see — your projects, programs you administer, and applications you review.",
  },
  {
    question: "How does authentication work?",
    answer:
      "Standard OAuth 2.0 with bearer tokens. AI apps walk you through Karma sign-in in your browser the first time you connect. RFC 9728 and RFC 6750 compliant.",
  },
  {
    question: "Can I use an API key instead of OAuth?",
    answer:
      "Yes. Generate one in your Karma settings and pass it as the x-api-key header. Useful for headless agents and scripts.",
  },
  {
    question: "What MCP protocol version is supported?",
    answer: "Protocol version 2025-11-25 and later.",
  },
];

export const CONNECT_STEPS: ConnectStep[] = [
  {
    name: "Copy the MCP server URL",
    text: "Grab the URL from your Karma settings page or this guide.",
  },
  {
    name: "Add it to your AI app",
    text: "In Cursor, Claude Desktop, or your MCP client of choice, add the URL as a remote server.",
  },
  {
    name: "Sign in to Karma",
    text: "The first time you connect, your AI app will open Karma in your browser to approve access.",
  },
  {
    name: "Start working",
    text: "Ask the agent to summarize a project, list pending milestones, or draft an application.",
  },
];
