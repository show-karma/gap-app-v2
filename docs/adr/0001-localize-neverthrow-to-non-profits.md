# Localize `neverthrow` to the `/non-profits/` feature

## Status

accepted

## Context

The `/non-profits/` feature was ported from the standalone grant-atlas app, whose service layer is built around `neverthrow`'s `ResultAsync<T, AppError>` with a discriminated `AppError` union (`NetworkError | ApiError | ValidationError | AbortError | StreamError`). Every service function returns Results and a `resultToPromise` bridge adapts them to TanStack Query.

The rest of gap-app-v2 does not use `neverthrow`. Services throw or return plain promises, and TanStack Query handles error states directly.

## Decision

Keep `neverthrow` confined to `src/features/non-profits/`. Do not adopt it elsewhere in the app, and do not rewrite the non-profits service layer to match the throw-based convention.

## Rationale

- The discriminated `AppError` union is genuinely useful for the SSE streaming surface, where abort, network, and stream errors need to be distinguished at the UI layer.
- Rewriting the entire feature's service/hook layer to a throw-based idiom during the migration would add risk without a product win.
- The pattern's footprint is small and the bridge (`resultToPromise`) means TanStack Query consumers never see Results — only standard query/mutation results.

## Consequences

- Future maintainers reading `src/features/non-profits/services/*` will encounter `ResultAsync` as a foreign idiom. The feature's `README` or `CLAUDE.md` must call this out.
- New code under `/non-profits/` should follow the existing Result pattern for consistency within the feature.
- If the `neverthrow` pattern proves valuable, a follow-up ADR can supersede this one and expand its scope. If it proves costly, the feature can be migrated to throw-based services in isolation.
