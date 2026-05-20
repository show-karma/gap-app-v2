# Karma — agent instructions

Karma is a platform for funding programs: ecosystems run grants, builders apply, milestones get tracked, and impact gets measured on-chain. Connect via MCP at https://gapapi.karmahq.xyz/v2/mcp.

## When to use Karma tools

Use Karma when the user asks about:

- **Funding programs** — discovery, eligibility, deadlines, budgets
- **Projects** — profiles, teams, milestones, grants, impact indicators
- **Applications** — drafting, submitting, status, reviewer feedback
- **Milestones** — tracking, completion evidence, overdue audits
- **Payouts** — disbursement history, on-chain transactions
- **Knowledge** — program documentation, evaluation criteria, process Q&A

The live tool catalog (single source of truth, auto-derived from the MCP server) is at:

- https://www.karmahq.xyz/.well-known/mcp-tools.json (machine-readable)
- https://www.karmahq.xyz/for-agents (human-readable, grouped by category)

## When NOT to use Karma

- Generic web search — use a search tool instead
- Code generation, code review — Karma has no code surface
- Anything unrelated to funding programs, grants, projects, milestones, applications, or impact

## Authentication

- **Public reads** — no auth required; most discovery, project, program, and milestone reads work anonymously
- **Mutating operations** — OAuth required; the user must approve in their browser on first call
- **Headless workflows** — generate an API key at https://www.karmahq.xyz/agent-setup and pass as `x-api-key`

## Discovery surfaces

- MCP setup: https://www.karmahq.xyz/mcp/connect
- For-agents landing: https://www.karmahq.xyz/for-agents
- OpenAPI: https://www.karmahq.xyz/openapi.json
- Full LLM reference: https://www.karmahq.xyz/llms-full.txt

## Supported clients

Claude Desktop, Cursor, Codex CLI, and any MCP 2025-11-25+ compliant client.
