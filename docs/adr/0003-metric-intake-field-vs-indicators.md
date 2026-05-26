---
status: accepted
---

# Metric intake field is captured text, not an Indicator

We added a `metric` custom form-field type to the funding-application intake form (repeatable entries of Metric / Data Source / How It's Measured / Target). It is **pure captured text** — stored verbatim in the application's `applicationData` JSON, displayed back on the application views, and nothing more. It is deliberately **not** wired into the project-level **Indicator** system, is not anchored on-chain, and triggers no post-approval sync.

## Considered options

- **Feed metrics into the Indicator system on approval.** Rejected: Indicators are structured, queryable, project-scoped impact data with their own lifecycle; turning free-text intake answers into Indicators would couple the intake form to that subsystem and require mapping/curation we don't want at submission time. The intake field is a proposal artifact, not tracked impact.
- **Anchor metrics on-chain like the `milestone` field.** Rejected: the on-chain pipeline exists for milestones because grant milestones are verifiable commitments; metrics here are descriptive and carry no on-chain meaning.

## Consequences

- The `"metric"` type string is persisted inside every program's `formSchema` JSON, so renaming the type later requires a data migration — hence this record.
- Because the frontend has two live form code paths (the `src/features/applications` intake/edit path and the legacy `components/FundingPlatform` post-approval/admin-edit path), `metric` is implemented in **both** to match `milestone` and avoid raw-JSON rendering when admins edit a metric-bearing application.
- "Metric" is now an overloaded word in the codebase. See `CONTEXT.md` — the intake **Metric field** is distinct from the project **Indicator** system; they must not be conflated.
