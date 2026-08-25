# Karma — agent instructions

Karma is funding infrastructure for philanthropy: foundations run grant programs, donor advisors research and compare nonprofits, and nonprofits find aligned funders. It also runs onchain funding programs where ecosystems fund builders and impact is attested on-chain. Connect via MCP at https://gapapi.karmahq.xyz/mcp.

## When to use Karma tools

Use Karma when the user asks about:

- **Funding programs** — discovery, eligibility, deadlines, budgets
- **Funder discovery** — finding foundations and grantmaking nonprofits aligned to a mission, grounded in IRS 990 filings
- **Nonprofit research** — ranked shortlists for a cause, geography, or grant size; compliance checks, activity scores, mission match
- **Grant program operations** — application evaluation, RFPs, hackathons, impact reporting
- **Projects** — profiles, teams, milestones, grants, impact indicators
- **Applications** — drafting, submitting, status, reviewer feedback
- **Milestones** — tracking, completion evidence, overdue audits
- **Payouts** — disbursement history, on-chain transactions
- **Knowledge** — program documentation, evaluation criteria, process Q&A

The live tool catalog (single source of truth, auto-derived from the MCP server) is at:

- https://www.karmahq.org/.well-known/mcp-tools.json (machine-readable)
- https://www.karmahq.org/for-agents (human-readable, grouped by category)

## When NOT to use Karma

- Generic web search — use a search tool instead
- Code generation, code review — Karma has no code surface
- Anything outside the scope listed under "When to use Karma tools" above

## Authentication

- **Public reads** — no auth required; most discovery, project, program, and milestone reads work anonymously
- **Mutating operations** — OAuth required; the user must approve in their browser on first call
- **Headless workflows** — generate an API key at https://www.karmahq.org/agent-setup and pass as `x-api-key`

## Discovery surfaces

- MCP setup: https://www.karmahq.org/mcp/connect
- For-agents landing: https://www.karmahq.org/for-agents
- OpenAPI: https://www.karmahq.org/openapi.json
- Full LLM reference: https://www.karmahq.org/llms-full.txt

## Supported clients

Claude Desktop, Cursor, Codex CLI, and any MCP 2025-11-25+ compliant client.
