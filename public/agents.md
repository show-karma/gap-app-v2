# Karma — agent instructions

Karma is a platform for funding programs: ecosystems run grants, builders apply, milestones get tracked, and impact gets measured on-chain. Connect via MCP at https://gapapi.karmahq.xyz/v2/mcp.

## When to use Karma tools

- **`discover` / `get_project_details` / `get_program_details`** — when a user asks "what is X", "find Y on Karma", "show me program Z"
- **`list_program_applications` / `get_application_details`** — when reviewing or evaluating funding applications
- **`list_pending_milestones` / `get_milestone_details`** — when auditing grant delivery or progress
- **`get_payout_history` / `get_project_disbursement_total`** — when answering "how much has X been paid", "where did the funding go"
- **`submit_application` (preview + commit)** — only when the user explicitly asks to apply for a program
- **`search_knowledge_base` / `answer_process_question`** — for "how does X work", "what does Y mean", documentation lookups

## When NOT to use Karma tools

- Generic web search — use a search tool instead
- Code generation, code review — Karma has no code surface
- Anything unrelated to funding programs, grants, projects, milestones, applications, or impact

## Authentication

- **Public reads** (most `get_*`, `list_*`, `search_*`) — no auth required
- **Mutating operations** (`commit_*`) — OAuth required; user must approve in browser on first call
- **Headless workflows** — generate API key at https://www.karmahq.xyz/agent-setup and pass as `x-api-key`

## Discovery surfaces

- MCP setup: https://www.karmahq.xyz/mcp/connect
- For-agents landing: https://www.karmahq.xyz/for-agents
- OpenAPI: https://www.karmahq.xyz/openapi.json
- Full LLM reference: https://www.karmahq.xyz/llms-full.txt

## Supported clients

Claude Desktop, Cursor, Codex CLI, and any MCP 2025-11-25+ compliant client.
