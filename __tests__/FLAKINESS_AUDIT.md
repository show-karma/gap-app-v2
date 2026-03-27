# Test Flakiness Audit

Audit date: 2026-03-27
Audited by: CI/Infra Lead (Phase 1)

## Summary

Found several categories of flakiness risk across the test suite.

## Category 1: Real setTimeout delays in mock assertions

These tests use real `setTimeout` delays to simulate async behavior. When CI is under
load, these can cause intermittent failures.

**Fixed:**
- `__tests__/integration/features/donation-flow.test.tsx` - Had 15s/10s real timeouts
  for a Promise.race test on mock functions. Reduced to 200ms/50ms.

**Remaining (low severity, debounce waits of 300-600ms):**
- `__tests__/navbar/unit/navbar-search.test.tsx:347` - 600ms wait for debounce assertion
- `__tests__/navbar/integration/search-flow.test.tsx:282` - 300ms debounce wait
- `__tests__/components/FundingPlatform/ApplicationView/StatusChangeModal.test.tsx:1245` - 400ms debounce wait
- `__tests__/components/FundingPlatform/ApplicationView/StatusChangeModal.test.tsx:1371` - 500ms debounce wait

**Recommendation:** Refactor debounce tests to use `vi.useFakeTimers()` + `vi.advanceTimersByTime()`.

## Category 2: Promise.race patterns

Two test files use `Promise.race` which is inherently timing-dependent:
- `__tests__/integration/features/donation-flow.test.tsx:552` (fixed above)
- `__tests__/unit/hooks/useMixpanel.test.ts:231`

## Category 3: Timeout-heavy test files (slow, not flaky per se)

These files have many tests with 100ms+ mock delays that add up:
- `__tests__/components/FundingPlatform/ApplicationView/AIEvaluationButton.test.tsx` - 7 tests with 100ms setTimeout mocks
- `__tests__/unit/hooks/usePayoutAddressManager.test.ts` - 1000ms setTimeout mocks
- `__tests__/components/CommunityStats.test.tsx` - 100-500ms setTimeout mocks
- `__tests__/components/FundingPlatform/QuestionBuilder/ProgramDetailsTab.test.tsx` - 100ms mock delays

**Recommendation:** Replace `setTimeout`-based mock delays with immediate resolution
(`Promise.resolve()`) unless testing actual timing behavior. Use `vi.useFakeTimers()`
when testing debounce/throttle/polling logic.

## Category 4: KarmaProfileLinkInput tests

Two copies of this test file exist (808 lines total):
- `src/features/applications/components/__tests__/KarmaProfileLinkInput.test.tsx` (313 lines)
- `components/FundingPlatform/FormFields/__tests__/KarmaProfileLinkInput.test.tsx` (495 lines)

Both use `vi.useFakeTimers()` correctly for debounce testing, so they are not flaky.
However, the duplication should be resolved.

## Category 5: Mock boundary violations

76+ test files directly mock `@/utilities/fetchData` or `@/utilities/indexer`.
This is tracked by `scripts/check-mock-boundaries.sh` and will be addressed
incrementally by migrating to service-layer mocks or MSW.
